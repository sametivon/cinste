
import { MobileAppHandoff } from "@/components/mobile-app-handoff";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { pilotStates } from '@/lib/i18n/pilot-states';

export default async function Student() {
  const [locale, db] = await Promise.all([getWebLocale(), createClient()]);
  const { data: { user } } = await db.auth.getUser();
  const { data: profile } = user ? await db.from('profiles').select('role').eq('id', user.id).maybeSingle() : { data: null };
  const { data: student, error } = user && profile?.role === 'student' ? await db.from('student_profiles').select('verification_status').eq('user_id', user.id).maybeSingle() : { data: null, error: null };
  const status = user && profile?.role === 'student' && !error && student?.verification_status !== 'verified' ? student?.verification_status ?? 'unverified' : null;
  const copy = pilotStates[locale];
  const title = status === 'pending' ? copy.studentPendingTitle : status === 'rejected' ? copy.studentRejectedTitle : copy.studentTitle;
  const next = status === 'pending' ? copy.studentPendingNext : status === 'rejected' ? copy.studentRejectedNext : copy.studentNext;
  return <MobileAppHandoff
    title={status ? title : webT(locale, 'handoff.title')}
    copy={status ? copy.studentWhy : webT(locale, 'handoff.copy')}
    nextStep={status ? next : undefined}
    nextLabel={status ? copy.nextLabel : undefined}
    statusLabel={status ? copy.statusLabel : undefined}
    accountLabel={status ? copy.backAccount : undefined}
    openLabel={webT(locale, "handoff.open")}
    fallback={status ? undefined : webT(locale, 'handoff.fallback')}
    betaNote={webT(locale, "handoff.beta")}
    autoOpen={!status}
  />;
}
