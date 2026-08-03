import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/common/AsyncState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Pagination } from '../../components/common/Pagination';
import { Avatar, Badge, Button, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiError, requestPaginated, requestResource } from '../../lib/api';
import { formatDate } from '../../lib/utils';
import type { Role, User } from '../../types/api';

interface StatusChange {
  user: User;
  nextActive: boolean;
}

type UserSortBy = 'name' | 'email' | 'role' | 'isActive' | 'createdAt';
type UserSortValue = `${UserSortBy}:${'asc' | 'desc'}`;

export function UsersPage() {
  const { user: currentUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [active, setActive] = useState('');
  const [sort, setSort] = useState<UserSortValue>('createdAt:desc');
  const [page, setPage] = useState(1);
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortOrder] = sort.split(':') as [UserSortBy, 'asc' | 'desc'];
  const users = useQuery({
    queryKey: ['users', { page, search: debouncedSearch, role, active, sort }],
    queryFn: () =>
      requestPaginated<User>({
        url: '/users',
        params: {
          page,
          limit: 10,
          search: debouncedSearch || undefined,
          role: role || undefined,
          isActive: active || undefined,
          sortBy,
          sortOrder,
        },
      }),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['users'] });
  const changeRole = useMutation({
    mutationFn: ({ userId, nextRole }: { userId: string; nextRole: Role }) =>
      requestResource<User>(
        { method: 'PATCH', url: `/users/${userId}/role`, data: { role: nextRole } },
        'user',
      ),
    onSuccess: (_, variables) => {
      toast.success('User role updated.');
      refresh();
      if (variables.userId === currentUser?.id) void refreshUser();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update the role.')),
  });
  const changeStatus = useMutation({
    mutationFn: ({ user, nextActive }: StatusChange) =>
      requestResource<User>(
        { method: 'PATCH', url: `/users/${user.id}/status`, data: { isActive: nextActive } },
        'user',
      ),
    onSuccess: (_, variables) => {
      toast.success(variables.nextActive ? 'User activated.' : 'User deactivated.');
      setStatusChange(null);
      refresh();
    },
    onError: (error) => toast.error(getApiError(error, 'Unable to update account status.')),
  });
  const filter = (action: () => void) => {
    action();
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="User management"
        description="Control roles and account access. Your own active session is protected from accidental deactivation."
      />
      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="relative sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Search users</span>
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              className="field pl-10"
              placeholder="Search name or email…"
              value={search}
              onChange={(event) => filter(() => setSearch(event.target.value))}
            />
          </label>
          <select
            className="field"
            aria-label="Filter by role"
            value={role}
            onChange={(event) => filter(() => setRole(event.target.value as Role | ''))}
          >
            <option value="">All roles</option>
            <option value="ADMIN">Administrator</option>
            <option value="PROJECT_MANAGER">Project manager</option>
            <option value="TEAM_MEMBER">Team member</option>
          </select>
          <select
            className="field"
            aria-label="Filter by account status"
            value={active}
            onChange={(event) => filter(() => setActive(event.target.value))}
          >
            <option value="">All accounts</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            className="field"
            aria-label="Sort users"
            value={sort}
            onChange={(event) => filter(() => setSort(event.target.value as UserSortValue))}
          >
            <option value="createdAt:desc">Newest joined</option>
            <option value="createdAt:asc">Oldest joined</option>
            <option value="name:asc">Name · A–Z</option>
            <option value="name:desc">Name · Z–A</option>
            <option value="email:asc">Email · A–Z</option>
            <option value="role:asc">Role</option>
            <option value="isActive:desc">Active first</option>
            <option value="isActive:asc">Inactive first</option>
          </select>
          {search || role || active ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch('');
                setRole('');
                setActive('');
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
      {users.isPending ? (
        <TableSkeleton />
      ) : users.isError ? (
        <ErrorState
          message={getApiError(users.error, 'Users are unavailable.')}
          onRetry={() => void users.refetch()}
        />
      ) : !users.data.items.length ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No users found"
          description="Try adjusting your search or account filters."
        />
      ) : (
        <div className="table-shell">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Account action</th>
                </tr>
              </thead>
              <tbody>
                {users.data.items.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={member.name} imageUrl={member.avatarUrl} size="sm" />
                          <div>
                            <p className="font-semibold text-ink">
                              {member.name}
                              {isSelf ? (
                                <span className="ml-2 text-xs font-medium text-accent">You</span>
                              ) : null}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          className="h-9 min-w-44 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700"
                          value={member.role}
                          disabled={
                            changeRole.isPending && changeRole.variables?.userId === member.id
                          }
                          onChange={(event) =>
                            changeRole.mutate({
                              userId: member.id,
                              nextRole: event.target.value as Role,
                            })
                          }
                          aria-label={`Role for ${member.name}`}
                        >
                          <option value="ADMIN">Administrator</option>
                          <option value="PROJECT_MANAGER">Project manager</option>
                          <option value="TEAM_MEMBER">Team member</option>
                        </select>
                      </td>
                      <td>
                        <Badge kind={member.isActive ? 'ACTIVE_USER' : 'INACTIVE_USER'}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>{formatDate(member.createdAt)}</td>
                      <td>
                        <Button
                          variant={member.isActive ? 'ghost' : 'secondary'}
                          className={member.isActive ? 'text-red-600 hover:bg-red-50' : ''}
                          disabled={isSelf && member.isActive}
                          onClick={() =>
                            setStatusChange({ user: member, nextActive: !member.isActive })
                          }
                        >
                          {member.isActive ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination pagination={users.data.pagination} onPageChange={setPage} />
        </div>
      )}
      <ConfirmDialog
        open={Boolean(statusChange)}
        title={statusChange?.nextActive ? 'Activate this account?' : 'Deactivate this account?'}
        description={
          statusChange?.nextActive
            ? `${statusChange.user.name} will be able to sign in and access assigned work again.`
            : `${statusChange?.user.name ?? 'This user'} will lose sign-in access until an administrator reactivates the account.`
        }
        confirmLabel={statusChange?.nextActive ? 'Activate user' : 'Deactivate user'}
        danger={!statusChange?.nextActive}
        busy={changeStatus.isPending}
        onClose={() => setStatusChange(null)}
        onConfirm={() => statusChange && changeStatus.mutate(statusChange)}
      />
    </div>
  );
}
