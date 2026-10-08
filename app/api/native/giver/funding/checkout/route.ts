import { NextResponse } from 'next/server';
import { allowNativeGiverFunding, authorizeNativeGiver, nativeCheckoutSchema, strictJson } from '@/lib/native-giver-bff';
import { adminDb } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unavailable = (status: number) => NextResponse.json(
  { status: 'unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } },
);

export async function POST(request: Request) {
  const input = await strictJson(request, nativeCheckoutSchema);
  if (!input) return unavailable(400);
  try {
    const giver = await authorizeNativeGiver(request);
    if (!giver) return unavailable(401);
    if (!await allowNativeGiverFunding(giver.id, giver.ip)) return unavailable(429);

    const service = adminDb();
    const { data: orderId, error } = await service.rpc('create_mock_checkout', {
      p_giver_id: giver.id,
      p_offer_id: input.offerId,
      p_quantity: input.quantity,
    });
    if (error || typeof orderId !== 'string') return unavailable(409);
    const { data: order, error: orderError } = await service
      .from('giver_orders')
      .select('id,status,total_bani')
      .eq('id', orderId)
      .eq('giver_id', giver.id)
      .maybeSingle();
    if (orderError || !order || order.status !== 'pending') return unavailable(503);
    return NextResponse.json({
      status: 'pending',
      order: { id: order.id, status: order.status, totalBani: order.total_bani },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return unavailable(503);
  }
}
