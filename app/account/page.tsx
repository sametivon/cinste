import { redirect } from 'next/navigation';
import Link from 'next/link';
import { availableWorkspaces } from '@/lib/auth-routing';
import { activeOrganizationWorkspaces } from '@/lib/organization-workspace';
import { createClient } from '@/lib/supabase/server';
import { getWebLocale } from '@/lib/i18n/server';
import { pilotStates } from '@/lib/i18n/pilot-states';
import type { AppRole } from '@/lib/types';

export default async function Account() {
  const [db, locale] = await Promise.all([createClient(), getWebLocale()]);
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = profile?.role as AppRole | undefined;
  const organizations = await activeOrganizationWorkspaces(db, user.id, role);
  const workspaces = availableWorkspaces(role, organizations.length > 0, locale);
  const { data: student, error: studentError } = role === 'student'
    ? await db.from('student_profiles').select('verification_status').eq('user_id', user.id).maybeSingle()
    : { data: null, error: null };
  const copy = pilotStates[locale];

  return <main className="shell max-w-4xl py-10 sm:py-16">
    <header className="max-w-2xl">
      <span className="tag">CINSTE</span>
      <h1 className="mt-4 text-4xl font-bold">{copy.accountTitle}</h1>
      <p className="mt-3 text-lg text-stone-700">{copy.accountIntro}</p>
    </header>
    {role === 'student' && !studentError && !student && <p className="mt-8 rounded-xl bg-amber-50 p-4 font-semibold text-stone-800">{copy.studentStatus}</p>}
    <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label={copy.accountTitle}>
      {workspaces.map((workspace) => <Link className="card flex items-center justify-between gap-4 transition-shadow hover:shadow-md" href={workspace.href} key={workspace.workspace}>
        <span><strong className="block text-xl">{workspace.label}</strong><span className="mt-2 block text-sm text-stone-700">{workspace.description}</span></span>
        <span aria-hidden="true">→</span>
      </Link>)}
    </section>
  </main>;
}
