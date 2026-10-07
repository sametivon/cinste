'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { initialOperationalActionState, type OperationalAction } from '@/lib/operational-action';
import { resolveWebLocale, webT } from '@/lib/i18n/web';

export function OperationalForm({ action, children, className, confirmation }: { action: OperationalAction; children: ReactNode; className?: string; confirmation?: string }) {
  const [state, formAction] = useActionState(action, initialOperationalActionState);
  const router = useRouter();
  useEffect(() => {
    if (!state.ok) return;
    const refresh = window.setTimeout(() => router.refresh(), 3500);
    return () => window.clearTimeout(refresh);
  }, [router, state.ok, state.message]);
  return <form action={formAction} className={className} onSubmit={(event) => { if (confirmation && !window.confirm(confirmation)) event.preventDefault(); }}>
    {children}
    {state.message && <p className={state.ok ? 'form-note success' : 'form-note error'} role="status" aria-live="polite">{state.message}</p>}
  </form>;
}

export function SubmitButton({ children, className = 'btn', pendingLabel }: { children: ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  const label = pendingLabel ?? (typeof document === 'undefined' ? 'Working…' : webT(resolveWebLocale(document.documentElement.lang), 'common.working'));
  return <button className={className} disabled={pending}>{pending ? label : children}</button>;
}
