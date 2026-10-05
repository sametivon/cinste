import { cookies, headers } from "next/headers";
import { webLocaleFromAcceptLanguage } from "@/lib/i18n/web";
import { Landing } from "@/components/landing/landing";

const appUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || "cinste://";

export default async function Home() {
  const locale = webLocaleFromAcceptLanguage(
    (await headers()).get("accept-language"),
    (await cookies()).get("cinste_web_locale")?.value,
  );
  return <Landing locale={locale} appUrl={appUrl} />;
}
