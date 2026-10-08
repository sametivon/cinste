import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  strictJson: vi.fn(),
  allowNativeGiverSignup: vi.fn(),
  authorizeNativeGiver: vi.fn(),
  allowNativeGiverFunding: vi.fn(),
  adminDb: vi.fn(),
}));

vi.mock('@/lib/native-giver-bff', () => ({
  strictJson: mocks.strictJson,
  allowNativeGiverSignup: mocks.allowNativeGiverSignup,
  authorizeNativeGiver: mocks.authorizeNativeGiver,
  allowNativeGiverFunding: mocks.allowNativeGiverFunding,
  nativeGiverSignupSchema: {}, nativeCheckoutSchema: {}, nativeConfirmSchema: {},
}));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: mocks.adminDb }));

import { POST as checkout } from '@/app/api/native/giver/funding/checkout/route';
import { POST as confirm } from '@/app/api/native/giver/funding/confirm/route';

const giver = { id: '00000000-0000-4000-8000-000000000123', ip: 'safe-ip' };
const offerId = '00000000-0000-4000-8000-000000000456';
const orderId = '00000000-0000-4000-8000-000000000789';
const request = () => new Request('https://qa.example.com/api/native/giver/funding/checkout', { method: 'POST' });

describe('native Giver funding BFF routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.strictJson.mockResolvedValue({ offerId, quantity: 2 });
    mocks.authorizeNativeGiver.mockResolvedValue(giver);
    mocks.allowNativeGiverFunding.mockResolvedValue(true);
  });

  it('rejects malformed input before bearer verification or any privileged call', async () => {
    mocks.strictJson.mockResolvedValue(null);
    const response = await checkout(request());
    expect(response.status).toBe(400);
    expect(mocks.authorizeNativeGiver).not.toHaveBeenCalled();
    expect(mocks.adminDb).not.toHaveBeenCalled();
  });

  it('rejects an invalid or missing bearer before rate-limit and funding RPC calls', async () => {
    mocks.authorizeNativeGiver.mockResolvedValue(null);
    const response = await checkout(request());
    expect(response.status).toBe(401);
    expect(mocks.allowNativeGiverFunding).not.toHaveBeenCalled();
    expect(mocks.adminDb).not.toHaveBeenCalled();
  });

  it('does not invoke a service funding RPC after rate limiting', async () => {
    mocks.allowNativeGiverFunding.mockResolvedValue(false);
    const response = await checkout(request());
    expect(response.status).toBe(429);
    expect(mocks.adminDb).not.toHaveBeenCalled();
  });

  it('passes only verified identity and validated checkout fields to the service RPC', async () => {
    const maybeSingle = vi.fn(async () => ({ data: { id: orderId, status: 'pending', total_bani: 1234 }, error: null }));
    const service = {
      rpc: vi.fn(async () => ({ data: orderId, error: null })),
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) })),
    };
    mocks.adminDb.mockReturnValue(service);
    const response = await checkout(request());
    expect(response.status).toBe(201);
    expect(service.rpc).toHaveBeenCalledWith('create_mock_checkout', {
      p_giver_id: giver.id, p_offer_id: offerId, p_quantity: 2,
    });
    expect(await response.json()).toEqual({ status: 'pending', order: { id: orderId, status: 'pending', totalBani: 1234 } });
  });

  it('does not call confirmation RPC for a cross-owner order', async () => {
    mocks.strictJson.mockResolvedValue({ orderId, success: true });
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const service = {
      rpc: vi.fn(),
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) })),
    };
    mocks.adminDb.mockReturnValue(service);
    const response = await confirm(request());
    expect(response.status).toBe(404);
    expect(service.rpc).not.toHaveBeenCalled();
  });

  it('returns the safe idempotent status without repeating confirmation', async () => {
    mocks.strictJson.mockResolvedValue({ orderId, success: true });
    const maybeSingle = vi.fn(async () => ({ data: { status: 'paid' }, error: null }));
    const service = {
      rpc: vi.fn(),
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) })),
    };
    mocks.adminDb.mockReturnValue(service);
    const response = await confirm(request());
    expect(await response.json()).toEqual({ status: 'already_paid' });
    expect(service.rpc).not.toHaveBeenCalled();
  });
});
