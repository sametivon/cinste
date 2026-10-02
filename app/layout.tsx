import "./globals.css";
import Link from "next/link";
import { cookies, headers } from "next/headers";

import { logout } from "@/app/actions";
import { WebLanguageSelector } from "@/components/web-language-selector";
import { webLocaleFromAcceptLanguage, webT } from "@/lib/i18n/web";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "CINSTE", description: "Fă cinste unui student." };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const locale = webLocaleFromAcceptLanguage(
    (await headers()).get("accept-language"),
    (await cookies()).get("cinste_web_locale")?.value,
  );
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();

  return <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
    <body>
      <header className="border-b border-stone-200 bg-cream">
        <div className="shell flex items-center justify-between py-4">
          <Link href="/" className="text-2xl font-black tracking-tight">CINSTE<span className="text-coral">.</span></Link>
          <nav className="flex items-center gap-4 text-sm font-bold">
            <Link href="/">{webT(locale, "nav.discover")}</Link>
            <Link href="/giver">{webT(locale, "nav.give")}</Link>
            <WebLanguageSelector locale={locale} />
            {user ? <>
              <Link href="/account">{webT(locale, "nav.account")}</Link>
              <form action={logout}><button className="underline">{webT(locale, "nav.logout")}</button></form>
            </> : <Link href="/login">{webT(locale, "nav.login")}</Link>}
          </nav>
        </div>
      </header>
      {children}
    </body>
  </html>;
}
