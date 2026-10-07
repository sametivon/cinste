import { redirect } from 'next/navigation';
import Link from 'next/link';
import { availableWorkspaces } from '@/lib/auth-routing';
import { activeOrganizationWorkspaces } from '@/lib/organization-workspace';
import { createClient } from '@/lib/supabase/server';
import { getWebLocale } from '@/lib/i18n/server';
import type { AppRole } from '@/lib/types';

const copy = { ro: ['Alege spațiul de lucru', 'Contul tău are acces la mai multe spații CINSTE. Alege unde vrei să continui.'], en: ['Choose a workspace', 'Your account has access to multiple CINSTE workspaces. Choose where to continue.'], tr: ['Çalışma alanı seçin', 'Hesabınızın birden fazla CINSTE çalışma alanına erişimi var. Devam etmek istediğiniz alanı seçin.'], ar: ['اختر مساحة عمل', 'لحسابك صلاحية الوصول إلى عدة مساحات عمل في CINSTE. اختر المكان الذي تريد المتابعة فيه.'] } as const;
export default async function Account() { const [db, locale] = await Promise.all([createClient(), getWebLocale()]); const { data: { user } } = await db.auth.getUser(); if (!user) redirect('/login'); const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle(); const role = profile?.role as AppRole | undefined; const organizations = await activeOrganizationWorkspaces(db, user.id, role); const workspaces = availableWorkspaces(role, organizations.length > 0, locale); if (workspaces.length === 1) redirect(workspaces[0].href); return <main className="shell auth-page"><section className="auth-intro"><span className="auth-kicker">CINSTE</span><h1>{copy[locale][0]}</h1><p>{copy[locale][1]}</p></section><div className="workspace-grid">{workspaces.map((workspace) => <Link className="workspace-card" href={workspace.href} key={workspace.workspace}><div><h2>{workspace.label}</h2><p>{workspace.description}</p></div><span aria-hidden="true">→</span></Link>)}</div></main>; }
