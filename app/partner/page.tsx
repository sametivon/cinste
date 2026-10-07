import '@fontsource-variable/plus-jakarta-sans/wght.css';
import { createClient } from '@/lib/supabase/server';
import { PartnerRedemption } from '@/components/partner-redemption';
import type { PartnerInspection } from '@/lib/partner-redemption';
import { redirect } from 'next/navigation';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebDate, webT } from '@/lib/i18n/web';

export default async function Partner({ searchParams }: { searchParams: Promise<{ token?: string; result?: string; error?: string }> }) {
  const [q, locale] = await Promise.all([searchParams, getWebLocale()]);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships } = await db.from('partner_users').select('partner_id,partners(name)').eq('user_id', user.id);
  if (!memberships?.length) redirect('/?error=Partner access required');
  let inspected: PartnerInspection | null = null;
  if (q.token) { const { data } = await db.rpc('inspect_redemption', { p_token: q.token }); inspected = data?.[0] ?? null; }
  const { data: history } = await db.from('redemption_events').select('id,claim_id,redeemed_at,claims(status,campaigns(name,offers(name)))').order('redeemed_at', { ascending: false }).limit(5);
  const partnerNames = memberships.map((membership: any) => membership.partners?.name).filter(Boolean).join(' · ');
  return <main className="shell partner-redemption-page">
    <div className="partner-workspace-label"><span>{webT(locale, 'partner.workspace')}</span><strong>{partnerNames || webT(locale, 'partner.authorized')}</strong></div>
    <PartnerRedemption locale={locale} inspected={inspected} token={q.token} result={q.result} error={q.error} />
    <section className="partner-history" aria-labelledby="partner-history-title"><div><span className="partner-kicker">{webT(locale, 'partner.recent')}</span><h2 id="partner-history-title">{webT(locale, 'partner.history')}</h2></div>
      {history?.length ? <div className="partner-history-list">{history.map((event: any) => <div className="partner-history-row" key={event.id}><div><strong>{event.claims?.campaigns?.offers?.name ?? webT(locale, 'common.unavailable')}</strong><span>{event.claims?.campaigns?.name ?? webT(locale, 'common.unavailable')}</span></div><time dateTime={event.redeemed_at}>{formatWebDate(locale, event.redeemed_at)}</time></div>)}</div> : <p className="partner-empty">{webT(locale, 'partner.emptyHistory')}</p>}
    </section>
  </main>;
}
