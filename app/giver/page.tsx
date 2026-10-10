import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { createOrder } from '@/app/actions';
import { givingOutcomePresentation, type GivingOutcome } from '@/lib/giving-outcomes';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebMoney, localizedWebCategory, webT } from '@/lib/i18n/web';
import { fundingT } from '@/lib/i18n/funding';
import type { CommunityImpactOutcome } from '@/lib/impact-outcomes';
import { communityImpactOutcomeCopy } from '@/lib/impact-outcomes';

export default async function Giver({ searchParams }: { searchParams: Promise<{ fundingError?: string }> }) {
  const [db, locale, query] = await Promise.all([createClient(), getWebLocale(), searchParams]);
  const { data: { user } } = await db.auth.getUser();
  const [{ data: offers }, outcomeResult, communityOutcomeResult] = await Promise.all([
    db.from('offers').select('id,name,description,giver_price_bani,fulfillment_type,partners(name),categories(name,slug)').eq('active', true),
    user ? db.rpc('list_my_giving_outcomes') : Promise.resolve({ data: [], error: null }),
    user ? db.rpc('list_community_impact_outcomes') : Promise.resolve({ data: [], error: null }),
  ]);
  const { data: outcomes, error: outcomesError } = outcomeResult;
  const giving = (outcomes ?? []) as GivingOutcome[];
  const communityOutcome = (communityOutcomeResult.data?.[0] ?? null) as CommunityImpactOutcome | null;
  const communityCopy = communityImpactOutcomeCopy(locale);

  return <main className="shell giver-v1-page py-10">
    {(query.fundingError === 'denied' || query.fundingError === 'unavailable') && <p className="mb-6 rounded-xl bg-rose-50 p-4 font-semibold text-coral" role="alert">{fundingT(locale, query.fundingError)}</p>}
    <section className="max-w-3xl">
      <span className="tag">{webT(locale, 'giver.eyebrow')}</span>
      <h1 className="mt-4 text-5xl font-black">{webT(locale, 'giver.title')}</h1>
      <p className="mt-3 text-lg text-stone-600">{webT(locale, 'giver.intro')}</p>
    </section>

    <section className="mt-10" aria-labelledby="my-giving-title">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="my-giving-title" className="text-3xl font-black">{webT(locale, 'giver.outcomes')}</h2><p className="mt-2 text-stone-600">{webT(locale, 'giver.outcomesHint')}</p></div></div>
      {!user ? <div className="card mt-5"><h3 className="text-xl font-black">{webT(locale, 'giver.signInTitle')}</h3><p className="mt-2 text-stone-600">{webT(locale, 'giver.signInBody')}</p><Link className="btn alt mt-4" href="/login?intent=giver&returnTo=/giver">{webT(locale, 'giver.signIn')}</Link></div> : outcomesError ? <div className="card mt-5"><p className="font-semibold">{webT(locale, 'giver.error')}</p><p className="mt-1 text-sm text-stone-600">{webT(locale, 'giver.retry')}</p></div> : <>
        <article className="card mt-5 md:col-span-2"><h3 className="text-xl font-black">{communityCopy.title}</h3><p className="mt-2 text-stone-600">{communityCopy.hint}</p>{communityOutcome?.outcome_state === 'available' ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-rose-50 p-3"><span className="block text-stone-600">{communityCopy.activities}</span><b className="text-lg">{communityOutcome.completed_impact_activities}</b></p><p className="rounded-xl bg-emerald-50 p-3"><span className="block text-stone-600">{communityCopy.hours}</span><b className="text-lg">{communityOutcome.total_impact_hours}</b></p><p className="rounded-xl bg-sky-50 p-3"><span className="block text-stone-600">{communityCopy.students}</span><b className="text-lg">{communityOutcome.participating_students}</b></p></div> : <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">{communityCopy.hidden}</p>}</article>
        {giving.length === 0 ? <div className="card mt-5 md:col-span-2"><h3 className="text-xl font-black">{webT(locale, 'giver.empty')}</h3><p className="mt-2 text-stone-600">{webT(locale, 'giver.emptyHint')}</p></div> : <div className="mt-5 grid gap-4 md:col-span-2 md:grid-cols-2">{giving.map((outcome) => {
        const presentation = givingOutcomePresentation(outcome, locale);
        return <article className="card" key={outcome.order_item_id}>
          <span className="tag">{webT(locale, outcome.funded_quantity === 1 ? 'giver.fundedOne' : 'giver.fundedMany', { count: outcome.funded_quantity })}</span>
          <h3 className="mt-3 text-2xl font-black">{outcome.offer_title}</h3>
          {presentation.kind === 'available' && presentation.metrics ? <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p className="rounded-xl bg-rose-50 p-3"><span className="block text-stone-600">{webT(locale, 'giver.reserved')}</span><b className="text-lg">{presentation.metrics.reserved}</b></p><p className="rounded-xl bg-emerald-50 p-3"><span className="block text-stone-600">{webT(locale, 'giver.redeemed')}</span><b className="text-lg">{presentation.metrics.redeemed}</b></p><p className="rounded-xl bg-stone-50 p-3"><span className="block text-stone-600">{webT(locale, 'giver.recordedAvailable')}</span><b className="text-lg">{presentation.metrics.recordedUnreserved}</b></p><p className="rounded-xl bg-sky-50 p-3"><span className="block text-stone-600">{webT(locale, 'giver.available')}</span><b className="text-lg">{presentation.metrics.availableNow}</b></p><p className="col-span-2 text-sm text-stone-600">{webT(locale, presentation.metrics.availabilityState === 'available' ? 'giver.availableBody' : 'giver.unavailable')}</p></div> : <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">{presentation.message}</p>}
        </article>;
      })}</div>}
      </>}
    </section>

    <section className="mt-14" aria-labelledby="fund-title">
      <h2 id="fund-title" className="text-3xl font-black">{webT(locale, 'giver.fund')}</h2><p className="mt-2 text-stone-600">{webT(locale, 'giver.fundHint')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">{offers?.map((o: any) => <form className="card" action={createOrder} key={o.id}><input type="hidden" name="offerId" value={o.id}/>{o.categories?.name && <span className="tag">{localizedWebCategory(locale, o.categories.slug, o.categories.name)}</span>}<h3 className="mt-3 text-2xl font-black">{o.name}</h3>{o.partners?.name && <p className="text-stone-600">{o.partners.name}</p>}<p className="mt-4 font-bold">{formatWebMoney(locale, o.giver_price_bani)} / {webT(locale, 'giver.unit')}</p><label>{webT(locale, 'giver.quantity')}</label><select name="quantity" defaultValue="3"><option value="1">1</option><option value="3">3</option><option value="5">5</option><option value="10">10</option></select><button className="btn alt mt-5 w-full">{webT(locale, 'giver.fundButton')}</button></form>)}</div>
    </section>
  </main>;
}
