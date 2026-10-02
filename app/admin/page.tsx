import { createClient } from '@/lib/supabase/server';
import { reviewVerification } from './actions';
import { redirect } from 'next/navigation';

export default async function Admin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') redirect('/?error=Acces rezervat administratorilor');
  const [{ count: students }, { count: partners }, { count: offers }, { count: campaigns }, { count: claims }, { count: redeemed }, { count: orders }, { data: pending }] = await Promise.all([
    db.from('student_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    db.from('partners').select('*', { count: 'exact', head: true }), db.from('offers').select('*', { count: 'exact', head: true }).eq('active', true),
    db.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'active'), db.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('claims').select('*', { count: 'exact', head: true }).eq('status', 'redeemed'), db.from('giver_orders').select('*', { count: 'exact', head: true }),
    db.from('student_verifications').select('id,full_name,status,submitted_at,universities(name)').eq('status', 'pending').order('submitted_at'),
  ]);
  const cards = [['Studenți verificați', students], ['Parteneri', partners], ['Oferte active', offers], ['Campanii active', campaigns], ['Claim-uri active', claims], ['Cinsti finalizate', redeemed], ['Comenzi giver', orders]];
  return <main className="shell py-10"><h1 className="text-4xl font-black">Admin CINSTE</h1><div className="mt-4 flex gap-4"><a href="/admin/manage" className="font-bold text-forest">Gestionare</a><a href="/admin/operations" className="font-bold text-forest">Operațiuni</a></div><div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">{cards.map(([name, value]) => <div className="card" key={name as string}><p className="text-sm text-stone-600">{name}</p><p className="text-3xl font-black">{value}</p></div>)}</div><h2 className="mt-10 text-2xl font-black">Verificări în așteptare</h2>{pending?.map((verification: any) => <div className="card mt-3" key={verification.id}><b>{verification.full_name}</b> · {verification.universities?.name}<div className="mt-3"><a className="font-bold text-forest underline" href={`/api/admin/verifications/${verification.id}/document`} target="_blank" rel="noreferrer">Vezi documentul</a></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><form action={reviewVerification}><input type="hidden" name="id" value={verification.id}/><input type="hidden" name="decision" value="verified"/><button className="btn">Aprobă</button></form><form action={reviewVerification} className="flex flex-col gap-2 sm:flex-row"><input type="hidden" name="id" value={verification.id}/><input type="hidden" name="decision" value="rejected"/><input className="rounded border border-stone-300 px-3 py-2" name="rejectionReason" required minLength={3} maxLength={500} placeholder="Motiv pentru student"/><button className="btn alt">Respinge</button></form></div></div>)}</main>;
}
