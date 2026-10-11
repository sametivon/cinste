import { getWebLocale } from "@/lib/i18n/server";
import { Landing } from "@/components/landing/landing";
import Link from "next/link";
import { webT } from "@/lib/i18n/web";

const accessMessage = {
  'Partner access required': { title: 'access.partner.title', copy: 'access.partner.copy' },
  'Admin access required': { title: 'access.admin.title', copy: 'access.admin.copy' },
  'Organization access required': { title: 'access.organization.title', copy: 'access.organization.copy' },
} as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const locale = await getWebLocale();
  const { error } = await searchParams;
  const message = accessMessage[error as keyof typeof accessMessage];
  return <>
    {message && <aside className="shell pt-6" role="alert"><div className="rounded-xl bg-rose-50 p-4 text-stone-800"><strong>{webT(locale, message.title)}</strong><p className="mt-1 text-sm">{webT(locale, message.copy)} <Link className="underline" href="/account">{webT(locale, 'access.account')}</Link></p></div></aside>}
    <Landing locale={locale} />
  </>;
}
