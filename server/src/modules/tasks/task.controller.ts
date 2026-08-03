import type { Request, Response } from 'express';
import { Types, type FilterQuery } from 'mongoose';
import { pagination, sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import {
  projectVisibility,
  requireManagedProject,
  requireProjectAccess,
  requireTaskAccess,
} from '../../shared/access.js';
import { escapeRegex, sortDirection } from '../../shared/query.js';
import type { TaskPriority, TaskStatus } from '../../shared/constants.js';
import { recordAudit } from '../audit/audit.service.js';
import { AttachmentModel } from '../attachments/attachment.model.js';
import { deleteStoredFile } from '../attachments/storage.service.js';
import { CommentModel } from '../comments/comment.model.js';
import { ProjectModel } from '../projects/project.model.js';
import { UserModel } from '../users/user.model.js';
import { TaskModel, type Task } from './task.model.js';

interface TaskListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueFrom?: Date;
  dueTo?: Date;
  sortBy: 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
}

interface TaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate: Date;
}

const STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'COMPLETED'],
  COMPLETED: ['IN_PROGRESS'],
};

async function validateAssignee(
  assigneeId: string,
  memberIds: { toString(): string }[],
): Promise<void> {
  if (!memberIds.some((memberId) => String(memberId) === assigneeId)) {
    throw new AppError('Select a Team Member who belongs to this project.', 400);
  }
  const activeUser = await UserModel.exists({ _id: assigneeId, isActive: true });
  if (!activeUser) throw new AppError('The task assignee must be an active project member.', 400);
}

function applyListFilters(filter: FilterQuery<Task>, query: TaskListQuery): void {
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$and = [{ $or: [{ title: search }, { description: search }] }];
  }
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.assigneeId && filter.assigneeId === undefined) filter.assigneeId = query.assigneeId;
  if (query.dueFrom || query.dueTo) {
    filter.dueDate = {
      ...(query.dueFrom ? { $gte: query.dueFrom } : {}),
      ...(query.dueTo ? { $lte: query.dueTo } : {}),
    };
  }
}

async function sendTaskList(
  response: Response,
  filter: FilterQuery<Task>,
  query: TaskListQuery,
): Promise<void> {
  applyListFilters(filter, query);
  const [tasks, totalItems] = await Promise.all([
    TaskModel.find(filter)
      .sort({ [query.sortBy]: sortDirection(query.sortOrder), _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    TaskModel.countDocuments(filter),
  ]);
  sendSuccess(response, tasks, { pagination: pagination(query.page, query.limit, totalItems) });
}

export async function createTask(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireManagedProject(request.params.projectId as string, request.user);
  const input = request.body as TaskInput;
  if (input.assigneeId) await validateAssignee(input.assigneeId, project.memberIds);
  const task = await TaskModel.create({
    ...input,
    projectId: project._id,
    assigneeId: input.assigneeId ?? null,
    createdBy: request.user.objectId,
    status: 'TODO',
  });
  await recordAudit({
    actorId: request.user.objectId,
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: task._id,
    summary: `Task “${task.title}” created.`,
    metadata: { projectId: String(project._id), assigneeId: input.assigneeId ?? null },
    request,
  });
  sendSuccess(response, { task }, { statusCode: 201, message: 'Task created.' });
}

export async function listProjectTasks(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const project = await requireProjectAccess(request.params.projectId as string, request.user);
  await sendTaskList(
    response,
    { projectId: project._id },
    request.query as unknown as TaskListQuery,
  );
}

export async function listMyTasks(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const visibleProjects = await ProjectModel.find(projectVisibility(request.user))
    .select('_id')
    .lean();
  await sendTaskList(
    response,
    {
      assigneeId: request.user.objectId,
      projectId: { $in: visibleProjects.map((project) => project._id) },
    },
    request.query as unknown as TaskListQuery,
  );
}

export async function getTask(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const { task } = await requireTaskAccess(request.params.taskId as string, request.user);
  sendSuccess(response, { task });
}

export async function updateTask(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const task = await TaskModel.findById(request.params.taskId);
  if (!task) throw new AppError('Task not found.', 404);
  await requireManagedProject(String(task.projectId), request.user);
  const changes = request.body as Partial<
    Pick<TaskInput, 'title' | 'description' | 'priority' | 'dueDate'>
  >;
  task.set(changes);
  await task.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: 'TASK_UPDATED',
    entityType: 'Task',
    entityId: task._id,
    summary: `Task “${task.title}” updated.`,
    metadata: { changedFields: Object.keys(changes) },
    request,
  });
  sendSuccess(response, { task }, { message: 'Task updated.' });
}

export async function deleteTask(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const task = await TaskModel.findById(request.params.taskId);
  if (!task) throw new AppError('Task not found.', 404);
  await requireManagedProject(String(task.projectId), request.user);
  const attachments = await AttachmentModel.find({ taskId: task._id }).select('storedName').lean();
  const fileResults = await Promise.allSettled(
    attachments.map((attachment) => deleteStoredFile(attachment.storedName)),
  );
  if (fileResults.some((result) => result.status === 'rejected')) {
    throw new AppError('Task attachments could not be removed safely.', 500);
  }
  await Promise.all([
    CommentModel.deleteMany({ taskId: task._id }),
    AttachmentModel.deleteMany({ taskId: task._id }),
    task.deleteOne(),
  ]);
  await recordAudit({
    actorId: request.user.objectId,
    action: 'TASK_DELETED',
    entityType: 'Task',
    entityId: task._id,
    summary: `Task “${task.title}” deleted.`,
    metadata: { projectId: String(task.projectId) },
    request,
  });
  sendSuccess(response, null, { message: 'Task deleted.' });
}

export async function updateTaskStatus(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const { task } = await requireTaskAccess(request.params.taskId as string, request.user);
  if (request.user.role === 'TEAM_MEMBER' && String(task.assigneeId) !== request.user.id) {
    throw new AppError('Team Members may only update the status of their own assigned tasks.', 403);
  }
  const nextStatus = (request.body as { status: TaskStatus }).status;
  if (nextStatus !== task.status && !STATUS_TRANSITIONS[task.status].includes(nextStatus)) {
    throw new AppError(`Task status cannot change from ${task.status} to ${nextStatus}.`, 400);
  }
  const previousStatus = task.status;
  task.status = nextStatus;
  task.completedAt = nextStatus === 'COMPLETED' ? (task.completedAt ?? new Date()) : null;
  await task.save();
  if (nextStatus !== previousStatus) {
    await recordAudit({
      actorId: request.user.objectId,
      action: 'TASK_STATUS_CHANGED',
      entityType: 'Task',
      entityId: task._id,
      summary: `Task status changed from ${previousStatus} to ${nextStatus}.`,
      metadata: { previousStatus, nextStatus },
      request,
    });
  }
  sendSuccess(response, { task }, { message: 'Task status updated.' });
}

export async function updateTaskAssignee(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const task = await TaskModel.findById(request.params.taskId);
  if (!task) throw new AppError('Task not found.', 404);
  const project = await requireManagedProject(String(task.projectId), request.user);
  const assigneeId = (request.body as { assigneeId: string | null }).assigneeId;
  if (assigneeId) await validateAssignee(assigneeId, project.memberIds);
  const previousAssigneeId = task.assigneeId ? String(task.assigneeId) : null;
  if (previousAssigneeId === assigneeId) {
    sendSuccess(response, { task }, { message: 'Task assignee is unchanged.' });
    return;
  }
  task.assigneeId = assigneeId ? new Types.ObjectId(assigneeId) : null;
  await task.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: previousAssigneeId ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED',
    entityType: 'Task',
    entityId: task._id,
    summary: assigneeId ? `Task “${task.title}” assigned.` : `Task “${task.title}” unassigned.`,
    metadata: { previousAssigneeId, assigneeId },
    request,
  });
  sendSuccess(response, { task }, { message: 'Task assignee updated.' });
}
