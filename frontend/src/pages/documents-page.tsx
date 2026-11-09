import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileText, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { useAuthStore } from '../store/auth-store';

type DocumentRecord = {
  id: string;
  title: string;
  status: string;
  current_version: number;
  created_at: string;
};

async function uploadDocument(file: File) {
  const { data } = await api.post<{ document_id: string; upload_url: string; headers: Record<string, string> }>(
    '/api/documents/uploads',
    { filename: file.name },
  );
  const upload = await fetch(data.upload_url, { method: 'PUT', headers: data.headers, body: file });
  if (!upload.ok) throw new Error(`Upload to storage failed (${upload.status}).`);
  await api.post('/api/documents/complete', { document_id: data.document_id });
}

export function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocumentRecord | null>(null);
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((state) => state.user?.role === 'admin');
  const documents = useQuery({
    queryKey: ['documents'],
    queryFn: async () => (await api.get<{ documents: DocumentRecord[] }>('/api/documents')).data.documents,
  });
  const remove = useMutation({
    mutationFn: (documentId: string) => api.delete(`/api/documents/${documentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
  const upload = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file first.');
      return uploadDocument(file);
    },
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  function confirmDelete() {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
  }

  return (
    <section className="animate-fade-in space-y-8">
      <header>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Knowledge base</p>
        <h1 className="text-3xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Upload source material and make it available to your workspace assistant.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.3fr]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><UploadCloud size={20} /></div>
            <div><h2 className="font-semibold">Upload a document</h2><p className="text-xs text-muted-foreground">PDF, DOCX, TXT, or MD</p></div>
          </div>
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-5 text-center transition hover:border-primary/60">
            <FileText className="mb-3 text-muted-foreground" size={25} />
            <span className="text-sm font-medium">{file ? file.name : 'Choose a file from your device'}</span>
            <span className="mt-1 text-xs text-muted-foreground">Maximum upload size is configured by the backend</span>
            <input className="sr-only" type="file" accept=".pdf,.docx,.txt,.md" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          {upload.isError && <p className="mt-3 text-sm text-red-300">{upload.error instanceof Error ? upload.error.message : 'Upload failed.'}</p>}
          {upload.isSuccess && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={16} /> Document uploaded successfully.</p>}
          <Button className="mt-5 w-full" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? <><Loader2 className="mr-2 animate-spin" size={16} /> Uploading...</> : 'Upload document'}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Recent documents</h2><span className="text-xs text-muted-foreground">{documents.data?.length ?? 0} files</span></div>
          {documents.isLoading && <p className="text-sm text-muted-foreground">Loading documents...</p>}
          {documents.isError && <p className="text-sm text-red-300">Unable to load documents.</p>}
          <div className="space-y-2">
            {documents.data?.map((document) => (
              <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3" key={document.id}>
                <div className="flex min-w-0 items-center gap-3"><FileText className="shrink-0 text-muted-foreground" size={18} /><div className="min-w-0"><p className="truncate text-sm font-medium">{document.title}</p><p className="text-xs text-muted-foreground">Version {document.current_version}</p></div></div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs capitalize text-emerald-300">{document.status}</span>
                  {isAdmin && (
                    <Button
                       aria-label={`Delete ${document.title}`}
                       className="h-8 w-8 text-muted-foreground hover:text-red-300"
                       disabled={remove.isPending}
                       size="icon"
                       variant="ghost"
                       onClick={() => setPendingDelete(document)}
                     >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!documents.isLoading && !documents.data?.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>}
            {remove.isError && <p className="text-sm text-red-300">{remove.error instanceof Error ? remove.error.message : 'Unable to delete document.'}</p>}
          </div>
        </div>
      </div>

      <ConfirmDialog
        cancelLabel="Cancel"
        confirmLabel={remove.isPending ? 'Deleting...' : 'Delete'}
        description={pendingDelete ? `Delete "${pendingDelete.title}"? This removes it from the knowledge base and cannot be undone.` : ''}
        open={pendingDelete !== null}
        pending={remove.isPending}
        title="Delete document"
        onCancel={() => { if (!remove.isPending) setPendingDelete(null); }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
