import type { ReactNode } from 'react';
import { CheckCircle2, Layers3, ShieldCheck } from 'lucide-react';

const benefits = [
  { icon: Layers3, text: 'Projects, tasks and deadlines in one place' },
  { icon: ShieldCheck, text: 'Clear access for every team role' },
  { icon: CheckCircle2, text: 'Progress that stays visible and actionable' },
];

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.02fr_.98fr]">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div
          className="absolute -right-32 -top-28 h-96 w-96 rounded-full border-[64px] border-blue-400/10"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-36 left-16 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex items-center gap-3">
          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-white font-extrabold text-navy">
            N
            <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
              CountryEdu
            </p>
            <p className="text-lg font-bold">NexaTask</p>
          </div>
        </div>
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
            Work moves forward here
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Turn shared goals into clear, accountable progress.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            A focused workspace for CountryEdu teams to plan projects, coordinate ownership and
            deliver on time.
          </p>
          <div className="mt-10 space-y-4">
            {benefits.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-200">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10">
                  <Icon className="h-4 w-4 text-blue-300" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-slate-500">CountryEdu · Purposeful collaboration</p>
      </section>
      <section className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-navy font-extrabold text-white">
              N
              <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-blue-400 ring-2 ring-navy" />
            </span>
            <p className="font-bold text-ink">CountryEdu NexaTask</p>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Welcome</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
