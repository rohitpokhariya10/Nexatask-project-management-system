import { ArrowLeft, Home, LockKeyhole, MapPinOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/ui';

function SystemPage({
  code,
  title,
  description,
  forbidden = false,
}: {
  code: string;
  title: string;
  description: string;
  forbidden?: boolean;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-12">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 text-accent">
          {forbidden ? <LockKeyhole className="h-7 w-7" /> : <MapPinOff className="h-7 w-7" />}
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-accent">Error {code}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
        <div className="mt-7 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" /> Go back
          </Button>
          <Link to="/dashboard">
            <Button>
              <Home className="h-4 w-4" /> Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <SystemPage
      code="404"
      title="This page took a wrong turn"
      description="The address may be outdated, or the page may have moved. Return to your workspace and continue from there."
    />
  );
}

export function ForbiddenPage() {
  return (
    <SystemPage
      code="403"
      title="This area isn’t available to your role"
      description="Your account is signed in, but it does not have permission to open this page. Server permissions remain the final authority."
      forbidden
    />
  );
}
