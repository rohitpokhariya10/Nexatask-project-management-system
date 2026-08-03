import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { PROJECT_STATUSES } from '../../shared/constants.js';
import { safeJsonTransform } from '../../shared/modelOptions.js';

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 3000 },
    status: { type: String, enum: PROJECT_STATUSES, default: 'PLANNING', index: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    memberIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      validate: {
        validator: (members: Types.ObjectId[]) =>
          new Set(members.map((member) => member.toHexString())).size === members.length,
        message: 'Duplicate project members are not allowed.',
      },
    },
    startDate: { type: Date, required: true },
    deadline: { type: Date, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

projectSchema.pre('validate', function validateDates(next) {
  const project = this as {
    startDate?: Date;
    deadline?: Date;
    invalidate(path: string, message: string): void;
  };
  if (project.startDate && project.deadline && project.deadline < project.startDate) {
    project.invalidate('deadline', 'Project deadline must be on or after the start date.');
  }
  next();
});

projectSchema.index({ memberIds: 1 });
projectSchema.index({ name: 1 });

export type Project = InferSchemaType<typeof projectSchema>;
export const ProjectModel = model<Project>('Project', projectSchema);
