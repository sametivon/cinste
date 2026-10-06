'use client';

import { useFormStatus } from 'react-dom';

export function AuthSubmitButton({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return <button className={`auth-submit auth-submit-${variant}`} disabled={pending}>{pending ? 'Se procesează…' : children}</button>;
}
