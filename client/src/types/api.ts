export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'TEAM_MEMBER';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  _id?: string;
  name: string;
  description: string;
  status: ProjectStatus;
  managerId?: string | User | null;
  memberIds: Array<string | User>;
  manager?: User | null;
  members?: User[];
  startDate: string;
  deadline: string;
  createdBy?: string | User;
  createdAt?: string;
  updatedAt?: string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface Task {
  id: string;
  _id?: string;
  projectId: string | Project;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | User | null;
  createdBy?: string | User;
  dueDate: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  _id?: string;
  taskId: string;
  authorId: string | User;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  _id?: string;
  taskId: string;
  uploadedBy: string | User;
  originalName: string;
  mimeType: string;
  size: number;
  relativeUrl: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  _id?: string;
  actorId?: string | User | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export interface Overview {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface DeadlineItem {
  id: string;
  title: string;
  type: 'PROJECT' | 'TASK';
  date?: string;
  deadline?: string;
  projectId?: string;
  projectName?: string;
}

export interface ProjectProgress {
  projectId: string;
  projectName?: string;
  name?: string;
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

export interface TeamPerformance {
  userId: string;
  userName?: string;
  name?: string;
  assignedTaskCount: number;
  completedTaskCount: number;
  completionPercentage: number;
  overdueTaskCount: number;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: Array<{ path?: string; message: string }> | string[];
}
