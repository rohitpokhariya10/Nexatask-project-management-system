import type { FilterQuery } from 'mongoose';
import type { Request, Response } from 'express';
import { ProjectModel } from '../projects/project.model.js';
import { recordAudit } from '../audit/audit.service.js';
import { pagination, sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import { escapeRegex, sortDirection } from '../../shared/query.js';
import { UserModel, type User } from './user.model.js';
import type { UserRole } from '../../shared/constants.js';

interface UserListQuery {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy: 'name' | 'email' | 'role' | 'isActive' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export async function listUsers(request: Request, response: Response): Promise<void> {
  const query = request.query as unknown as UserListQuery;
  const filter: FilterQuery<User> = {};
  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: search }, { email: search }];
  }
  if (query.role) filter.role = query.role;
  if (query.isActive !== undefined) filter.isActive = query.isActive;

  const [users, totalItems] = await Promise.all([
    UserModel.find(filter)
      .sort({ [query.sortBy]: sortDirection(query.sortOrder), _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    UserModel.countDocuments(filter),
  ]);
  sendSuccess(response, users, { pagination: pagination(query.page, query.limit, totalItems) });
}

export async function getUser(request: Request, response: Response): Promise<void> {
  const user = await UserModel.findById(request.params.userId);
  if (!user) throw new AppError('User not found.', 404);
  sendSuccess(response, { user });
}

export async function updateUserRole(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const target = await UserModel.findById(request.params.userId);
  if (!target) throw new AppError('User not found.', 404);
  const nextRole = (request.body as { role: UserRole }).role;
  if (target.role === nextRole) {
    sendSuccess(response, { user: target }, { message: 'User role is unchanged.' });
    return;
  }
  if (target.role === 'PROJECT_MANAGER' && nextRole === 'TEAM_MEMBER') {
    const managesProject = await ProjectModel.exists({ managerId: target._id });
    if (managesProject)
      throw new AppError('Reassign this user’s managed projects before changing their role.', 409);
  }
  const previousRole = target.role;
  target.role = nextRole;
  await target.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: 'USER_ROLE_CHANGED',
    entityType: 'User',
    entityId: target._id,
    summary: `User role changed from ${previousRole} to ${nextRole}.`,
    metadata: { changedFields: ['role'], previousRole, nextRole },
    request,
  });
  sendSuccess(response, { user: target }, { message: 'User role updated.' });
}

export async function updateUserStatus(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const body = request.body as { isActive: boolean; confirmSelfDeactivation?: boolean };
  if (
    request.params.userId === request.user.id &&
    !body.isActive &&
    body.confirmSelfDeactivation !== true
  ) {
    throw new AppError('Confirm self-deactivation explicitly.', 400, [
      { path: 'confirmSelfDeactivation', message: 'Set confirmSelfDeactivation to true.' },
    ]);
  }
  const target = await UserModel.findById(request.params.userId);
  if (!target) throw new AppError('User not found.', 404);
  if (!body.isActive && (target.role === 'PROJECT_MANAGER' || target.role === 'ADMIN')) {
    const managesProject = await ProjectModel.exists({ managerId: target._id });
    if (managesProject)
      throw new AppError('Reassign this user’s managed projects before deactivating them.', 409);
  }
  target.isActive = body.isActive;
  await target.save();
  await recordAudit({
    actorId: request.user.objectId,
    action: body.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: target._id,
    summary: body.isActive ? 'User account activated.' : 'User account deactivated.',
    metadata: { changedFields: ['isActive'], isActive: body.isActive },
    request,
  });
  sendSuccess(
    response,
    { user: target },
    { message: `User ${body.isActive ? 'activated' : 'deactivated'}.` },
  );
}
