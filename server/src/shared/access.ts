import type { FilterQuery, HydratedDocument } from 'mongoose';
import { ProjectModel, type Project } from '../modules/projects/project.model.js';
import { TaskModel, type Task } from '../modules/tasks/task.model.js';
import { AppError } from './appError.js';

export type AuthenticatedUser = NonNullable<Express.Request['user']>;

export function projectVisibility(user: AuthenticatedUser): FilterQuery<Project> {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PROJECT_MANAGER') return { managerId: user.objectId };
  return { memberIds: user.objectId };
}

export async function requireProjectAccess(
  projectId: string,
  user: AuthenticatedUser,
): Promise<HydratedDocument<Project>> {
  const project = await ProjectModel.findOne({ _id: projectId, ...projectVisibility(user) });
  if (!project) throw new AppError('Project not found or not accessible.', 404);
  return project;
}

export async function requireManagedProject(
  projectId: string,
  user: AuthenticatedUser,
): Promise<HydratedDocument<Project>> {
  const project = await ProjectModel.findById(projectId);
  if (!project) throw new AppError('Project not found.', 404);
  if (user.role !== 'ADMIN' && String(project.managerId) !== user.id) {
    throw new AppError('You do not have permission to manage this project.', 403);
  }
  return project;
}

export async function requireTaskAccess(
  taskId: string,
  user: AuthenticatedUser,
): Promise<{ task: HydratedDocument<Task>; project: HydratedDocument<Project> }> {
  const task = await TaskModel.findById(taskId);
  if (!task) throw new AppError('Task not found.', 404);
  const project = await requireProjectAccess(String(task.projectId), user);
  return { task, project };
}
