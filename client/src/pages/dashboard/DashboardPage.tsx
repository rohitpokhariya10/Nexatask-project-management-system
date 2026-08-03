import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  ListTodo,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ErrorState, PageLoader } from '../../components/common/AsyncState';
import { Badge, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { getApiError, request } from '../../lib/api';
import { cn, formatDate } from '../../lib/utils';
import type { DeadlineItem, ProjectProgress, TeamPerformance } from '../../types/api';

interface DashboardOverview {
  projects: { total: number; active: number; completed: number };
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  completedVsPending: Array<{ name: string; value: number }>;
  tasksByStatus: Array<{ status: string; count: number }>;
}

const chartColors = ['#2f6fed', '#dce7fb', '#14b8a6', '#f59e0b'];

export function DashboardPage() {
  const { user } = useAuth();
  const overview = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => request<DashboardOverview>({ url: '/dashboard/overview' }),
  });
  const deadlines = useQuery({
    queryKey: ['dashboard', 'deadlines'],
    queryFn: () => request<DeadlineItem[]>({ url: '/dashboard/deadlines' }),
  });
  const progress = useQuery({
    queryKey: ['dashboard', 'project-progress'],
    queryFn: () => request<ProjectProgress[]>({ url: '/dashboard/project-progress' }),
  });
  const performance = useQuery({
    queryKey: ['dashboard', 'team-performance'],
    queryFn: () => request<TeamPerformance[]>({ url: '/dashboard/team-performance' }),
  });

  const isLoading =
    overview.isPending || deadlines.isPending || progress.isPending || performance.isPending;
  const firstError = overview.error ?? deadlines.error ?? progress.error ?? performance.error;
  const retry = () =>
    void Promise.all([
      overview.refetch(),
      deadlines.refetch(),
      progress.refetch(),
      performance.refetch(),
    ]);

  if (isLoading) return <PageLoader label="Preparing your dashboard" />;
  if (firstError || !overview.data)
    return (
      <ErrorState
        message={getApiError(firstError, 'Dashboard data is unavailable.')}
        onRetry={retry}
      />
    );

  const { projects, tasks } = overview.data;
  const cards = [
    {
      label: 'Total projects',
      value: projects.total,
      detail: `${projects.active} active`,
      icon: FolderKanban,
      tone: 'blue',
    },
    {
      label: 'Total tasks',
      value: tasks.total,
      detail: `${tasks.pending} pending`,
      icon: ListTodo,
      tone: 'violet',
    },
    {
      label: 'Completed',
      value: tasks.completed,
      detail: `${projects.completed} projects closed`,
      icon: CheckCircle2,
      tone: 'green',
    },
    {
      label: 'Overdue',
      value: tasks.overdue,
      detail: tasks.overdue ? 'Needs attention' : 'All caught up',
      icon: AlertCircle,
      tone: tasks.overdue ? 'red' : 'slate',
    },
  ] as const;
  const taskStatusData = overview.data.tasksByStatus.length
    ? overview.data.tasksByStatus
    : [
        { status: 'To do', count: tasks.todo },
        { status: 'In progress', count: tasks.inProgress },
        { status: 'Completed', count: tasks.completed },
      ];
  const completionData = overview.data.completedVsPending.length
    ? overview.data.completedVsPending
    : [
        { name: 'Completed', value: tasks.completed },
        { name: 'Pending', value: tasks.pending },
      ];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title={`Good to see you, ${user?.name.split(' ')[0] ?? 'there'}`}
        description="Here’s the latest progress across the work you can access."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary statistics">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => (
          <Card key={label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
              </div>
              <span
                className={cn('grid h-11 w-11 place-items-center rounded-2xl', {
                  'bg-blue-50 text-blue-600': tone === 'blue',
                  'bg-violet-50 text-violet-600': tone === 'violet',
                  'bg-emerald-50 text-emerald-600': tone === 'green',
                  'bg-red-50 text-red-600': tone === 'red',
                  'bg-slate-100 text-slate-500': tone === 'slate',
                })}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
              {detail}
            </p>
          </Card>
        ))}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div>
            <h2 className="font-bold text-ink">Completed vs pending</h2>
            <p className="mt-1 text-xs text-slate-500">Task completion across visible projects</p>
          </div>
          <div className="mt-4 grid min-h-64 grid-cols-[1fr_auto] items-center gap-4">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={completionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {completionData.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pr-3">
              {completionData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  <span className="text-slate-500">{item.name}</span>
                  <strong className="ml-auto text-ink">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <div>
            <h2 className="font-bold text-ink">Tasks by status</h2>
            <p className="mt-1 text-xs text-slate-500">Current workflow distribution</p>
          </div>
          <div className="mt-5 space-y-5">
            {taskStatusData.map((item, index) => {
              const percentage = tasks.total ? Math.round((item.count / tasks.total) * 100) : 0;
              return (
                <div key={item.status}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-600">
                      {item.status.replaceAll('_', ' ')}
                    </span>
                    <span className="font-bold text-ink">
                      {item.count}{' '}
                      <span className="font-normal text-slate-400">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: chartColors[index % chartColors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-ink">Project progress</h2>
              <p className="mt-1 text-xs text-slate-500">Completion based on tasks delivered</p>
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-1 text-xs font-semibold text-accent hover:text-blue-700"
            >
              All projects <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 space-y-5">
            {(progress.data ?? []).length ? (
              progress.data?.slice(0, 6).map((item) => (
                <div key={item.projectId}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <Link
                      to={`/projects/${item.projectId}`}
                      className="truncate text-sm font-semibold text-slate-700 hover:text-accent"
                    >
                      {item.projectName ?? item.name ?? 'Project'}
                    </Link>
                    <span className="shrink-0 text-xs font-bold text-ink">
                      {Math.round(item.progress)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {item.completedTasks} of {item.totalTasks} tasks completed
                  </p>
                </div>
              ))
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No project progress to show yet.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-bold text-ink">Upcoming deadlines</h2>
          <p className="mt-1 text-xs text-slate-500">Due in the next seven days</p>
          <div className="mt-4 space-y-1">
            {(deadlines.data ?? []).length ? (
              deadlines.data?.slice(0, 7).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  to={item.type === 'PROJECT' ? `/projects/${item.id}` : `/tasks/${item.id}`}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-700">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {formatDate(item.deadline ?? item.date)}
                    </span>
                  </span>
                  <Badge kind={item.type}>{item.type === 'PROJECT' ? 'Project' : 'Task'}</Badge>
                </Link>
              ))
            ) : (
              <p className="py-12 text-center text-sm text-slate-500">
                No deadlines in the next seven days.
              </p>
            )}
          </div>
        </Card>
      </section>

      <section className="mt-5 table-shell">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="font-bold text-ink">Team performance</h2>
          <p className="mt-1 text-xs text-slate-500">
            Straightforward workload and completion metrics
          </p>
        </div>
        {(performance.data ?? []).length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team member</th>
                  <th>Assigned</th>
                  <th>Completed</th>
                  <th>Completion</th>
                  <th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {performance.data?.map((member) => (
                  <tr key={member.userId}>
                    <td className="font-semibold text-ink">
                      {member.userName ?? member.name ?? 'Team member'}
                    </td>
                    <td>{member.assignedTaskCount}</td>
                    <td>{member.completedTaskCount}</td>
                    <td>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(100, member.completionPercentage)}%` }}
                          />
                        </span>
                        <span className="text-xs font-semibold">
                          {Math.round(member.completionPercentage)}%
                        </span>
                      </span>
                    </td>
                    <td className={member.overdueTaskCount ? 'font-semibold text-red-600' : ''}>
                      {member.overdueTaskCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-slate-500">
            <CircleDot className="h-4 w-4" /> No performance data yet.
          </div>
        )}
      </section>
    </div>
  );
}
