import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronRight,
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/common/AsyncState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import { Badge, Button, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { getApiError, request, requestPaginated } from '../../lib/api';
import { entityId, formatDate, projectStatusLabels } from '../../lib/utils';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Project, ProjectStatus, User } from '../../types/api';

export function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');
  const [managerId, setManagerId] = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [sort, setSort] = useState('deadline:asc');
  const [page, setPage] = useState(1);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortOrder] = sort.split(':');

  const managers = useQuery({
    queryKey: ['users', 'project-filter-managers'],
    queryFn: () =>
      requestPaginated<User>({
        url: '/users',
        params: { page: 1, limit: 100, isActive: true, sortBy: 'name', sortOrder: 'asc' },
      }),
    enabled: user?.role === 'ADMIN',
  });
  const managerOptions =
    managers.data?.items.filter(
      (candidate) => candidate.role === 'ADMIN' || candidate.role === 'PROJECT_MANAGER',
    ) ?? [];

  const projects = useQuery({
    queryKey: [
      'projects',
      { page, search: debouncedSearch, status, managerId, deadlineFrom, deadlineTo, sort },
    ],
    queryFn: () =>
      requestPaginated<Project>({
        url: '/projects',
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          status: status || undefined,
          managerId: managerId || undefined,
          deadlineFrom: deadlineFrom || undefined,
          deadlineTo: deadlineTo || undefined,
          sortBy,
          sortOrder,
        },
      }),
  });

  const remove = useMutation({
    mutationFn: (projectId: string) =>
      request<null>({ method: 'DELETE', url: `/projects/${projectId}` }),
    onSuccess: (_, projectId) => {
      toast.success('Project deleted.');
      setDeleteProject(null);
      queryClient.removeQueries({ queryKey: ['project', projectId] });
      queryClient.removeQueries({ queryKey: ['project-tasks', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to delete the project.')),
  });

  const updateFilter = (action: () => void) => {
    action();
    setPage(1);
  };
  const hasFilters = Boolean(debouncedSearch || status || managerId || deadlineFrom || deadlineTo);
  const managerLabel = (project: Project) =>
    project.manager?.name ??
    (entityId(project.managerId) === user?.id ? user.name : 'Project manager');

  return (
    <div>
      <PageHeader
        eyebrow="Portfolio"
        title="Projects"
        description="Search, prioritize and open the projects available to your role."
        actions={
          user?.role === 'ADMIN' ? (
            <Link to="/projects/new">
              <Button>
                <Plus className="h-4 w-4" /> New project
              </Button>
            </Link>
          ) : undefined
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Search projects</span>
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-10"
              value={search}
              onChange={(event) => updateFilter(() => setSearch(event.target.value))}
              placeholder="Search name or description…"
            />
          </label>
          {user?.role === 'ADMIN' ? (
            <select
              className="field"
              aria-label="Project manager filter"
              value={managerId}
              disabled={managers.isPending}
              onChange={(event) => updateFilter(() => setManagerId(event.target.value))}
            >
              <option value="">
                {managers.isPending ? 'Loading managers…' : 'All project managers'}
              </option>
              {managerOptions.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          ) : null}
          <label>
            <span className="sr-only">Project deadline from</span>
            <input
              className="field"
              type="date"
              aria-label="Project deadline from"
              max={deadlineTo || undefined}
              value={deadlineFrom}
              onChange={(event) => updateFilter(() => setDeadlineFrom(event.target.value))}
            />
          </label>
          <label>
            <span className="sr-only">Project deadline to</span>
            <input
              className="field"
              type="date"
              aria-label="Project deadline to"
              min={deadlineFrom || undefined}
              value={deadlineTo}
              onChange={(event) => updateFilter(() => setDeadlineTo(event.target.value))}
            />
          </label>
          <label>
            <span className="sr-only">Project status</span>
            <select
              className="field"
              value={status}
              onChange={(event) =>
                updateFilter(() => setStatus(event.target.value as ProjectStatus | ''))
              }
            >
              <option value="">All statuses</option>
              {Object.entries(projectStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort projects</span>
            <select
              className="field"
              value={sort}
              onChange={(event) => updateFilter(() => setSort(event.target.value))}
            >
              <option value="deadline:asc">Deadline · earliest</option>
              <option value="deadline:desc">Deadline · latest</option>
              <option value="name:asc">Name · A–Z</option>
              <option value="createdAt:desc">Recently created</option>
            </select>
          </label>
          {hasFilters ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setStatus('');
                setManagerId('');
                setDeadlineFrom('');
                setDeadlineTo('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          ) : (
            <span className="hidden items-center justify-center text-slate-400 xl:flex">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
        </div>
      </Card>

      {projects.isPending ? (
        <TableSkeleton />
      ) : projects.isError ? (
        <ErrorState
          message={getApiError(projects.error, 'Projects are unavailable.')}
          onRetry={() => void projects.refetch()}
        />
      ) : !projects.data.items.length ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title={hasFilters ? 'No projects match these filters' : 'No projects yet'}
          description={
            hasFilters
              ? 'Adjust your search or filters to broaden the results.'
              : user?.role === 'ADMIN'
                ? 'Create the first project and bring your team together.'
                : 'Projects you join or manage will appear here.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setStatus('');
                  setManagerId('');
                  setDeadlineFrom('');
                  setDeadlineTo('');
                  setPage(1);
                }}
              >
                Reset filters
              </Button>
            ) : user?.role === 'ADMIN' ? (
              <Link to="/projects/new">
                <Button>
                  <Plus className="h-4 w-4" /> Create project
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden table-shell md:block">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Manager</th>
                    <th>Deadline</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.data.items.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <Link
                          to={`/projects/${project.id}`}
                          className="font-semibold text-ink hover:text-accent"
                        >
                          {project.name}
                        </Link>
                        <p className="mt-1 max-w-lg truncate text-xs text-slate-400">
                          {project.description}
                        </p>
                      </td>
                      <td>
                        <Badge kind={project.status}>{projectStatusLabels[project.status]}</Badge>
                      </td>
                      <td>{managerLabel(project)}</td>
                      <td>
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(project.deadline)}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {user?.role === 'ADMIN' ? (
                            <button
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setDeleteProject(project)}
                              aria-label={`Delete ${project.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                          <Link
                            to={`/projects/${project.id}`}
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-accent"
                            aria-label={`Open ${project.name}`}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={projects.data.pagination} onPageChange={setPage} />
          </div>
          <div className="grid gap-3 md:hidden">
            {projects.data.items.map((project) => (
              <div key={project.id} className="surface p-4 transition hover:border-blue-200">
                <Link to={`/projects/${project.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold text-ink">{project.name}</h2>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                        {project.description}
                      </p>
                    </div>
                    <Badge kind={project.status}>{projectStatusLabels[project.status]}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{managerLabel(project)}</span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(project.deadline)}
                    </span>
                  </div>
                </Link>
                {user?.role === 'ADMIN' ? (
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteProject(project)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete project
                  </button>
                ) : null}
              </div>
            ))}
            <Card>
              <Pagination pagination={projects.data.pagination} onPageChange={setPage} />
            </Card>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteProject)}
        title="Delete this project?"
        description={`“${deleteProject?.name ?? ''}” and its related work will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete project"
        busy={remove.isPending}
        onClose={() => setDeleteProject(null)}
        onConfirm={() => deleteProject && remove.mutate(deleteProject.id)}
      />
    </div>
  );
}
