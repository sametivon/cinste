
import { MobileAppHandoff } from "@/components/mobile-app-handoff";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";

export default async function Claim() {
  const locale = await getWebLocale();
  return <MobileAppHandoff
    title={webT(locale, "home.student")}
    copy={webT(locale, "home.subtitle")}
    openLabel={webT(locale, "home.student")}
    fallback={webT(locale, "home.subtitle")}
  />;
}
