import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { completeMockPayment } from '@/app/actions';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebMoney, webT } from '@/lib/i18n/web';
import { pilotStates } from '@/lib/i18n/pilot-states';
import { fundingT } from '@/lib/i18n/funding';

export default async function Checkout({ params, searchParams }: { params: Promise<{ orderId: string }>, searchParams: Promise<{ fundingError?: string, failed?: string }> }) {
  const [db, id, query, locale] = await Promise.all([createClient(), params.then(({ orderId }) => orderId), searchParams, getWebLocale()]);
  const { data: order } = await db.from('giver_orders').select('*,giver_order_items(quantity,unit_price_bani,offers(name))').eq('id', id).maybeSingle();
  if (!order) notFound();
  const copy = pilotStates[locale];
  return <main className="shell max-w-2xl py-12">
    <h1 className="text-4xl font-black">{copy.checkoutTitle}</h1>
    <div className="card mt-6">
      <p className="rounded-xl bg-amber-50 p-4 text-stone-800">{copy.checkoutNote}</p>
      {order.giver_order_items.map((item: any) => <p className="mt-3" key={item.offers.name}><b>{item.quantity}× {item.offers.name}</b> · {formatWebMoney(locale, item.quantity * item.unit_price_bani)}</p>)}
      <p className="mt-5 text-2xl font-black">{webT(locale, 'checkout.total')}: {formatWebMoney(locale, order.total_bani)}</p>
      {query.fundingError === 'unavailable' && <p className="mt-4 text-coral" role="alert">{fundingT(locale, 'unavailable')}</p>}
      {order.status === 'failed' ? <><p className="mt-4 text-coral" role="alert">{copy.checkoutFailed}</p><Link className="btn mt-6" href="/giver">{webT(locale, 'giver.fund')}</Link></> : <div className="mt-6 flex flex-wrap gap-3">
        <form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="true"/><button className="btn">{copy.checkoutConfirm}</button></form>
        <form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="false"/><button className="btn secondary">{copy.checkoutDecline}</button></form>
      </div>}
    </div>
  </main>;
}
