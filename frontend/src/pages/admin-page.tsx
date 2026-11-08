import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Activity, FileCheck2, HeartPulse, ThumbsUp } from 'lucide-react';
import { api } from '../lib/api';

type CountRow = { status?: string; rating?: number; total: number };
type Metrics = { documents: CountRow[]; feedback: CountRow[] };
type Guardrails = { events: { action: string; total: number }[]; mode: string; managed_bedrock_guardrails: boolean };
type Health = { status: string };

function useAdminData() {
  const metrics = useQuery({ queryKey: ['admin-metrics'], queryFn: async () => (await api.get<Metrics>('/api/admin/metrics')).data });
  const guardrails = useQuery({ queryKey: ['admin-guardrails'], queryFn: async () => (await api.get<Guardrails>('/api/admin/guardrails')).data });
  const live = useQuery({ queryKey: ['health-live'], queryFn: async () => (await api.get<Health>('/health/live')).data });
  const ready = useQuery({ queryKey: ['health-ready'], queryFn: async () => (await api.get<Health>('/health/ready')).data });
  return { metrics, guardrails, live, ready };
}

export function AdminPage() {
  const { metrics, guardrails, live, ready } = useAdminData();
  const documents = metrics.data?.documents.reduce((total, row) => total + row.total, 0) ?? 0;
  const feedback = metrics.data?.feedback.reduce((total, row) => total + row.total, 0) ?? 0;
  const healthReady = ready.data?.status === 'ready';

  return (
    <section className="animate-fade-in space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Operations</p>
        <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">A compact view of workspace activity, service health, and guardrail events.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FileCheck2} label="Documents" value={documents} />
        <MetricCard icon={ThumbsUp} label="Feedback entries" value={feedback} />
        <MetricCard icon={Activity} label="Live service" value={live.data?.status ?? 'unknown'} tone={live.data?.status === 'alive' ? 'good' : 'neutral'} />
        <MetricCard icon={HeartPulse} label="Database readiness" value={ready.isLoading ? 'checking' : healthReady ? 'ready' : 'unavailable'} tone={healthReady ? 'good' : 'neutral'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MetricPanel title="Document status">
          {metrics.isLoading && <LoadingText />}
          {metrics.isError && <ErrorText />}
          {metrics.data?.documents.map((row) => <Row key={row.status} label={row.status ?? 'unknown'} value={row.total} />)}
          {!metrics.isLoading && !metrics.data?.documents.length && <EmptyText text="No document activity yet." />}
        </MetricPanel>
        <MetricPanel title="Guardrail events">
          {guardrails.isLoading && <LoadingText />}
          {guardrails.isError && <ErrorText />}
          {guardrails.data?.events.map((row) => <Row key={row.action} label={row.action.replaceAll('_', ' ')} value={row.total} />)}
          {!guardrails.isLoading && !guardrails.data?.events.length && <EmptyText text="No guardrail events recorded." />}
          {guardrails.data && <p className="mt-4 text-xs text-muted-foreground">Mode: {guardrails.data.mode}</p>}
        </MetricPanel>
      </div>
    </section>
  );
}

function MetricCard({ icon: Icon, label, value, tone = 'neutral' }: { icon: typeof Activity; label: string; value: number | string; tone?: 'good' | 'neutral' }) {
  return <div className="rounded-xl border border-border bg-card p-5"><div className="mb-4 flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className={tone === 'good' ? 'text-emerald-300' : 'text-muted-foreground'} size={18} /></div><p className="text-2xl font-semibold capitalize">{value}</p></div>;
}

function MetricPanel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5"><h2 className="mb-5 font-semibold">{title}</h2><div className="space-y-3">{children}</div></div>;
}

function Row({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm"><span className="capitalize text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function LoadingText() { return <p className="text-sm text-muted-foreground">Loading...</p>; }
function ErrorText() { return <p className="text-sm text-red-300">Unable to load this section.</p>; }
function EmptyText({ text }: { text: string }) { return <p className="text-sm text-muted-foreground">{text}</p>; }
