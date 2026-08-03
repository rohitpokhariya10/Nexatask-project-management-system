import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Plus,
  Users,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState, PageLoader } from '../../components/common/AsyncState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Badge, Button, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { getApiError, requestPaginated, requestResource } from '../../lib/api';
import {
  canManageProject,
  displayUser,
  entityId,
  formatDate,
  priorityLabels,
  projectStatusLabels,
  taskStatusLabels,
} from '../../lib/utils';
import type { Project, Task } from '../../types/api';

export function ProjectDetailsPage() {
  const { projectId = '' } = useParams();
  const { user } = useAuth();
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${projectId}` }, 'project'),
  });
  const tasks = useQuery({
    queryKey: ['project-tasks', projectId, 'preview'],
    queryFn: () =>
      requestPaginated<Task>({
        url: `/projects/${projectId}/tasks`,
        params: { page: 1, limit: 5, sortBy: 'dueDate', sortOrder: 'asc' },
      }),
  });
  const completedTaskCount = useQuery({
    queryKey: ['project-tasks', projectId, 'completed-count'],
    queryFn: () =>
      requestPaginated<Task>({
        url: `/projects/${projectId}/tasks`,
        params: { page: 1, limit: 1, status: 'COMPLETED' },
      }),
  });

  if (project.isPending) return <PageLoader label="Loading project" />;
  if (project.isError || !project.data)
    return (
      <ErrorState
        message={getApiError(project.error, 'Project is unavailable.')}
        onRetry={() => void project.refetch()}
      />
    );

  const item = project.data;
  const canManage = user ? canManageProject(user, item) : false;
  const members =
    item.members ??
    item.memberIds.filter(
      (member): member is Exclude<typeof member, string> => typeof member !== 'string',
    );
  const managerName = item.manager?.name ?? displayUser(item.managerId);
  const totalTasks = tasks.data?.pagination.totalItems ?? item.taskCount ?? 0;
  const completedTasks =
    completedTaskCount.data?.pagination.totalItems ?? item.completedTaskCount ?? 0;
  const progress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Project details"
        title={item.name}
        description={item.description}
        actions={
          <>
            <Link to="/projects">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" /> Projects
              </Button>
            </Link>
            {canManage ? (
              <Link to={`/projects/${projectId}/edit`}>
                <Button variant="secondary">
                  <Edit3 className="h-4 w-4" /> Edit
                </Button>
              </Link>
            ) : null}
            {canManage ? (
              <Link to={`/projects/${projectId}/tasks/new`}>
                <Button>
                  <Plus className="h-4 w-4" /> New task
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
          <div className="mt-3">
            <Badge kind={item.status}>{projectStatusLabels[item.status]}</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Manager</p>
          <p className="mt-3 truncate font-semibold text-ink">{managerName}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Timeline</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink">
            <CalendarDays className="h-4 w-4 text-accent" />
            {formatDate(item.startDate)} – {formatDate(item.deadline)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Team</p>
          <p className="mt-3 flex items-center gap-2 font-semibold text-ink">
            <Users className="h-4 w-4 text-accent" />
            {item.memberIds.length} member{item.memberIds.length === 1 ? '' : 's'}
          </p>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-bold text-ink">Next tasks</h2>
              <p className="mt-1 text-xs text-slate-500">Ordered by closest due date</p>
            </div>
            <Link
              to={`/projects/${projectId}/tasks`}
              className="text-xs font-semibold text-accent hover:text-blue-700"
            >
              View all
            </Link>
          </div>
          {tasks.isPending ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading tasks…</div>
          ) : tasks.isError ? (
            <div className="p-8 text-center text-sm text-red-600">{getApiError(tasks.error)}</div>
          ) : tasks.data.items.length ? (
            <div className="divide-y divide-slate-100">
              {tasks.data.items.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 sm:px-6"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500">
                    {task.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ClipboardList className="h-4 w-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {task.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400">
                      Due {formatDate(task.dueDate)}
                    </span>
                  </span>
                  <span className="hidden gap-2 sm:flex">
                    <Badge kind={task.priority}>{priorityLabels[task.priority]}</Badge>
                    <Badge kind={task.status}>{taskStatusLabels[task.status]}</Badge>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No tasks yet"
                description={
                  canManage
                    ? 'Create the first task to start tracking delivery.'
                    : 'Tasks added to this project will appear here.'
                }
                action={
                  canManage ? (
                    <Link to={`/projects/${projectId}/tasks/new`}>
                      <Button>
                        <Plus className="h-4 w-4" /> Create task
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-bold text-ink">Project progress</p>
                <p className="mt-1 text-xs text-slate-500">
                  {completedTasks} of {totalTasks} tasks complete
                </p>
              </div>
              <span className="text-2xl font-bold text-ink">{progress}%</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-ink">Project team</h2>
                <p className="mt-1 text-xs text-slate-500">Members with project access</p>
              </div>
              {canManage ? (
                <Link
                  to={`/projects/${projectId}/members`}
                  className="text-xs font-semibold text-accent hover:text-blue-700"
                >
                  Manage
                </Link>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {members.length ? (
                members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-700">{member.name}</p>
                      <p className="truncate text-xs text-slate-400">{member.email}</p>
                    </div>
                  </div>
                ))
              ) : item.memberIds.length ? (
                <p className="text-sm text-slate-500">
                  {item.memberIds.length} member{item.memberIds.length === 1 ? '' : 's'} assigned.
                </p>
              ) : (
                <p className="text-sm text-slate-500">No members have been added.</p>
              )}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

export function ProjectMembersPage() {
  const { projectId = '' } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingRemoval, setPendingRemoval] = useState<{ id: string; name: string } | null>(null);
  const project = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => requestResource<Project>({ url: `/projects/${projectId}` }, 'project'),
  });
  const eligible = useQuery({
    queryKey: ['project', projectId, 'eligible-members'],
    queryFn: () =>
      requestPaginated<import('../../types/api').User>({
        url: `/projects/${projectId}/eligible-members`,
        params: { limit: 100 },
      }),
    enabled: Boolean(project.data && user && canManageProject(user, project.data)),
  });
  const managers = useQuery({
    queryKey: ['users', 'managers'],
    queryFn: () =>
      requestPaginated<import('../../types/api').User>({
        url: '/users',
        params: { limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
      }),
    enabled: user?.role === 'ADMIN',
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    void queryClient.invalidateQueries({ queryKey: ['project', projectId, 'eligible-members'] });
  };
  const addMember = useMutation({
    mutationFn: (userId: string) =>
      requestResource<Project>(
        { method: 'POST', url: `/projects/${projectId}/members`, data: { userId } },
        'project',
      ),
    onSuccess: () => {
      toast.success('Team member added.');
      refresh();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to add this member.')),
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      requestResource<Project>(
        { method: 'DELETE', url: `/projects/${projectId}/members/${userId}` },
        'project',
      ),
    onSuccess: () => {
      toast.success('Team member removed.');
      refresh();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to remove this member.')),
    onSettled: () => setPendingRemoval(null),
  });
  const assignManager = useMutation({
    mutationFn: (managerId: string) =>
      requestResource<Project>(
        { method: 'PATCH', url: `/projects/${projectId}/manager`, data: { managerId } },
        'project',
      ),
    onSuccess: () => {
      toast.success('Project manager updated.');
      refresh();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to assign this manager.')),
  });

  if (project.isPending) return <PageLoader label="Loading project team" />;
  if (project.isError || !project.data)
    return (
      <ErrorState message={getApiError(project.error)} onRetry={() => void project.refetch()} />
    );
  if (!user || !canManageProject(user, project.data))
    return <ErrorState message="You do not have permission to manage this project team." />;
  const members =
    project.data.members ??
    project.data.memberIds.filter(
      (member): member is Exclude<typeof member, string> => typeof member !== 'string',
    );
  const managerId = entityId(project.data.managerId);
  const removableMembers = members.filter((member) => member.id !== managerId);
  const removableMemberIds = project.data.memberIds
    .map(entityId)
    .filter((memberId) => memberId !== managerId);
  const managerOptions =
    managers.data?.items.filter(
      (candidate) => candidate.role === 'ADMIN' || candidate.role === 'PROJECT_MANAGER',
    ) ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Project team"
        title={`Manage ${project.data.name}`}
        description="Assign project ownership and keep membership limited to the people doing the work."
        actions={
          <Link to={`/projects/${projectId}`}>
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4" /> Project
            </Button>
          </Link>
        }
      />
      {user.role === 'ADMIN' ? (
        <Card className="mb-5 p-5 sm:p-6">
          <label className="field-label" htmlFor="project-manager">
            Project manager
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              id="project-manager"
              className="field flex-1"
              defaultValue={entityId(project.data.managerId)}
              onChange={(event) => event.target.value && assignManager.mutate(event.target.value)}
              disabled={assignManager.isPending}
            >
              <option value="">Select a manager</option>
              {managerOptions.map((manager) => (
                <option value={manager.id} key={manager.id}>
                  {manager.name} · {manager.email}
                </option>
              ))}
            </select>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-ink">Current members</h2>
          <p className="mt-1 text-xs text-slate-500">
            Removing someone also removes their project access.
          </p>
          <div className="mt-5 space-y-2">
            {removableMembers.length ? (
              removableMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                    <p className="truncate text-xs text-slate-400">{member.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="shrink-0 text-red-600 hover:bg-red-50"
                    loading={removeMember.isPending && removeMember.variables === member.id}
                    onClick={() => setPendingRemoval({ id: member.id, name: member.name })}
                  >
                    Remove
                  </Button>
                </div>
              ))
            ) : removableMemberIds.length ? (
              removableMemberIds.map((id) => {
                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                  >
                    <span className="text-sm text-slate-500">Assigned member</span>
                    <Button
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setPendingRemoval({ id, name: 'this member' })}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
                No team members yet.
              </p>
            )}
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-ink">Eligible team members</h2>
          <p className="mt-1 text-xs text-slate-500">
            Active Team Members not already on this project.
          </p>
          <div className="mt-5 space-y-2">
            {eligible.isPending ? (
              <p className="py-10 text-center text-sm text-slate-500">Loading eligible members…</p>
            ) : eligible.isError ? (
              <p className="py-10 text-center text-sm text-red-600">
                {getApiError(eligible.error)}
              </p>
            ) : eligible.data.items.length ? (
              eligible.data.items.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
                    <p className="truncate text-xs text-slate-400">{member.email}</p>
                  </div>
                  <Button
                    variant="secondary"
                    className="shrink-0"
                    loading={addMember.isPending && addMember.variables === member.id}
                    onClick={() => addMember.mutate(member.id)}
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
                Everyone eligible is already on the team.
              </p>
            )}
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove team member?"
        description={`${pendingRemoval?.name ?? 'This member'} will lose access to this project. Their existing task history will remain.`}
        confirmLabel="Remove member"
        busy={removeMember.isPending}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => pendingRemoval && removeMember.mutate(pendingRemoval.id)}
      />
    </div>
  );
}
