import { getWebLocale } from "@/lib/i18n/server";
import { Landing } from "@/components/landing/landing";

export default async function Home() {
  const locale = await getWebLocale();
  return <Landing locale={locale} />;
}
