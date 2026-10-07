import { getWebLocale } from '@/lib/i18n/server';
import { organizationCopy } from '@/lib/i18n/organization';

export default async function OrganizationLoading() {
  const t = organizationCopy(await getWebLocale());
  return <main className="shell operational-shell organization-v1-page py-10" aria-busy="true"><div className="page-heading"><div><p className="eyebrow">{t.kicker}</p><h1>{t.loading}</h1><p>{t.loadingBody}</p></div></div><div className="section-block stack"><div className="card loading-card"/><div className="card loading-card"/><div className="card loading-card"/></div></main>;
}
