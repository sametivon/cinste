import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getWebLocale } from '@/lib/i18n/server';
import { formatWebMoney, webT } from '@/lib/i18n/web';

export default async function Success({ params }: { params: Promise<{ orderId: string }> }) {
  const [db, locale, { orderId }] = await Promise.all([createClient(), getWebLocale(), params]);
  const { data: order } = await db.from('giver_orders').select('*,giver_order_items(quantity,offers(name,partners(name))),campaigns(quantity_available)').eq('id', orderId).eq('status', 'paid').maybeSingle();
  if (!order) notFound();
  const quantity = order.giver_order_items.reduce((total: number, item: any) => total + item.quantity, 0);
  const available = order.campaigns.reduce((total: number, campaign: any) => total + campaign.quantity_available, 0);
  return <main className="shell max-w-xl py-12"><span className="tag">{webT(locale, 'giver.thanks')}</span><h1 className="mt-4 text-5xl font-black">{webT(locale, 'giver.successTitle')}</h1><div className="card mt-6"><p className="text-xl">{webT(locale, 'giver.successQuantity', { count: quantity })}</p><p className="mt-4">{webT(locale, 'giver.amount')}: <b>{formatWebMoney(locale, order.total_bani)}</b></p><p className="mt-2">{webT(locale, 'giver.availableCount')}: <b>{available}</b></p></div><Link className="btn mt-6" href="/giver">{webT(locale, 'giver.fund')}</Link></main>;
}
