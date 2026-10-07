'use client';
import { organizationCopy } from '@/lib/i18n/organization';
import { resolveWebLocale } from '@/lib/i18n/web';

export default function OrganizationError({ reset }: { reset: () => void }) {
  const locale = typeof document === 'undefined' ? 'ro' : resolveWebLocale(document.documentElement.lang);
  const t = organizationCopy(locale);
  return <main className="shell operational-shell organization-v1-page py-10"><div className="card error-state"><h1>{t.unavailable}</h1><p>{t.unavailableBody}</p><button className="btn mt-4" onClick={reset}>{t.tryAgain}</button></div></main>;
}
