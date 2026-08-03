import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Check, ClipboardCheck, Plus, Search } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/common/AsyncState';
import { Pagination } from '../../components/common/Pagination';
import { Badge, Button, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiError, requestPaginated, requestResource } from '../../lib/api';
import {
  canManageProject,
  entityId,
  formatDate,
  priorityLabels,
  taskStatusLabels,
  validTaskTransitions,
} from '../../lib/utils';
import type { Project, Task, TaskPriority, TaskStatus } from '../../types/api';

export function TaskListPage({ mode = 'project' }: { mode?: 'project' | 'mine' }) {
  const { projectId = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const isMine = mode === 'mine';

  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${projectId}` }, 'project'),
    enabled: !isMine && Boolean(projectId),
  });
  const tasks = useQuery({
    queryKey: [
      isMine ? 'my-tasks' : 'project-tasks',
      projectId,
      { page, search: debouncedSearch, status, priority },
    ],
    queryFn: () =>
      requestPaginated<Task>({
        url: isMine ? '/tasks/my-tasks' : `/projects/${projectId}/tasks`,
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          priority: priority || undefined,
          sortBy: 'dueDate',
          sortOrder: 'asc',
        },
      }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ taskId, nextStatus }: { taskId: string; nextStatus: TaskStatus }) =>
      requestResource<Task>(
        { method: 'PATCH', url: `/tasks/${taskId}/status`, data: { status: nextStatus } },
        'task',
      ),
    onSuccess: () => {
      toast.success('Task status updated.');
      void queryClient.invalidateQueries({ queryKey: [isMine ? 'my-tasks' : 'project-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update task status.')),
  });

  const resetPage = (action: () => void) => {
    action();
    setPage(1);
  };
  const projectMembers = project.data?.members ?? [];
  const memberName = (idValue: Task['assigneeId']) =>
    projectMembers.find((member) => member.id === entityId(idValue))?.name ??
    (typeof idValue === 'object' && idValue ? idValue.name : idValue ? 'Assigned' : 'Unassigned');
  const canCreate = Boolean(user && project.data && canManageProject(user, project.data));

  return (
    <div>
      <PageHeader
        eyebrow={isMine ? 'Personal queue' : 'Project work'}
        title={
          isMine ? 'My tasks' : project.data?.name ? `${project.data.name} tasks` : 'Project tasks'
        }
        description={
          isMine
            ? 'Focus on the work assigned to you and keep each status current.'
            : 'Search, filter and manage the work planned for this project.'
        }
        actions={
          !isMine ? (
            <>
              <Link to={`/projects/${projectId}`}>
                <Button variant="secondary">
                  <ArrowLeft className="h-4 w-4" /> Project
                </Button>
              </Link>
              {canCreate ? (
                <Link to={`/projects/${projectId}/tasks/new`}>
                  <Button>
                    <Plus className="h-4 w-4" /> New task
                  </Button>
                </Link>
              ) : null}
            </>
          ) : undefined
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_190px_180px_auto]">
          <label className="relative">
            <span className="sr-only">Search tasks</span>
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-10"
              value={search}
              onChange={(event) => resetPage(() => setSearch(event.target.value))}
              placeholder="Search task title or description…"
            />
          </label>
          <select
            className="field"
            aria-label="Task status"
            value={status}
            onChange={(event) => resetPage(() => setStatus(event.target.value as TaskStatus | ''))}
          >
            <option value="">All statuses</option>
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            className="field"
            aria-label="Task priority"
            value={priority}
            onChange={(event) =>
              resetPage(() => setPriority(event.target.value as TaskPriority | ''))
            }
          >
            <option value="">All priorities</option>
            <option value="LOW">Low priority</option>
            <option value="MEDIUM">Medium priority</option>
            <option value="HIGH">High priority</option>
          </select>
          {search || status || priority ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPriority('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          ) : (
            <span />
          )}
        </div>
      </Card>

      {tasks.isPending ? (
        <TableSkeleton />
      ) : tasks.isError ? (
        <ErrorState
          message={getApiError(tasks.error, 'Tasks are unavailable.')}
          onRetry={() => void tasks.refetch()}
        />
      ) : !tasks.data.items.length ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title="No tasks found"
          description={
            search || status || priority
              ? 'Try changing your search or filters.'
              : isMine
                ? 'When a task is assigned to you, it will appear here.'
                : 'Start by creating the first task for this project.'
          }
          action={
            !isMine && canCreate && !search && !status && !priority ? (
              <Link to={`/projects/${projectId}/tasks/new`}>
                <Button>
                  <Plus className="h-4 w-4" /> Create task
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Priority</th>
                  <th>Assignee</th>
                  <th>Due date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tasks.data.items.map((task) => {
                  const canUpdateStatus =
                    user?.role !== 'TEAM_MEMBER' || entityId(task.assigneeId) === user.id || isMine;
                  return (
                    <tr key={task.id}>
                      <td>
                        <Link
                          to={`/tasks/${task.id}`}
                          className="font-semibold text-ink hover:text-accent"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-1 max-w-md truncate text-xs text-slate-400">
                          {task.description}
                        </p>
                      </td>
                      <td>
                        <Badge kind={task.priority}>{priorityLabels[task.priority]}</Badge>
                      </td>
                      <td>{memberName(task.assigneeId)}</td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-2 ${new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'font-semibold text-red-600' : ''}`}
                        >
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(task.dueDate)}
                        </span>
                      </td>
                      <td>
                        {canUpdateStatus ? (
                          <label className="relative inline-block">
                            <span className="sr-only">Update status for {task.title}</span>
                            <select
                              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 pr-8 text-xs font-semibold text-slate-700"
                              value={task.status}
                              disabled={
                                changeStatus.isPending && changeStatus.variables?.taskId === task.id
                              }
                              onChange={(event) =>
                                changeStatus.mutate({
                                  taskId: task.id,
                                  nextStatus: event.target.value as TaskStatus,
                                })
                              }
                            >
                              {validTaskTransitions[task.status].map((value) => (
                                <option value={value} key={value}>
                                  {taskStatusLabels[value]}
                                </option>
                              ))}
                            </select>
                            {changeStatus.isSuccess &&
                            changeStatus.variables?.taskId === task.id ? (
                              <Check className="absolute -right-5 top-2.5 h-3.5 w-3.5 text-emerald-600" />
                            ) : null}
                          </label>
                        ) : (
                          <Badge kind={task.status}>{taskStatusLabels[task.status]}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={tasks.data.pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
