import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../shared/constants.js';
import { objectIdSchema } from '../../shared/objectId.js';
import { paginationFields, sortOrderSchema } from '../../shared/query.js';

const dateSchema = z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date.' }) });

export const projectTaskParamsSchema = z.object({ projectId: objectIdSchema });
export const taskIdParamsSchema = z.object({ taskId: objectIdSchema });

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().max(5000).default(''),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  assigneeId: objectIdSchema.nullable().optional(),
  dueDate: dateSchema,
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateSchema.optional(),
});

export const updateTaskStatusSchema = z.object({ status: z.enum(TASK_STATUSES) });
export const updateTaskAssigneeSchema = z.object({ assigneeId: objectIdSchema.nullable() });

export const taskListQuerySchema = z.object({
  ...paginationFields,
  search: z.string().trim().max(200).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: objectIdSchema.optional(),
  dueFrom: dateSchema.optional(),
  dueTo: dateSchema.optional(),
  sortBy: z
    .enum(['title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: sortOrderSchema,
});

export const myTaskListQuerySchema = taskListQuerySchema.omit({ assigneeId: true });
