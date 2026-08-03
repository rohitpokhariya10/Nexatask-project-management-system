import type { Request, Response } from 'express';
import type { FilterQuery, Types } from 'mongoose';
import { pagination, sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import {
  projectVisibility,
  requireManagedProject,
  requireProjectAccess,
} from '../../shared/access.js';
import { escapeRegex, sortDirection } from '../../shared/query.js';
import type { ProjectStatus } from '../../shared/constants.js';
import { recordAudit } from '../audit/audit.service.js';
import { AttachmentModel } from '../attachments/attachment.model.js';
import { deleteStoredFile } from '../attachments/storage.service.js';
import { CommentModel } from '../comments/comment.model.js';
import { TaskModel } from '../tasks/task.model.js';
import { UserModel, type User } from '../users/user.model.js';
import { ProjectModel, type Project } from './project.model.js';

interface ProjectListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: ProjectStatus;
  managerId?: string;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  sortBy: 'name' | 'status' | 'startDate' | 'deadline' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

interface ProjectInput {
  name: string;
  description: string;
  status: ProjectStatus;
  managerId: string;
  memberIds: string[];
  startDate: Date;
  deadline: Date;
}

async function validateManager(managerId: string) {
  const manager = await UserModel.findOne({
    _id: managerId,
    isActive: true,
    role: { $in: ['ADMIN', 'PROJECT_MANAGER'] },
  });
  if (!manager) throw new AppError('Select an active Project Manager.', 400);
  return manager;
}

async function validateTeamMembers(memberIds: string[]): Promise<Types.ObjectId[]> {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length !== memberIds.length)
    throw new AppError('Duplicate project members are not allowed.', 400);
  if (uniqueIds.length === 0) return [];
  const members = await UserModel.find({
    _id: { $in: uniqueIds },
    isActive: true,
    role: 'TEAM_MEMBER',
  });
  if (members.length !== uniqueIds.length)
    throw new AppError('All project members must be active Team Members.', 400);
  return members.map((member) => member._id);
}

function userSummary(user: {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  isActive: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    isActive: user.isActive,
  };
}

async function projectWithPeople(project: {
  toJSON(): unknown;
  managerId: Types.ObjectId;
  memberIds: Types.ObjectId[];
}) {
  const [manager, members] = await Promise.all([
    UserModel.findById(project.managerId).lean(),
    UserModel.find({ _id: { $in: project.memberIds } }).lean(),
  ]);
  const raw = project.toJSON() as Record<string, unknown>;
  const memberOrder = new Map(project.memberIds.map((id, index) => [String(id), index]));
  members.sort(
    (left, right) =>
      (memberOrder.get(String(left._id)) ?? 0) - (memberOrder.get(String(right._id)) ?? 0),
  );
  return {
    ...raw,
    managerId: String(project.managerId),
    memberIds: project.memberIds.map(String),
    manager: manager ? userSummary(manager) : null,
    members: members.map(userSummary),
  };
}

export async function createProject(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const input = request.body as ProjectInput;
  const [manager, members] = await Promise.all([
    validateManager(input.managerId),
    validateTeamMembers(input.memberIds),
  ]);
  const memberIds = [...members, manager._id].filter(
    (value, index, values) => values.findIndex((item) => String(item) === String(value)) === index,
  );
  const project = await ProjectModel.create({
    ...input,
    managerId: manager._id,
    memberIds,
    createdBy: request.user.objectId,
  });
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_CREATED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Project “${project.name}” created.`,
    metadata: {
      changedFields: [
        'name',
        'description',
        'status',
        'managerId',
        'memberIds',
        'startDate',
        'deadline',
      ],
    },
    request,
  });
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_MANAGER_ASSIGNED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Project Manager assigned to “${project.name}”.`,
    metadata: {
      previousManagerId: null,
      managerId: String(manager._id),
      source: 'project-creation',
    },
    request,
  });
  if (members.length > 0) {
    await recordAudit({
      actorId: request.user.objectId,
      action: 'PROJECT_MEMBERS_ADDED',
      entityType: 'Project',
      entityId: project._id,
      summary: `${members.length} member${members.length === 1 ? '' : 's'} added to “${project.name}”.`,
      metadata: {
        memberIds: members.map(String),
        source: 'project-creation',
      },
      request,
    });
  }
  sendSuccess(
    response,
    { project: await projectWithPeople(project) },
    { statusCode: 201, message: 'Project created.' },
  );
}

export async function listProjects(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const query = request.query as unknown as ProjectListQuery;
  const filter: FilterQuery<Project> = { ...projectVisibility(request.user) };
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$and = [{ $or: [{ name: search }, { description: search }] }];
  }
  if (query.status) filter.status = query.status;
  if (query.managerId) {
    if (request.user.role === 'ADMIN') filter.managerId = query.managerId;
    else filter.$and = [...(filter.$and ?? []), { managerId: query.managerId }];
  }
  if (query.deadlineFrom || query.deadlineTo) {
    filter.deadline = {
      ...(query.deadlineFrom ? { $gte: query.deadlineFrom } : {}),
      ...(query.deadlineTo ? { $lte: query.deadlineTo } : {}),
    };
  }
  const [projects, totalItems] = await Promise.all([
    ProjectModel.find(filter)
      .sort({ [query.sortBy]: sortDirection(query.sortOrder), _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    ProjectModel.countDocuments(filter),
  ]);
  sendSuccess(response, projects, { pagination: pagination(query.page, query.limit, totalItems) });
}

export async function getProject(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireProjectAccess(request.params.projectId as string, request.user);
  sendSuccess(response, { project: await projectWithPeople(project) });
}

export async function updateProject(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireManagedProject(request.params.projectId as string, request.user);
  const changes = request.body as Partial<
    Pick<ProjectInput, 'name' | 'description' | 'status' | 'startDate' | 'deadline'>
  >;
  const nextStartDate = changes.startDate ?? project.startDate;
  const nextDeadline = changes.deadline ?? project.deadline;
  if (nextDeadline < nextStartDate)
    throw new AppError('Project deadline must be on or after the start date.', 400);
  const changedFields = Object.keys(changes);
  project.set(changes);
  await project.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_UPDATED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Project “${project.name}” updated.`,
    metadata: { changedFields },
    request,
  });
  sendSuccess(
    response,
    { project: await projectWithPeople(project) },
    { message: 'Project updated.' },
  );
}

export async function deleteProject(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await ProjectModel.findById(request.params.projectId);
  if (!project) throw new AppError('Project not found.', 404);
  const tasks = await TaskModel.find({ projectId: project._id }).select('_id').lean();
  const taskIds = tasks.map((task) => task._id);
  const attachments = await AttachmentModel.find({ taskId: { $in: taskIds } })
    .select('storedName')
    .lean();
  const fileResults = await Promise.allSettled(
    attachments.map((attachment) => deleteStoredFile(attachment.storedName)),
  );
  if (fileResults.some((result) => result.status === 'rejected')) {
    throw new AppError('Project attachments could not be removed safely.', 500);
  }
  await Promise.all([
    CommentModel.deleteMany({ taskId: { $in: taskIds } }),
    AttachmentModel.deleteMany({ taskId: { $in: taskIds } }),
    TaskModel.deleteMany({ _id: { $in: taskIds } }),
    ProjectModel.deleteOne({ _id: project._id }),
  ]);
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_DELETED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Project “${project.name}” deleted.`,
    request,
  });
  sendSuccess(response, null, { message: 'Project deleted.' });
}

export async function assignManager(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await ProjectModel.findById(request.params.projectId);
  if (!project) throw new AppError('Project not found.', 404);
  const manager = await validateManager((request.body as { managerId: string }).managerId);
  if (String(project.managerId) === String(manager._id)) {
    sendSuccess(
      response,
      { project: await projectWithPeople(project) },
      { message: 'Project Manager is unchanged.' },
    );
    return;
  }
  const previousManagerId = project.managerId;
  project.managerId = manager._id;
  project.memberIds = project.memberIds
    .filter((id) => String(id) !== String(previousManagerId))
    .concat(manager._id)
    .filter(
      (id, index, values) => values.findIndex((value) => String(value) === String(id)) === index,
    );
  await project.save();
  await TaskModel.updateMany(
    { projectId: project._id, assigneeId: previousManagerId },
    { $set: { assigneeId: null } },
  );
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_MANAGER_ASSIGNED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Project Manager assigned to “${project.name}”.`,
    metadata: {
      changedFields: ['managerId'],
      previousManagerId: String(previousManagerId),
      managerId: String(manager._id),
    },
    request,
  });
  sendSuccess(
    response,
    { project: await projectWithPeople(project) },
    { message: 'Project Manager assigned.' },
  );
}

export async function addMembers(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireManagedProject(request.params.projectId as string, request.user);
  const body = request.body as { userId?: string; userIds?: string[] };
  const requestedIds = body.userIds ?? (body.userId ? [body.userId] : []);
  const memberIds = await validateTeamMembers(requestedIds);
  const existing = new Set(project.memberIds.map(String));
  const added = memberIds.filter((id) => !existing.has(String(id)));
  if (added.length === 0) {
    sendSuccess(
      response,
      { project: await projectWithPeople(project) },
      { message: 'Project members are unchanged.' },
    );
    return;
  }
  project.memberIds.push(...added);
  await project.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_MEMBERS_ADDED',
    entityType: 'Project',
    entityId: project._id,
    summary: `${added.length} member${added.length === 1 ? '' : 's'} added to “${project.name}”.`,
    metadata: { memberIds: added.map(String) },
    request,
  });
  sendSuccess(
    response,
    { project: await projectWithPeople(project) },
    { message: 'Project members updated.' },
  );
}

export async function removeMember(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireManagedProject(request.params.projectId as string, request.user);
  if (String(project.managerId) === request.params.userId)
    throw new AppError('The Project Manager cannot be removed as a member.', 409);
  const originalLength = project.memberIds.length;
  project.memberIds = project.memberIds.filter((id) => String(id) !== request.params.userId);
  if (project.memberIds.length === originalLength)
    throw new AppError('Project member not found.', 404);
  await project.save();
  const unassigned = await TaskModel.updateMany(
    { projectId: project._id, assigneeId: request.params.userId },
    { $set: { assigneeId: null } },
  );
  await recordAudit({
    actorId: request.user.objectId,
    action: 'PROJECT_MEMBER_REMOVED',
    entityType: 'Project',
    entityId: project._id,
    summary: `Member removed from “${project.name}”.`,
    metadata: { memberId: request.params.userId, unassignedTaskCount: unassigned.modifiedCount },
    request,
  });
  sendSuccess(
    response,
    { project: await projectWithPeople(project) },
    { message: 'Project member removed.' },
  );
}

export async function listEligibleMembers(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireManagedProject(request.params.projectId as string, request.user);
  const query = request.query as unknown as { page: number; limit: number; search?: string };
  const filter: FilterQuery<User> = {
    _id: { $nin: project.memberIds },
    role: 'TEAM_MEMBER',
    isActive: true,
  };
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: search }, { email: search }];
  }
  const [members, totalItems] = await Promise.all([
    UserModel.find(filter)
      .sort({ name: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    UserModel.countDocuments(filter),
  ]);
  sendSuccess(response, members, { pagination: pagination(query.page, query.limit, totalItems) });
}
