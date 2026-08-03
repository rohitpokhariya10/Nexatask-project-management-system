import { z } from 'zod';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields } from '../../shared/query.js';

const dateSchema = z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date.' }) });

export const auditListQuerySchema = z.object({
  ...paginationFields,
  actorId: objectIdSchema.optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(80).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
});
