import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Files,
  History,
  LogOut,
  Menu,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../features/auth/auth-context';
import { cn, roleLabel } from '../../lib/utils';
import type { Role } from '../../types/api';
import { Avatar } from '../common/ui';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: Role[];
}

const navigation: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: BarChart3 },
  { label: 'Projects', to: '/projects', icon: Files },
  { label: 'My tasks', to: '/tasks/my', icon: ClipboardList },
  { label: 'User management', to: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { label: 'Audit logs', to: '/admin/audit', icon: History, roles: ['ADMIN'] },
];

const titleMatchers: Array<[RegExp, string]> = [
  [/^\/dashboard$/, 'Dashboard'],
  [/^\/projects\/new$/, 'Create project'],
  [/^\/projects\/[^/]+\/edit$/, 'Edit project'],
  [/^\/projects\/[^/]+\/tasks\/new$/, 'Create task'],
  [/^\/projects\/[^/]+\/tasks$/, 'Project tasks'],
  [/^\/projects\/[^/]+$/, 'Project details'],
  [/^\/projects$/, 'Projects'],
  [/^\/tasks\/my$/, 'My tasks'],
  [/^\/tasks\/[^/]+\/edit$/, 'Edit task'],
  [/^\/tasks\/[^/]+$/, 'Task details'],
  [/^\/admin\/users$/, 'User management'],
  [/^\/admin\/audit$/, 'Audit logs'],
  [/^\/profile$/, 'Profile'],
];

function ProductMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-extrabold text-navy shadow-sm"
        aria-hidden="true"
      >
        N
        <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
      </span>
      {!compact ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">
            CountryEdu
          </p>
          <p className="text-base font-bold tracking-tight text-white">NexaTask</p>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="flex h-full flex-col bg-navy px-4 py-5 text-white">
      <div className="px-2">
        <ProductMark />
      </div>
      <nav className="mt-9 flex-1 space-y-1" aria-label="Primary navigation">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Workspace
        </p>
        {navigation
          .filter((item) => !item.roles || item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-300 transition hover:bg-white/8 hover:text-white',
                    isActive &&
                      'bg-blue-500/20 font-semibold text-white ring-1 ring-inset ring-blue-400/20',
                  )
                }
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                {item.label}
              </NavLink>
            );
          })}
      </nav>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs font-semibold text-white">Signed in as</p>
        <p className="mt-1 truncate text-xs text-slate-400">{user.email}</p>
      </div>
    </div>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pageTitle =
    titleMatchers.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? 'NexaTask';

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileOpen(false);
    };
    window.addEventListener('mousedown', closeMenu);
    return () => window.removeEventListener('mousedown', closeMenu);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative h-full w-[min(82vw,18rem)] shadow-2xl">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-sm font-bold text-ink sm:text-base">{pageTitle}</h2>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-slate-100"
              onClick={() => setProfileOpen((open) => !open)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <Avatar name={user.name} imageUrl={user.avatarUrl} size="sm" />
              <span className="hidden max-w-36 sm:block">
                <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
                <span className="block truncate text-[11px] text-slate-500">
                  {roleLabel(user.role)}
                </span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
            </button>
            {profileOpen ? (
              <div
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
                role="menu"
              >
                <NavLink
                  to="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  role="menuitem"
                >
                  <UserCircle className="h-4 w-4" /> Profile
                </NavLink>
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  onClick={logout}
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
