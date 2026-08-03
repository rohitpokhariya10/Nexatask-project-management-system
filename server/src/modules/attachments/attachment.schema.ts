import { z } from 'zod';
import { objectIdSchema } from '../../shared/objectId.js';

export const taskAttachmentParamsSchema = z.object({ taskId: objectIdSchema });
export const attachmentIdParamsSchema = z.object({ attachmentId: objectIdSchema });
