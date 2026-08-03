import fs from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../shared/apiResponse.js';
import { AppError } from '../../shared/appError.js';
import { requireTaskAccess } from '../../shared/access.js';
import { recordAudit } from '../audit/audit.service.js';
import { AttachmentModel } from './attachment.model.js';
import { deleteStoredFile, safeOriginalName, storedFilePath } from './storage.service.js';

export async function ensureAttachmentTaskAccess(
  request: Request,
  _response: Response,
  next: NextFunction,
): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  await requireTaskAccess(request.params.taskId as string, request.user);
  next();
}

export async function uploadAttachment(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  if (!request.file)
    throw new AppError('Select a file to upload.', 400, [
      { path: 'file', message: 'A file is required.' },
    ]);
  try {
    const attachment = new AttachmentModel({
      taskId: request.params.taskId,
      uploadedBy: request.user.objectId,
      originalName: safeOriginalName(request.file.originalname),
      storedName: request.file.filename,
      mimeType: request.file.mimetype,
      size: request.file.size,
      relativeUrl: '/pending',
    });
    attachment.relativeUrl = `/api/attachments/${String(attachment._id)}/download`;
    await attachment.save();
    await recordAudit({
      actorId: request.user.objectId,
      action: 'ATTACHMENT_UPLOADED',
      entityType: 'Attachment',
      entityId: attachment._id,
      summary: `Attachment “${attachment.originalName}” uploaded.`,
      metadata: {
        taskId: request.params.taskId,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
      request,
    });
    sendSuccess(response, { attachment }, { statusCode: 201, message: 'Attachment uploaded.' });
  } catch (error) {
    await deleteStoredFile(request.file.filename);
    throw error;
  }
}

export async function listAttachments(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  await requireTaskAccess(request.params.taskId as string, request.user);
  const attachments = await AttachmentModel.find({ taskId: request.params.taskId }).sort({
    createdAt: -1,
  });
  sendSuccess(response, attachments);
}

async function accessibleAttachment(request: Request) {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const attachment = await AttachmentModel.findById(request.params.attachmentId);
  if (!attachment) throw new AppError('Attachment not found.', 404);
  const access = await requireTaskAccess(String(attachment.taskId), request.user);
  return { attachment, ...access };
}

export async function downloadAttachment(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const { attachment } = await accessibleAttachment(request);
  const filePath = storedFilePath(attachment.storedName);
  try {
    await fs.access(filePath);
  } catch {
    throw new AppError('The attachment file is no longer available.', 404);
  }
  response.download(filePath, attachment.originalName, (error) => {
    if (error && !response.headersSent)
      next(new AppError('The attachment could not be downloaded.', 500));
  });
}

export async function deleteAttachment(request: Request, response: Response): Promise<void> {
  if (!request.user) throw new AppError('Authentication is required.', 401);
  const { attachment, project } = await accessibleAttachment(request);
  const isOwner = String(attachment.uploadedBy) === request.user.id;
  const canManage =
    request.user.role === 'ADMIN' ||
    (request.user.role === 'PROJECT_MANAGER' && String(project.managerId) === request.user.id);
  if (!isOwner && !canManage)
    throw new AppError('You do not have permission to delete this attachment.', 403);
  await attachment.deleteOne();
  await deleteStoredFile(attachment.storedName);
  await recordAudit({
    actorId: request.user.objectId,
    action: 'ATTACHMENT_DELETED',
    entityType: 'Attachment',
    entityId: attachment._id,
    summary: `Attachment “${attachment.originalName}” deleted.`,
    metadata: { taskId: String(attachment.taskId) },
    request,
  });
  sendSuccess(response, null, { message: 'Attachment deleted.' });
}
