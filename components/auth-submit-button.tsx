'use client';

import { useFormStatus } from 'react-dom';
import { webT, type WebLocale } from '@/lib/i18n/web';

export function AuthSubmitButton({ children, locale, variant = 'primary' }: { children: React.ReactNode; locale: WebLocale; variant?: 'primary' | 'secondary' }) {
  const { pending } = useFormStatus();
  return <button className={`auth-submit auth-submit-${variant}`} disabled={pending}>{pending ? webT(locale, 'common.processing') : children}</button>;
}
