import '@fontsource-variable/plus-jakarta-sans/wght.css';
import { createClient } from '@/lib/supabase/server';
import { PartnerRedemption } from '@/components/partner-redemption';
import type { PartnerInspection } from '@/lib/partner-redemption';
import { redirect } from 'next/navigation';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebDate, webT } from '@/lib/i18n/web';
import { partnerOfferCopies } from '@/lib/i18n/partner-offers';
import { savePartnerOfferDraft } from './actions';

export default async function Partner({ searchParams }: { searchParams: Promise<{ token?: string; result?: string; error?: string }> }) {
  const [q, locale] = await Promise.all([searchParams, getWebLocale()]);
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships } = await db.from('partner_users').select('partner_id,partners(name)').eq('user_id', user.id);
  if (!memberships?.length) redirect('/?error=Partner access required');
  let inspected: PartnerInspection | null = null;
  if (q.token) { const { data } = await db.rpc('inspect_redemption', { p_token: q.token }); inspected = data?.[0] ?? null; }
  const [{ data: history }, { data: categories }, { data: drafts }] = await Promise.all([
    db.from('redemption_events').select('id,claim_id,redeemed_at,claims(status,campaigns(name,offers(name)))').order('redeemed_at', { ascending: false }).limit(5),
    db.from('categories').select('id,name').eq('active', true).order('sort_order'),
    db.from('partner_offer_drafts').select('id,name,status,review_note,created_at,partners(name)').order('updated_at', { ascending: false }),
  ]);
  const copy = partnerOfferCopies[locale];
  const partnerNames = memberships.map((membership: any) => membership.partners?.name).filter(Boolean).join(' · ');
  return <main className="shell partner-redemption-page">
    <div className="partner-workspace-label"><span>{webT(locale, 'partner.workspace')}</span><strong>{partnerNames || webT(locale, 'partner.authorized')}</strong></div>
    <PartnerRedemption locale={locale} inspected={inspected} token={q.token} result={q.result} error={q.error} />
    <section className="partner-history" aria-labelledby="partner-history-title"><div><span className="partner-kicker">{webT(locale, 'partner.recent')}</span><h2 id="partner-history-title">{webT(locale, 'partner.history')}</h2></div>
      {history?.length ? <div className="partner-history-list">{history.map((event: any) => <div className="partner-history-row" key={event.id}><div><strong>{event.claims?.campaigns?.offers?.name ?? webT(locale, 'common.unavailable')}</strong><span>{event.claims?.campaigns?.name ?? webT(locale, 'common.unavailable')}</span></div><time dateTime={event.redeemed_at}>{formatWebDate(locale, event.redeemed_at)}</time></div>)}</div> : <p className="partner-empty">{webT(locale, 'partner.emptyHistory')}</p>}
    </section>
    <section className="partner-history" id="offer-drafts" aria-labelledby="partner-offer-drafts-title"><div><span className="partner-kicker">CINSTE</span><h2 id="partner-offer-drafts-title">{copy.drafts}</h2><p className="partner-empty">{copy.hint}</p></div><form action={savePartnerOfferDraft} className="partner-manual-form"><label>{copy.partner}<select name="partnerId" required>{memberships.map((membership: any) => <option key={membership.partner_id} value={membership.partner_id}>{membership.partners?.name ?? membership.partner_id}</option>)}</select></label><label>{copy.category}<select name="categoryId" required>{categories?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>{copy.name}<input name="name" minLength={2} maxLength={160} required/></label><label>{copy.description}<textarea name="description" minLength={2} maxLength={2000} required/></label><label>{copy.fulfillment}<select name="fulfillment" defaultValue="instant"><option value="instant">Instant</option><option value="appointment_required">Appointment required</option><option value="scheduled_event">Scheduled event</option></select></label><label>{copy.instructions}<textarea name="instructions" maxLength={1000}/></label><label>{copy.booking}<input name="bookingUrl" type="url"/></label><button className="partner-primary" type="submit">{copy.submit}</button></form>{drafts?.length ? <div className="partner-history-list">{drafts.map((draft: any) => <div className="partner-history-row" key={draft.id}><div><strong>{draft.name}</strong><span>{draft.partners?.name} · {draft.status}{draft.review_note ? ` · ${draft.review_note}` : ''}</span></div><time dateTime={draft.created_at}>{formatWebDate(locale, draft.created_at)}</time></div>)}</div> : <p className="partner-empty">{copy.empty}</p>}</section>
  </main>;
}
