import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import {
  deleteAttachment,
  downloadAttachment,
  ensureAttachmentTaskAccess,
  listAttachments,
  uploadAttachment,
} from './attachment.controller.js';
import { attachmentIdParamsSchema, taskAttachmentParamsSchema } from './attachment.schema.js';
import { attachmentUpload } from './storage.service.js';

export const taskAttachmentRouter = Router({ mergeParams: true });
taskAttachmentRouter.use(authenticate);
taskAttachmentRouter.post(
  '/',
  validate({ params: taskAttachmentParamsSchema }),
  asyncHandler(ensureAttachmentTaskAccess),
  attachmentUpload.single('file'),
  asyncHandler(uploadAttachment),
);
taskAttachmentRouter.get(
  '/',
  validate({ params: taskAttachmentParamsSchema }),
  asyncHandler(listAttachments),
);

export const attachmentRouter = Router();
attachmentRouter.use(authenticate);
attachmentRouter.get(
  '/:attachmentId/download',
  validate({ params: attachmentIdParamsSchema }),
  asyncHandler(downloadAttachment),
);
attachmentRouter.delete(
  '/:attachmentId',
  validate({ params: attachmentIdParamsSchema }),
  asyncHandler(deleteAttachment),
);
