import { createClient } from '@/lib/supabase/server';
import { redeem } from '@/app/actions';
import { Scanner } from '@/components/scanner';
import { redirect } from 'next/navigation';

const when = (value: string) => new Intl.DateTimeFormat('ro-RO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default async function Partner({ searchParams }: { searchParams: Promise<{ token?: string; result?: string; error?: string }> }) {
  const q = await searchParams; const db = await createClient(); const { data: { user } } = await db.auth.getUser(); if (!user) redirect('/login');
  const { data: memberships } = await db.from('partner_users').select('partner_id').eq('user_id', user.id); if (!memberships?.length) redirect('/?error=Acces rezervat partenerilor');
  let inspected: any = null; if (q.token) { const { data } = await db.rpc('inspect_redemption', { p_token: q.token }); inspected = data?.[0]; }
  const { data: history } = await db.from('redemption_events').select('id,claim_id,redeemed_at,claims(status,campaigns(name,offers(name)))').order('redeemed_at', { ascending: false }).limit(20);
  return <main className="shell max-w-xl py-10"><h1 className="text-4xl font-black">Partener CINSTE</h1><p className="mt-2 text-stone-600">Scanează codul QR sau introdu codul manual.</p><Scanner /><form className="card mt-6" method="get"><label>Cod CINSTE</label><input name="token" defaultValue={q.token} placeholder="Lipește tokenul din QR" required /><button className="btn mt-4">Validează</button></form>{q.result && <div className="card mt-5"><h2 className="text-2xl font-black">{q.result}</h2></div>}{q.error && <p className="mt-4 text-coral">{q.error}</p>}{inspected && <div className="card mt-5"><h2 className="text-3xl font-black">{inspected.state}</h2><p className="mt-2">{inspected.offer_name} · {inspected.partner_name}</p>{inspected.state === 'VALID' && <form action={redeem} className="mt-5"><input type="hidden" name="token" value={q.token} /><button className="btn alt">REDEEM</button></form>}</div>}<section className="card mt-8"><h2 className="text-2xl font-black">Istoric redemptions</h2>{history?.length ? <div className="mt-3 divide-y divide-stone-100">{history.map((event: any) => <div className="py-3" key={event.id}><p className="font-bold">{event.claims?.campaigns?.offers?.name ?? 'Ofertă'}</p><p className="text-sm text-stone-600">{event.claims?.campaigns?.name ?? 'Campanie'} · Claim #{event.claim_id.slice(-6)} · {event.claims?.status}</p><p className="mt-1 text-sm text-stone-600">{when(event.redeemed_at)}</p></div>)}</div> : <p className="mt-3 text-stone-600">Încă nu există redemptions pentru partenerul tău.</p>}</section></main>;
}
