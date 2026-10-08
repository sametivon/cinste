import { NextResponse } from 'next/server';
import { allowNativeGiverFunding, authorizeNativeGiver, nativeConfirmSchema, strictJson } from '@/lib/native-giver-bff';
import { adminDb } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const unavailable = (status: number) => NextResponse.json(
  { status: 'unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } },
);

const currentStatus = (status: string) => status === 'paid' ? 'already_paid'
  : status === 'failed' ? 'already_failed' : null;

export async function POST(request: Request) {
  const input = await strictJson(request, nativeConfirmSchema);
  if (!input) return unavailable(400);
  try {
    const giver = await authorizeNativeGiver(request);
    if (!giver) return unavailable(401);
    if (!await allowNativeGiverFunding(giver.id, giver.ip)) return unavailable(429);

    const service = adminDb();
    const { data: existing, error: existingError } = await service
      .from('giver_orders')
      .select('status')
      .eq('id', input.orderId)
      .eq('giver_id', giver.id)
      .maybeSingle();
    if (existingError || !existing) return unavailable(404);
    const already = currentStatus(existing.status);
    if (already) return NextResponse.json({ status: already }, { headers: { 'Cache-Control': 'no-store' } });
    if (existing.status !== 'pending') return unavailable(409);

    const { data, error } = await service.rpc('confirm_mock_payment', {
      p_giver_id: giver.id,
      p_order_id: input.orderId,
      p_success: input.success,
    });
    if (error || (data !== 'paid' && data !== 'failed')) return unavailable(409);
    return NextResponse.json({ status: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return unavailable(503);
  }
}
