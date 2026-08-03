import { CalendarDays, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Card, PageHeader } from '../../components/common/ui';
import { useAuth } from '../../features/auth/auth-context';
import { formatDate, roleLabel } from '../../lib/utils';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Review the identity and access level attached to your current session."
      />
      <Card className="overflow-hidden">
        <div className="h-28 bg-navy">
          <div className="h-full w-full bg-[radial-gradient(circle_at_80%_10%,rgba(47,111,237,.35),transparent_40%)]" />
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-9 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <span className="rounded-2xl bg-white p-1.5 shadow-card">
                <Avatar name={user.name} imageUrl={user.avatarUrl} size="lg" />
              </span>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-ink">{user.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{roleLabel(user.role)}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Mail className="h-4 w-4" /> Email
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-ink">{user.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <ShieldCheck className="h-4 w-4" /> Access role
              </p>
              <div className="mt-2">
                <Badge kind={user.role}>{roleLabel(user.role)}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <CalendarDays className="h-4 w-4" /> Member since
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">{formatDate(user.createdAt)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <KeyRound className="h-4 w-4" /> Account status
              </p>
              <div className="mt-2">
                <Badge kind={user.isActive ? 'ACTIVE_USER' : 'INACTIVE_USER'}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
      <Card className="mt-5 border-blue-100 bg-blue-50/60 p-5 shadow-none">
        <h2 className="text-sm font-bold text-blue-900">About your access</h2>
        <p className="mt-1 text-sm leading-6 text-blue-800/80">
          Roles and activation status are managed by an administrator. Backend authorization checks
          every protected action even when the interface hides controls that are not available to
          your role.
        </p>
      </Card>
    </div>
  );
}
