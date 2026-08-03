import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileClock, Filter } from 'lucide-react';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/common/AsyncState';
import { Pagination } from '../../components/common/Pagination';
import { Avatar, Button, Card, PageHeader } from '../../components/common/ui';
import { getApiError, requestPaginated } from '../../lib/api';
import { entityId, formatDateTime } from '../../lib/utils';
import type { AuditLog, User } from '../../types/api';

const actionOptions = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'USER_ROLE_CHANGED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_DELETED',
  'PROJECT_MANAGER_ASSIGNED',
  'PROJECT_MEMBERS_ADDED',
  'PROJECT_MEMBER_REMOVED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_DELETED',
  'TASK_ASSIGNED',
  'TASK_REASSIGNED',
  'TASK_STATUS_CHANGED',
  'ATTACHMENT_UPLOADED',
  'ATTACHMENT_DELETED',
];

export function AuditLogsPage() {
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const actors = useQuery({
    queryKey: ['users', 'audit-actors'],
    queryFn: () =>
      requestPaginated<User>({
        url: '/users',
        params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
      }),
  });
  const logs = useQuery({
    queryKey: ['audit-logs', { page, actorId, action, entityType, dateFrom, dateTo }],
    queryFn: () =>
      requestPaginated<AuditLog>({
        url: '/audit-logs',
        params: {
          page,
          limit: 20,
          actorId: actorId || undefined,
          action: action || undefined,
          entityType: entityType || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        },
      }),
  });
  const update = (fn: () => void) => {
    fn();
    setPage(1);
  };
  const hasFilters = actorId || action || entityType || dateFrom || dateTo;
  const actorById = new Map((actors.data?.items ?? []).map((actor) => [actor.id, actor]));

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Audit logs"
        description="A newest-first record of important account, project, task and attachment changes."
      />
      <Card className="mb-5 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_160px_160px_160px_auto]">
          <select
            className="field"
            aria-label="Filter by actor"
            value={actorId}
            onChange={(event) => update(() => setActorId(event.target.value))}
          >
            <option value="">All actors</option>
            {actors.data?.items.map((actor) => (
              <option value={actor.id} key={actor.id}>
                {actor.name} · {actor.email}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Filter audit action"
            value={action}
            onChange={(event) => update(() => setAction(event.target.value))}
          >
            <option value="">All actions</option>
            {actionOptions.map((value) => (
              <option value={value} key={value}>
                {value.toLowerCase().replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Filter entity type"
            value={entityType}
            onChange={(event) => update(() => setEntityType(event.target.value))}
          >
            <option value="">All entities</option>
            <option value="User">User</option>
            <option value="Project">Project</option>
            <option value="Task">Task</option>
            <option value="Attachment">Attachment</option>
          </select>
          <label>
            <span className="sr-only">From date</span>
            <input
              className="field"
              type="date"
              value={dateFrom}
              onChange={(event) => update(() => setDateFrom(event.target.value))}
            />
          </label>
          <label>
            <span className="sr-only">To date</span>
            <input
              className="field"
              type="date"
              value={dateTo}
              onChange={(event) => update(() => setDateTo(event.target.value))}
            />
          </label>
          {hasFilters ? (
            <Button
              variant="ghost"
              onClick={() => {
                setActorId('');
                setAction('');
                setEntityType('');
                setDateFrom('');
                setDateTo('');
                setPage(1);
              }}
            >
              Clear
            </Button>
          ) : (
            <span className="hidden items-center justify-center text-slate-400 lg:flex">
              <Filter className="h-5 w-5" />
            </span>
          )}
        </div>
      </Card>
      {logs.isPending ? (
        <TableSkeleton rows={7} />
      ) : logs.isError ? (
        <ErrorState
          message={getApiError(logs.error, 'Audit logs are unavailable.')}
          onRetry={() => void logs.refetch()}
        />
      ) : !logs.data.items.length ? (
        <EmptyState
          icon={<FileClock className="h-6 w-6" />}
          title="No audit activity found"
          description={
            hasFilters
              ? 'No events match the selected filters.'
              : 'Important organization events will be recorded here.'
          }
        />
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {logs.data.items.map((log) => {
                  const embeddedActor = typeof log.actorId === 'string' ? null : log.actorId;
                  const actor = embeddedActor ?? actorById.get(entityId(log.actorId));
                  return (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td>
                        {actor ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={actor.name} imageUrl={actor.avatarUrl} size="sm" />
                            <span className="font-semibold text-ink">{actor.name}</span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">
                            {entityId(log.actorId) || 'System'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="whitespace-nowrap font-mono text-xs font-semibold text-slate-600">
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {log.entityType}
                        </span>
                      </td>
                      <td className="min-w-72">
                        <p className="text-sm leading-5 text-slate-600">{log.summary}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={logs.data.pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
