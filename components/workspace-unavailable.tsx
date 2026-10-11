import Link from 'next/link';
import { pilotStates } from '@/lib/i18n/pilot-states';
import { webT, type WebLocale } from '@/lib/i18n/web';

type Workspace = 'organization' | 'partner' | 'admin';

export function WorkspaceUnavailable({ workspace, locale }: { workspace: Workspace; locale: WebLocale }) {
  const copy = pilotStates[locale];
  return <main className="shell max-w-3xl py-12 sm:py-20">
    <section className="card border-rose-100 p-6 sm:p-10" aria-labelledby="workspace-unavailable-title">
      <span className="tag">{copy.unavailableLabel}</span>
      <h1 id="workspace-unavailable-title" className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">{webT(locale, `access.${workspace}.title`)}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-stone-700">{webT(locale, `access.${workspace}.copy`)}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn" href="/account">{copy.backAccount}</Link>
        <Link className="btn secondary" href="/">{copy.goHome}</Link>
      </div>
    </section>
  </main>;
}
