
import { MobileAppHandoff } from "@/components/mobile-app-handoff";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";

export default async function Onboarding() {
  const locale = await getWebLocale();
  return <MobileAppHandoff
    title={webT(locale, "handoff.title")}
    copy={webT(locale, "handoff.copy")}
    openLabel={webT(locale, "handoff.open")}
    fallback={webT(locale, "handoff.fallback")}
    betaNote={webT(locale, "handoff.beta")}
  />;
}
