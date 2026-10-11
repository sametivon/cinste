
import { MobileAppHandoff } from "@/components/mobile-app-handoff";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function Student() {
  const [locale, db] = await Promise.all([getWebLocale(), createClient()]);
  const { data: { user } } = await db.auth.getUser();
  const { data: student } = user ? await db.from('student_profiles').select('verification_status').eq('user_id', user.id).maybeSingle() : { data: null };
  const unverified = Boolean(user) && !student;
  return <MobileAppHandoff
    title={webT(locale, unverified ? "handoff.unverifiedTitle" : "handoff.title")}
    copy={webT(locale, unverified ? "handoff.unverifiedCopy" : "handoff.copy")}
    nextStep={unverified ? webT(locale, "handoff.unverifiedNext") : undefined}
    openLabel={webT(locale, "handoff.open")}
    fallback={webT(locale, "handoff.fallback")}
    betaNote={webT(locale, "handoff.beta")}
  />;
}
