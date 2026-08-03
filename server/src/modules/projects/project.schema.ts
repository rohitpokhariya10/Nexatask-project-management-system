import { z } from 'zod';
import { PROJECT_STATUSES } from '../../shared/constants.js';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields, sortOrderSchema } from '../../shared/query.js';

const dateSchema = z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date.' }) });

export const projectIdParamsSchema = z.object({ projectId: objectIdSchema });

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(150),
    description: z.string().trim().max(3000).default(''),
    status: z.enum(PROJECT_STATUSES).default('PLANNING'),
    managerId: objectIdSchema,
    memberIds: z.array(objectIdSchema).max(100).default([]),
    startDate: dateSchema,
    deadline: dateSchema,
  })
  .refine((value) => value.deadline >= value.startDate, {
    path: ['deadline'],
    message: 'Project deadline must be on or after the start date.',
  });

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(150).optional(),
    description: z.string().trim().max(3000).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: dateSchema.optional(),
    deadline: dateSchema.optional(),
  })
  .refine((value) => !value.startDate || !value.deadline || value.deadline >= value.startDate, {
    path: ['deadline'],
    message: 'Project deadline must be on or after the start date.',
  });

export const assignManagerSchema = z.object({ managerId: objectIdSchema });

export const addMembersSchema = z
  .object({
    userId: objectIdSchema.optional(),
    userIds: z.array(objectIdSchema).min(1).max(100).optional(),
  })
  .refine((value) => Boolean(value.userId || value.userIds?.length), {
    message: 'Provide userId or userIds.',
  });

export const memberParamsSchema = z.object({
  projectId: objectIdSchema,
  userId: objectIdSchema,
});

export const projectListQuerySchema = z.object({
  ...paginationFields,
  search: z.string().trim().max(150).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  managerId: objectIdSchema.optional(),
  deadlineFrom: dateSchema.optional(),
  deadlineTo: dateSchema.optional(),
  sortBy: z
    .enum(['name', 'status', 'startDate', 'deadline', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const eligibleMemberQuerySchema = z.object({
  ...paginationFields,
  search: z.string().trim().max(100).optional(),
});
