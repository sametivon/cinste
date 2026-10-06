import '@fontsource-variable/plus-jakarta-sans/wght.css';
import { createClient } from '@/lib/supabase/server';
import { PartnerRedemption } from '@/components/partner-redemption';
import type { PartnerInspection } from '@/lib/partner-redemption';
import { redirect } from 'next/navigation';

const when = (value: string) => new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default async function Partner({ searchParams }: { searchParams: Promise<{ token?: string; result?: string; error?: string }> }) {
  const q = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: memberships } = await db.from('partner_users').select('partner_id,partners(name)').eq('user_id', user.id);
  if (!memberships?.length) redirect('/?error=Acces rezervat partenerilor');
  let inspected: PartnerInspection | null = null;
  if (q.token) { const { data } = await db.rpc('inspect_redemption', { p_token: q.token }); inspected = data?.[0] ?? null; }
  const { data: history } = await db.from('redemption_events').select('id,claim_id,redeemed_at,claims(status,campaigns(name,offers(name)))').order('redeemed_at', { ascending: false }).limit(5);
  const partnerNames = memberships.map((membership: any) => membership.partners?.name).filter(Boolean).join(' · ');
  return <main className="shell partner-redemption-page">
    <div className="partner-workspace-label"><span>Partener CINSTE</span><strong>{partnerNames || 'Spațiu autorizat'}</strong></div>
    <PartnerRedemption inspected={inspected} token={q.token} result={q.result} error={q.error} />
    <section className="partner-history" aria-labelledby="partner-history-title"><div><span className="partner-kicker">Activitate recentă</span><h2 id="partner-history-title">Răscumpărări recente</h2></div>
      {history?.length ? <div className="partner-history-list">{history.map((event: any) => <div className="partner-history-row" key={event.id}><div><strong>{event.claims?.campaigns?.offers?.name ?? 'Experiență indisponibilă'}</strong><span>{event.claims?.campaigns?.name ?? 'Campanie indisponibilă'}</span></div><time dateTime={event.redeemed_at}>{when(event.redeemed_at)}</time></div>)}</div> : <p className="partner-empty">Încă nu există răscumpărări recente pentru acest partener.</p>}
    </section>
  </main>;
}
