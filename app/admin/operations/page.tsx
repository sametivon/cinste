import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const when = (value: string | null) => value ? new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const money = (bani: number) => new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(bani / 100);

export default async function Operations() {
  const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) redirect('/login');
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single(); if (me?.role !== 'admin') redirect('/');
  const [{ data: claims }, { data: orders }, { data: payments }, { data: redemptions }, { data: partnerAccess }] = await Promise.all([
    db.from('claims').select('id,status,claimed_at,expires_at,redeemed_at,student_id,campaigns(name,offers(name,partners(name)))').order('claimed_at', { ascending: false }).limit(50),
    db.from('giver_orders').select('id,status,total_bani,created_at,paid_at,giver_id,profiles!giver_orders_giver_id_fkey(email),giver_order_items(quantity,unit_price_bani,offers(name)),payments(status,provider,amount_bani,confirmed_at)').order('created_at', { ascending: false }).limit(50),
    db.from('payments').select('id,status,provider,amount_bani,created_at,confirmed_at,order_id,giver_orders(profiles!giver_orders_giver_id_fkey(email))').order('created_at', { ascending: false }).limit(50),
    db.from('redemption_events').select('id,claim_id,partner_id,partner_user_id,redeemed_at,partners(name),claims(status,campaigns(name,offers(name))),profiles!redemption_events_partner_user_id_fkey(email)').order('redeemed_at', { ascending: false }).limit(50),
    db.from('partner_user_access_events').select('id,action,created_at,partners(name),profiles!partner_user_access_events_user_id_fkey(email),actor:profiles!partner_user_access_events_actor_id_fkey(email)').order('created_at', { ascending: false }).limit(50),
  ]);
  return <main className="shell py-10"><div className="flex gap-4"><Link href="/admin" className="font-bold text-forest">← Admin</Link><Link href="/admin/manage" className="font-bold text-forest">Gestionare</Link></div><h1 className="mt-4 text-4xl font-black">Operațiuni</h1><p className="mt-2 text-stone-600">Vizualizări read-only. Codurile QR și secretele de claim nu apar aici.</p>
    <Section title="Claim-uri"><table><thead><tr><th>Student</th><th>Ofertă / campanie</th><th>Status</th><th>Creat</th><th>Expiră</th><th>Folosit</th></tr></thead><tbody>{claims?.map((claim: any) => <tr key={claim.id}><td>{claim.student_id.slice(-8)}</td><td>{claim.campaigns?.offers?.name} · {claim.campaigns?.name}</td><td>{claim.status}</td><td>{when(claim.claimed_at)}</td><td>{when(claim.expires_at)}</td><td>{when(claim.redeemed_at)}</td></tr>)}</tbody></table></Section>
    <Section title="Comenzi giver"><table><thead><tr><th>Giver</th><th>Articole</th><th>Total</th><th>Status</th><th>Creat</th><th>Plătit</th></tr></thead><tbody>{orders?.map((order: any) => <tr key={order.id}><td>{order.profiles?.email ?? order.giver_id.slice(-8)}</td><td>{order.giver_order_items?.map((item: any) => `${item.quantity}× ${item.offers?.name}`).join(', ')}</td><td>{money(order.total_bani)}</td><td>{order.status} / {order.payments?.status ?? '—'}</td><td>{when(order.created_at)}</td><td>{when(order.paid_at)}</td></tr>)}</tbody></table></Section>
    <Section title="Plăți"><table><thead><tr><th>Giver</th><th>Provider</th><th>Sumă</th><th>Status</th><th>Creată</th><th>Confirmată</th></tr></thead><tbody>{payments?.map((payment: any) => <tr key={payment.id}><td>{payment.giver_orders?.profiles?.email ?? payment.order_id.slice(-8)}</td><td>{payment.provider}</td><td>{money(payment.amount_bani)}</td><td>{payment.status}</td><td>{when(payment.created_at)}</td><td>{when(payment.confirmed_at)}</td></tr>)}</tbody></table></Section>
    <Section title="Redemptions"><table><thead><tr><th>Partener</th><th>Ofertă / campanie</th><th>Claim</th><th>Utilizator partener</th><th>Moment</th></tr></thead><tbody>{redemptions?.map((event: any) => <tr key={event.id}><td>{event.partners?.name}</td><td>{event.claims?.campaigns?.offers?.name} · {event.claims?.campaigns?.name}</td><td>{event.claim_id.slice(-8)} · {event.claims?.status}</td><td>{event.profiles?.email ?? '—'}</td><td>{when(event.redeemed_at)}</td></tr>)}</tbody></table></Section>
    <Section title="Acces parteneri"><table><thead><tr><th>Partener</th><th>Utilizator</th><th>Acțiune</th><th>Realizat de</th><th>Moment</th></tr></thead><tbody>{partnerAccess?.map((event: any) => <tr key={event.id}><td>{event.partners?.name}</td><td>{event.profiles?.email}</td><td>{event.action}</td><td>{event.actor?.email ?? '—'}</td><td>{when(event.created_at)}</td></tr>)}</tbody></table></Section>
  </main>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="card mt-8 overflow-x-auto"><h2 className="text-2xl font-black">{title}</h2><div className="mt-4 min-w-[760px]">{children}</div></section>; }
