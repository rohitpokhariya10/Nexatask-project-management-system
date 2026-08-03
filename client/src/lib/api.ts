import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiErrorBody, Attachment, Paginated, Pagination } from '../types/api';

const TOKEN_KEY = 'nexatask_access_token';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('nexatask:unauthorized'));
    }
    return Promise.reject(error);
  },
);

interface Envelope<T> {
  success?: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

function isEnvelope<T>(value: unknown): value is Envelope<T> {
  return typeof value === 'object' && value !== null && 'data' in value;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await api.request<Envelope<T> | T>(config);
  return isEnvelope<T>(response.data) ? response.data.data : response.data;
}

export async function requestResource<T>(config: AxiosRequestConfig, key: string): Promise<T> {
  const data = await request<T | Record<string, T>>(config);
  if (typeof data === 'object' && data !== null && key in data) {
    return (data as Record<string, T>)[key] as T;
  }
  return data as T;
}

export async function requestPaginated<T>(config: AxiosRequestConfig): Promise<Paginated<T>> {
  const response = await api.request<Envelope<T[]> | T[]>(config);
  const body = response.data;
  if (isEnvelope<T[]>(body)) {
    const nested: unknown = body.data;
    const items = Array.isArray(nested)
      ? (nested as T[])
      : typeof nested === 'object' &&
          nested !== null &&
          'items' in nested &&
          Array.isArray((nested as { items?: unknown }).items)
        ? (nested as { items: T[] }).items
        : [];
    const embeddedPagination =
      typeof nested === 'object' && nested !== null && 'pagination' in nested
        ? (nested as { pagination?: Pagination }).pagination
        : undefined;
    return {
      items,
      pagination: body.pagination ?? embeddedPagination ?? fallbackPagination(items.length),
    };
  }
  return { items: body, pagination: fallbackPagination(body.length) };
}

function fallbackPagination(totalItems: number): Pagination {
  return {
    page: 1,
    limit: Math.max(totalItems, 1),
    totalItems,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };
}

export function getApiError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return (
      error.response?.data?.message ??
      (error.code === 'ECONNABORTED'
        ? 'The request timed out. Please try again.'
        : error.message) ??
      fallback
    );
  }
  return error instanceof Error ? error.message : fallback;
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function attachmentUrl(relativeUrl: string): string {
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${apiOrigin}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}

export async function downloadAttachmentFile(
  attachment: Pick<Attachment, 'originalName' | 'relativeUrl'>,
): Promise<void> {
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');
  const response = await api.get<Blob>(attachment.relativeUrl, {
    baseURL: apiOrigin,
    responseType: 'blob',
  });
  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = attachment.originalName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}
