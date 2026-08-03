import { Schema, model, type InferSchemaType } from 'mongoose';
import { safeJsonTransform } from '../../shared/modelOptions.js';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './audit.constants.js';

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, maxlength: 100 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { transform: safeJsonTransform },
    toObject: { transform: safeJsonTransform },
  },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export type AuditLog = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model<AuditLog>('AuditLog', auditLogSchema);
