import type { Request, Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { pagination, sendSuccess } from '../../shared/apiResponse.js';
import type { AuditAction, AuditEntityType } from './audit.constants.js';
import { AuditLogModel, type AuditLog } from './auditLog.model.js';

interface AuditQuery {
  page: number;
  limit: number;
  actorId?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  dateFrom?: Date;
  dateTo?: Date;
}

export async function listAuditLogs(request: Request, response: Response): Promise<void> {
  const query = request.query as unknown as AuditQuery;
  const filter: FilterQuery<AuditLog> = {};
  if (query.actorId) filter.actorId = query.actorId;
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {
      ...(query.dateFrom ? { $gte: query.dateFrom } : {}),
      ...(query.dateTo ? { $lte: query.dateTo } : {}),
    };
  }
  const [logs, totalItems] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    AuditLogModel.countDocuments(filter),
  ]);
  sendSuccess(response, logs, { pagination: pagination(query.page, query.limit, totalItems) });
}
