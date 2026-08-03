import { Schema, model, type InferSchemaType } from 'mongoose';
import { safeJsonTransform } from '../../shared/modelOptions.js';

const commentSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
  },
  {
    timestamps: true,
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

commentSchema.index({ taskId: 1, createdAt: 1 });

export type Comment = InferSchemaType<typeof commentSchema>;
export const CommentModel = model<Comment>('Comment', commentSchema);
