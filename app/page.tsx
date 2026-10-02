import Link from "next/link";
import { cookies, headers } from "next/headers";

import { webLocaleFromAcceptLanguage, webT } from "@/lib/i18n/web";

const appUrl = process.env.NEXT_PUBLIC_STUDENT_APP_URL || "cinste://";

export default async function Home() {
  const locale = webLocaleFromAcceptLanguage(
    (await headers()).get("accept-language"),
    (await cookies()).get("cinste_web_locale")?.value,
  );
  return <main className="shell">
    <section className="max-w-2xl py-16 md:py-24">
      <span className="tag">{webT(locale, "home.tagline")}</span>
      <h1 className="mt-4 text-5xl font-black leading-none md:text-7xl">{webT(locale, "home.title")}</h1>
      <p className="mt-5 max-w-xl text-lg text-stone-600">{webT(locale, "home.subtitle")}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn" href={appUrl}>{webT(locale, "home.student")}</a>
        <Link className="btn alt" href="/giver">{webT(locale, "nav.give")}</Link>
      </div>
    </section>
  </main>;
}
