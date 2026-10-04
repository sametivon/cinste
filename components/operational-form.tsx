'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { initialOperationalActionState, type OperationalAction } from '@/lib/operational-action';

export function OperationalForm({ action, children, className, confirmation }: { action: OperationalAction; children: ReactNode; className?: string; confirmation?: string }) {
  const [state, formAction] = useActionState(action, initialOperationalActionState);
  return <form action={formAction} className={className} onSubmit={(event) => { if (confirmation && !window.confirm(confirmation)) event.preventDefault(); }}>
    {children}
    {state.message && <p className={state.ok ? 'form-note success' : 'form-note error'} role="status" aria-live="polite">{state.message}</p>}
  </form>;
}

export function SubmitButton({ children, className = 'btn' }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? 'Working…' : children}</button>;
}
