import { cookies, headers } from "next/headers";

import { MobileAppHandoff } from "@/components/mobile-app-handoff";
import { webLocaleFromAcceptLanguage, webT } from "@/lib/i18n/web";

export default async function Onboarding() {
  const locale = webLocaleFromAcceptLanguage(
    (await headers()).get("accept-language"),
    (await cookies()).get("cinste_web_locale")?.value,
  );
  return <MobileAppHandoff
    title={webT(locale, "home.student")}
    copy={webT(locale, "home.subtitle")}
    openLabel={webT(locale, "home.student")}
    fallback={webT(locale, "home.subtitle")}
  />;
}
