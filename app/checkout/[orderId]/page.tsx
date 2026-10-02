import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { completeMockPayment } from '@/app/actions';

export default async function Checkout({ params, searchParams }: { params: Promise<{ orderId: string }>, searchParams: Promise<{ error?: string, failed?: string }> }) {
  const db = await createClient(); const id = (await params).orderId;
  const { data: order } = await db.from('giver_orders').select('*,giver_order_items(quantity,unit_price_bani,offers(name))').eq('id', id).maybeSingle(); if (!order) notFound(); const query = await searchParams;
  return <main className="shell max-w-xl py-12"><h1 className="text-4xl font-black">Plată de dezvoltare</h1><div className="card mt-6"><p className="text-stone-600">MockPaymentProvider · fără bani reali</p>{order.giver_order_items.map((item: any) => <p className="mt-3" key={item.offers.name}><b>{item.quantity}× {item.offers.name}</b> · {(item.quantity * item.unit_price_bani / 100).toFixed(2)} lei</p>)}<p className="mt-5 text-2xl font-black">Total: {(order.total_bani / 100).toFixed(2)} lei</p>{query.error && <p className="text-coral">{query.error}</p>}{query.failed && <p className="mt-4 text-coral">Plata simulată a eșuat. Inventarul nu a fost creat.</p>}<div className="mt-6 flex gap-3"><form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="true"/><button className="btn">Simulează plată reușită</button></form><form action={completeMockPayment}><input type="hidden" name="orderId" value={id}/><input type="hidden" name="success" value="false"/><button className="btn alt">Simulează eșec</button></form></div></div></main>;
}
