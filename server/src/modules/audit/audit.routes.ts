import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import { listAuditLogs } from './audit.controller.js';
import { auditListQuerySchema } from './audit.schema.js';

export const auditRouter = Router();
auditRouter.use(authenticate, authorize('ADMIN'));
auditRouter.get('/', validate({ query: auditListQuerySchema }), asyncHandler(listAuditLogs));
