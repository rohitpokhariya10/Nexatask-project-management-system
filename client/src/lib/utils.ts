import clsx, { type ClassValue } from 'clsx';
import type { Project, Role, User } from '../types/api';

export function cn(...values: ClassValue[]): string {
  return clsx(values);
}

export function entityId(value: string | { id?: string; _id?: string } | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.id ?? value._id ?? '';
}

export function displayUser(value: string | User | null | undefined): string {
  if (!value) return 'Unassigned';
  return typeof value === 'string' ? 'Assigned user' : value.name;
}

export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(
    'en',
    options ?? { day: 'numeric', month: 'short', year: 'numeric' },
  ).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function roleLabel(role: Role): string {
  return { ADMIN: 'Administrator', PROJECT_MANAGER: 'Project manager', TEAM_MEMBER: 'Team member' }[
    role
  ];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function canManageProject(user: User, project: Project): boolean {
  return (
    user.role === 'ADMIN' ||
    (user.role === 'PROJECT_MANAGER' && entityId(project.managerId) === user.id)
  );
}

export function dateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export const projectStatusLabels = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
} as const;

export const taskStatusLabels = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
} as const;

export const priorityLabels = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' } as const;

export const validTaskTransitions = {
  TODO: ['TODO', 'IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'IN_PROGRESS', 'COMPLETED'],
  COMPLETED: ['IN_PROGRESS', 'COMPLETED'],
} as const;
