import { z } from 'zod';

export const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sortDirection(order: 'asc' | 'desc'): 1 | -1 {
  return order === 'asc' ? 1 : -1;
}
