
import Link from "next/link";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";

export default async function Onboarding() {
  const locale = await getWebLocale();
  const paths = [
    { title: 'join.studentTitle', copy: 'join.studentCopy', action: 'join.studentAction', href: '/login?intent=student&returnTo=/student' },
    { title: 'join.giverTitle', copy: 'join.giverCopy', action: 'join.giverAction', href: '/login?intent=giver&returnTo=/giver' },
  ] as const;
  const invitations = [
    { title: 'join.partnerTitle', copy: 'join.partnerCopy' },
    { title: 'join.organizationTitle', copy: 'join.organizationCopy' },
  ] as const;
  return <main className="shell auth-page"><section className="auth-intro"><span className="auth-kicker">CINSTE</span><h1>{webT(locale, 'join.title')}</h1><p>{webT(locale, 'join.intro')}</p></section><section className="join-grid" aria-label={webT(locale, 'join.title')}>{paths.map((path) => <article className="join-card" key={path.href}><h2>{webT(locale, path.title)}</h2><p>{webT(locale, path.copy)}</p><Link className="btn mt-5" href={path.href}>{webT(locale, path.action)}</Link></article>)}{invitations.map((invitation) => <article className="join-card join-card-muted" key={invitation.title}><h2>{webT(locale, invitation.title)}</h2><p>{webT(locale, invitation.copy)}</p></article>)}<article className="join-card join-card-muted"><h2>{webT(locale, 'join.adminTitle')}</h2><p>{webT(locale, 'join.adminCopy')}</p><Link className="text-link mt-5" href="/login">{webT(locale, 'join.adminAction')}</Link></article></section></main>;
}
