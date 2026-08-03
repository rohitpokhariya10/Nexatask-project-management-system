import { Schema, model, type InferSchemaType } from 'mongoose';
import { USER_ROLES } from '../../shared/constants.js';
import { safeJsonTransform } from '../../shared/modelOptions.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, default: 'TEAM_MEMBER', index: true },
    avatarUrl: { type: String, trim: true, maxlength: 2048 },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model<User>('User', userSchema);
