import { Schema, model, type InferSchemaType } from 'mongoose';
import { safeJsonTransform } from '../../shared/modelOptions.js';

const attachmentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true, maxlength: 255 },
    storedName: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true, maxlength: 150 },
    size: { type: Number, required: true, min: 0 },
    relativeUrl: { type: String, required: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

export type Attachment = InferSchemaType<typeof attachmentSchema>;
export const AttachmentModel = model<Attachment>('Attachment', attachmentSchema);
