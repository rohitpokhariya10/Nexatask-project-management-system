import { z } from 'zod';
import { USER_ROLES } from '../../shared/constants.js';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields, sortOrderSchema } from '../../shared/query.js';

export const userIdParamsSchema = z.object({ userId: objectIdSchema });

export const userListQuerySchema = z.object({
  ...paginationFields,
  search: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sortBy: z.enum(['name', 'email', 'role', 'isActive', 'createdAt']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const updateRoleSchema = z.object({ role: z.enum(USER_ROLES) });
export const updateStatusSchema = z.object({
  isActive: z.boolean(),
  confirmSelfDeactivation: z.boolean().optional(),
});
