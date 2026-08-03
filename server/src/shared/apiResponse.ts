import type { Response } from 'express';

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function pagination(page: number, limit: number, totalItems: number): Pagination {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function sendSuccess<T>(
  response: Response,
  data: T,
  options: { statusCode?: number; message?: string; pagination?: Pagination } = {},
): void {
  const payload: Record<string, unknown> = { success: true };
  if (options.message) payload.message = options.message;
  payload.data = data;
  if (options.pagination) payload.pagination = options.pagination;
  response.status(options.statusCode ?? 200).json(payload);
}
