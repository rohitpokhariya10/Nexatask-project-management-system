import type { Request, Response } from 'express';
import { pagination, sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import { requireTaskAccess } from '../../shared/access.js';
import { CommentModel } from './comment.model.js';
import { TaskModel } from '../tasks/task.model.js';

export async function addComment(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  await requireTaskAccess(request.params.taskId as string, request.user);
  const comment = await CommentModel.create({
    taskId: request.params.taskId,
    authorId: request.user.objectId,
    body: (request.body as { body: string }).body,
  });
  sendSuccess(response, { comment }, { statusCode: 201, message: 'Comment added.' });
}

export async function listComments(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  await requireTaskAccess(request.params.taskId as string, request.user);
  const { page, limit } = request.query as unknown as { page: number; limit: number };
  const [comments, totalItems] = await Promise.all([
    CommentModel.find({ taskId: request.params.taskId })
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    CommentModel.countDocuments({ taskId: request.params.taskId }),
  ]);
  sendSuccess(response, comments, { pagination: pagination(page, limit, totalItems) });
}

export async function updateComment(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const comment = await CommentModel.findById(request.params.commentId);
  if (!comment) throw new AppError('Comment not found.', 404);
  await requireTaskAccess(String(comment.taskId), request.user);
  if (String(comment.authorId) !== request.user.id) {
    throw new AppError('You may only edit your own comments.', 403);
  }
  comment.body = (request.body as { body: string }).body;
  await comment.save();
  sendSuccess(response, { comment }, { message: 'Comment updated.' });
}

export async function deleteComment(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const comment = await CommentModel.findById(request.params.commentId);
  if (!comment) throw new AppError('Comment not found.', 404);
  const task = await TaskModel.findById(comment.taskId);
  if (!task) throw new AppError('Task not found.', 404);
  const { project } = await requireTaskAccess(String(task._id), request.user);
  const isAuthor = String(comment.authorId) === request.user.id;
  const canModerate =
    request.user.role === 'ADMIN' ||
    (request.user.role === 'PROJECT_MANAGER' && String(project.managerId) === request.user.id);
  if (!isAuthor && !canModerate)
    throw new AppError('You do not have permission to delete this comment.', 403);
  await comment.deleteOne();
  sendSuccess(response, null, { message: 'Comment deleted.' });
}
