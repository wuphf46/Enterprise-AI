import { type ReactNode, useEffect } from 'react';
import { Button } from './button';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button aria-label="Close dialog" className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onCancel} />
      <div
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="animate-fade-in relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        role="dialog"
      >
        <h2 className="text-lg font-semibold" id="confirm-dialog-title">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button disabled={pending} variant="outline" onClick={onCancel}>{cancelLabel}</Button>
          <Button className="bg-red-500 text-white hover:bg-red-500/90" disabled={pending} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
