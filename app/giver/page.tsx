import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { createOrder } from '@/app/actions';
import { givingOutcomePresentation, type GivingOutcome } from '@/lib/giving-outcomes';

export default async function Giver() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const [{ data: offers }, outcomeResult] = await Promise.all([
    db.from('offers').select('id,name,description,giver_price_bani,fulfillment_type,partners(name),categories(name)').eq('active', true),
    user ? db.rpc('list_my_giving_outcomes') : Promise.resolve({ data: [], error: null }),
  ]);
  const { data: outcomes, error: outcomesError } = outcomeResult;
  const giving = (outcomes ?? []) as GivingOutcome[];

  return <main className="shell giver-v1-page py-10">
    <section className="max-w-3xl">
      <span className="tag">MY GIVING</span>
      <h1 className="mt-4 text-5xl font-black">Lucrurile bune merg mai departe.</h1>
      <p className="mt-3 text-lg text-stone-600">Vezi experiențele pe care le-ai făcut posibile, fără a expune detalii despre studenți.</p>
    </section>

    <section className="mt-10" aria-labelledby="my-giving-title">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="my-giving-title" className="text-3xl font-black">Contribuțiile mele</h2><p className="mt-2 text-stone-600">Rezultatele apar numai când pot fi partajate în siguranță.</p></div></div>
      {!user ? <div className="card mt-5"><h3 className="text-xl font-black">Ai mai făcut cinste?</h3><p className="mt-2 text-stone-600">Conectează-te pentru a-ți vedea contribuțiile și rezultatele disponibile în siguranță.</p><Link className="btn alt mt-4" href="/login?intent=giver&returnTo=/giver">CONECTEAZĂ-TE</Link></div> : outcomesError ? <div className="card mt-5"><p className="font-semibold">Contribuțiile tale nu pot fi încărcate acum.</p><p className="mt-1 text-sm text-stone-600">Încearcă din nou în câteva momente.</p></div> : giving.length === 0 ? <div className="card mt-5"><h3 className="text-xl font-black">Încă nu ai făcut cinste.</h3><p className="mt-2 text-stone-600">Alege mai jos o experiență pe care vrei să o faci posibilă.</p></div> : <div className="mt-5 grid gap-4 md:grid-cols-2">{giving.map((outcome) => {
        const presentation = givingOutcomePresentation(outcome);
        return <article className="card" key={outcome.order_item_id}>
          <span className="tag">{outcome.funded_quantity} {outcome.funded_quantity === 1 ? 'experiență finanțată' : 'experiențe finanțate'}</span>
          <h3 className="mt-3 text-2xl font-black">{outcome.offer_title}</h3>
          {presentation.kind === 'available' && presentation.metrics ? <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-rose-50 p-3"><span className="block text-stone-600">Rezervate acum</span><b className="text-lg">{presentation.metrics.reserved}</b></p><p className="rounded-xl bg-emerald-50 p-3"><span className="block text-stone-600">Folosit la partener</span><b className="text-lg">{presentation.metrics.redeemed}</b></p><p className="rounded-xl bg-stone-50 p-3"><span className="block text-stone-600">Înregistrate ca disponibile</span><b className="text-lg">{presentation.metrics.recordedUnreserved}</b></p><p className="rounded-xl bg-sky-50 p-3"><span className="block text-stone-600">Disponibile acum</span><b className="text-lg">{presentation.metrics.availableNow}</b></p><p className="col-span-2 text-sm text-stone-600">{presentation.metrics.availabilityState === 'available' ? 'Experiența este disponibilă pentru a fi revendicată acum.' : 'Experiența nu este disponibilă pentru revendicări acum.'}</p></div> : <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">{presentation.message}</p>}
        </article>;
      })}</div>}
    </section>

    <section className="mt-14" aria-labelledby="fund-title">
      <h2 id="fund-title" className="text-3xl font-black">Mai fă cinste</h2><p className="mt-2 text-stone-600">Alege o experiență. Plata este simulată în acest MVP local.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{offers?.map((o: any) => <form className="card" action={createOrder} key={o.id}><input type="hidden" name="offerId" value={o.id}/>{o.categories?.name && <span className="tag">{o.categories.name}</span>}<h3 className="mt-3 text-2xl font-black">{o.name}</h3>{o.partners?.name && <p className="text-stone-600">{o.partners.name}</p>}<p className="mt-4 font-bold">{(o.giver_price_bani / 100).toFixed(2)} lei / cinste</p><label>Cantitate</label><select name="quantity" defaultValue="3"><option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="10">10</option></select><button className="btn alt mt-5 w-full">FĂ CINSTE</button></form>)}</div>
    </section>
  </main>;
}
