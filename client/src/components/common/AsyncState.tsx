import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react';
import { Button, Card } from './ui';

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status">
      <div className="text-center">
        <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-accent" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-slate-500">{label}…</p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden" aria-label="Loading results" role="status">
      <div className="h-12 animate-pulse border-b border-slate-100 bg-slate-50" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-5 border-b border-slate-100 p-5 last:border-0">
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/5 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card
      className="flex min-h-56 flex-col items-center justify-center p-8 text-center"
      role="alert"
    >
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-base font-bold text-ink">We couldn’t load this view</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry ? (
        <Button className="mt-5" variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry
        </Button>
      ) : null}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden="true" />}
      </span>
      <h2 className="text-base font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
