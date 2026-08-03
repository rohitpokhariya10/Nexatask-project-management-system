import { z } from 'zod';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields } from '../../shared/query.js';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from './audit.constants.js';

const dateSchema = z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date.' }) });

export const auditListQuerySchema = z
  .object({
    ...paginationFields,
    actorId: objectIdSchema.optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
    path: ['dateTo'],
    message: 'dateTo must be on or after dateFrom.',
  });
