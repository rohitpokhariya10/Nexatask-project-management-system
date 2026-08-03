import type { Request } from 'express';
import type { Types } from 'mongoose';
import { AuditLogModel } from './auditLog.model.js';

interface AuditInput {
  actorId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId: Types.ObjectId;
  summary: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}

const BLOCKED_METADATA_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'authorization',
  'jwt',
  'secret',
]);

function sanitizeMetadata(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !BLOCKED_METADATA_KEYS.has(key))
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 500) : value]),
  );
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const forwardedFor = input.request?.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0];
  const ipAddress = forwardedIp?.trim() || input.request?.ip;

  await AuditLogModel.create({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    metadata: sanitizeMetadata(input.metadata ?? {}),
    ...(ipAddress ? { ipAddress } : {}),
  });
}
