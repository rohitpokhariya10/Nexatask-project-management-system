import { Schema, model, type InferSchemaType } from 'mongoose';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../shared/constants.js';
import { safeJsonTransform } from '../../shared/modelOptions.js';

const taskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', trim: true, maxlength: 5000 },
    status: { type: String, enum: TASK_STATUSES, default: 'TODO', index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'MEDIUM', index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, required: true, index: true },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, dueDate: 1 });
taskSchema.index({ title: 1 });

export type Task = InferSchemaType<typeof taskSchema>;
export const TaskModel = model<Task>('Task', taskSchema);
