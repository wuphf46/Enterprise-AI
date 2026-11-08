import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock3, Loader2, X } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';

type Approval = { id: string; requester: string; question: string; status: string; created_at: string };

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const approvals = useQuery({ queryKey: ['approvals'], queryFn: async () => (await api.get<{ approvals: Approval[] }>('/api/approvals')).data.approvals });
  const decision = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => api.post(`/api/approvals/${id}/decision`, { approve }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approvals'] }),
  });

  return (
    <section className="animate-fade-in space-y-8">
      <header><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Governance</p><h1 className="text-3xl font-semibold tracking-tight">Approvals</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Review sensitive requests before they can be acted on.</p></header>
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        {approvals.isLoading && <p className="text-sm text-muted-foreground">Loading approvals...</p>}
        {approvals.isError && <p className="text-sm text-red-300">Unable to load approvals. Administrator access may be required.</p>}
        <div className="space-y-3">
          {approvals.data?.map((approval) => <div className="rounded-xl border border-border bg-background/50 p-4" key={approval.id}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="rounded-lg bg-amber-400/10 p-2 text-amber-300"><Clock3 size={18} /></div><div><p className="text-sm font-medium">{approval.question}</p><p className="mt-1 text-xs text-muted-foreground">Requested by {approval.requester} · {approval.status}</p></div></div>{approval.status === 'pending' && <div className="flex gap-2"><Button disabled={decision.isPending} size="sm" variant="outline" onClick={() => decision.mutate({ id: approval.id, approve: false })}><X className="mr-1.5" size={14} /> Reject</Button><Button disabled={decision.isPending} size="sm" onClick={() => decision.mutate({ id: approval.id, approve: true })}>{decision.isPending ? <Loader2 className="animate-spin" size={14} /> : <Check className="mr-1.5" size={14} />} Approve</Button></div>}</div></div>)}
          {!approvals.isLoading && !approvals.data?.length && <div className="py-16 text-center"><Check className="mx-auto mb-3 text-emerald-300" size={26} /><p className="text-sm font-medium">No approval requests</p><p className="mt-1 text-sm text-muted-foreground">Everything is up to date.</p></div>}
        </div>
      </div>
    </section>
  );
}
