import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn, initials } from '../../lib/utils';
import type { ProjectStatus, Role, TaskPriority, TaskStatus } from '../../types/api';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', loading = false, disabled, children, ...props },
  ref,
) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-100',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface', className)} {...props} />;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Avatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' };
  if (imageUrl) {
    return <img className={cn('rounded-xl object-cover', sizes[size])} src={imageUrl} alt="" />;
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-blue-700',
        sizes[size],
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

type BadgeKind =
  | ProjectStatus
  | TaskStatus
  | TaskPriority
  | Role
  | 'ACTIVE_USER'
  | 'INACTIVE_USER'
  | 'PROJECT'
  | 'TASK';

export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  const styles: Record<BadgeKind, string> = {
    PLANNING: 'bg-violet-50 text-violet-700 ring-violet-200',
    ACTIVE: 'bg-blue-50 text-blue-700 ring-blue-200',
    ON_HOLD: 'bg-amber-50 text-amber-700 ring-amber-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    TODO: 'bg-slate-100 text-slate-700 ring-slate-200',
    IN_PROGRESS: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
    MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
    HIGH: 'bg-red-50 text-red-700 ring-red-200',
    ADMIN: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    PROJECT_MANAGER: 'bg-blue-50 text-blue-700 ring-blue-200',
    TEAM_MEMBER: 'bg-slate-100 text-slate-700 ring-slate-200',
    ACTIVE_USER: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    INACTIVE_USER: 'bg-slate-100 text-slate-500 ring-slate-200',
    PROJECT: 'bg-violet-50 text-violet-700 ring-violet-200',
    TASK: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        styles[kind],
      )}
    >
      {children}
    </span>
  );
}

export function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}

export function RequiredMark() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {' '}
      *
    </span>
  );
}
