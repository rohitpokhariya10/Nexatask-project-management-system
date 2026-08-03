import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import { addComment, deleteComment, listComments, updateComment } from './comment.controller.js';
import {
  commentBodySchema,
  commentIdParamsSchema,
  commentListQuerySchema,
  taskCommentParamsSchema,
} from './comment.schema.js';

export const taskCommentRouter = Router({ mergeParams: true });
taskCommentRouter.use(authenticate);
taskCommentRouter.post(
  '/',
  validate({ params: taskCommentParamsSchema, body: commentBodySchema }),
  asyncHandler(addComment),
);
taskCommentRouter.get(
  '/',
  validate({ params: taskCommentParamsSchema, query: commentListQuerySchema }),
  asyncHandler(listComments),
);

export const commentRouter = Router();
commentRouter.use(authenticate);
commentRouter.patch(
  '/:commentId',
  validate({ params: commentIdParamsSchema, body: commentBodySchema }),
  asyncHandler(updateComment),
);
commentRouter.delete(
  '/:commentId',
  validate({ params: commentIdParamsSchema }),
  asyncHandler(deleteComment),
);
