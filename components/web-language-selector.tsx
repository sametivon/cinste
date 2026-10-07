"use client";

import { useRouter } from "next/navigation";
import { webLocaleCookie, type WebLocale } from "@/lib/i18n/web";

const languageNames: Record<WebLocale, string> = { ro: "Română", en: "English", tr: "Türkçe", ar: "العربية" };

export function WebLanguageSelector({ locale }: { locale: WebLocale }) {
  const router = useRouter();
  return <select aria-label="Language" className="bg-transparent text-sm font-bold" value={locale} onChange={(event) => {
    document.cookie = `${webLocaleCookie}=${event.target.value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }}>
    {Object.entries(languageNames).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
  </select>;
}
