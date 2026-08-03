import { z } from 'zod';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields } from '../../shared/query.js';

export const taskCommentParamsSchema = z.object({ taskId: objectIdSchema });
export const commentIdParamsSchema = z.object({ commentId: objectIdSchema });
export const commentBodySchema = z.object({
  body: z.string().trim().min(1, 'Comment body cannot be empty.').max(3000),
});
export const commentListQuerySchema = z.object({ ...paginationFields });
