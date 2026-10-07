import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { completeMockPayment } from '@/app/actions';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebMoney, webT } from '@/lib/i18n/web';
import { fundingT } from '@/lib/i18n/funding';

export default async function Checkout({ params, searchParams }: { params: Promise<{ orderId: string }>, searchParams: Promise<{ fundingError?: string, failed?: string }> }) {
  const [db, id, query, locale] = await Promise.all([createClient(), params.then(({ orderId }) => orderId), searchParams, getWebLocale()]);
  const { data: order } = await db.from('giver_orders').select('*,giver_order_items(quantity,unit_price_bani,offers(name))').eq('id', id).maybeSingle();
  if (!order) notFound();
  return <main className="shell max-w-xl py-12"><h1 className="text-4xl font-black">{webT(locale, 'checkout.title')}</h1><div className="card mt-6"><p className="text-stone-600">{webT(locale, 'checkout.mock')}</p>{order.giver_order_items.map((item: any) => <p className="mt-3" key={item.offers.name}><b>{item.quantity}× {item.offers.name}</b> · {formatWebMoney(locale, item.quantity * item.unit_price_bani)}</p>)}<p className="mt-5 text-2xl font-black">{webT(locale, 'checkout.total')}: {formatWebMoney(locale, order.total_bani)}</p>{query.fundingError === 'unavailable' && <p className="text-coral" role="alert">{fundingT(locale, 'unavailable')}</p>}{query.failed && <p className="mt-4 text-coral">{webT(locale, 'checkout.failure')}</p>}<div className="mt-6 flex gap-3"><form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="true"/><button className="btn">{webT(locale, 'checkout.success')}</button></form><form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="false"/><button className="btn alt">{webT(locale, 'checkout.failure')}</button></form></div></div></main>;
}
