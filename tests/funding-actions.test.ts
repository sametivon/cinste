import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  createClient: vi.fn(),
  adminDb: vi.fn(),
  getWebLocale: vi.fn(async () => 'en'),
}));

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/supabase/admin', () => ({ adminDb: mocks.adminDb }));
vi.mock('@/lib/i18n/server', () => ({ getWebLocale: mocks.getWebLocale }));

import { completeMockPayment, createOrder } from '@/app/actions';
import { fundingT } from '@/lib/i18n/funding';

const userId = '00000000-0000-4000-8000-000000000123';
const offerId = '00000000-0000-4000-8000-000000000456';
const orderId = '00000000-0000-4000-8000-000000000789';

function client(role: string | null, authenticated = true) {
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: role ? { role } : null })) })),
    })),
  }));
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user: authenticated ? { id: userId } : null } })) },
    from,
  };
}

function service(result: { data?: string | null, error?: { message: string } | null } = { data: orderId, error: null }) {
  return { rpc: vi.fn(async () => ({ data: result.data ?? null, error: result.error ?? null })) };
}

function createForm() {
  const form = new FormData();
  form.set('offerId', offerId);
  form.set('quantity', '3');
  return form;
}

function confirmForm(success = true) {
  const form = new FormData();
  form.set('orderId', orderId);
  form.set('success', String(success));
  return form;
}

describe('funding server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWebLocale.mockResolvedValue('en');
  });

  it.each(['student', 'partner', 'admin'])('denies stored %s role before privileged checkout', async (role) => {
    const db = client(role);
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(createOrder(createForm())).rejects.toThrow('REDIRECT:/giver?fundingError=denied');
    expect(privileged.rpc).not.toHaveBeenCalled();
  });

  it.each(['student', 'partner', 'admin'])('denies stored %s role before privileged confirmation', async (role) => {
    const db = client(role);
    const privileged = service({ data: 'paid', error: null });
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(completeMockPayment(confirmForm())).rejects.toThrow('REDIRECT:/giver?fundingError=denied');
    expect(privileged.rpc).not.toHaveBeenCalled();
  });

  it('creates a checkout only after checking the stored Giver role', async () => {
    const db = client('giver');
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(createOrder(createForm())).rejects.toThrow(`REDIRECT:/checkout/${orderId}`);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith('profiles');
    expect(privileged.rpc).toHaveBeenCalledWith('create_mock_checkout', {
      p_giver_id: userId,
      p_offer_id: offerId,
      p_quantity: 3,
    });
  });

  it('passes the authenticated owner explicitly and never uses order visibility as ownership', async () => {
    const db = client('giver');
    const privileged = service({ data: 'paid', error: null });
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(completeMockPayment(confirmForm())).rejects.toThrow(`REDIRECT:/giver/success/${orderId}`);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith('profiles');
    expect(privileged.rpc).toHaveBeenCalledWith('confirm_mock_payment', {
      p_giver_id: userId,
      p_order_id: orderId,
      p_success: true,
    });
  });

  it('returns only a safe denial code for a cross-owner confirmation', async () => {
    const db = client('giver');
    const privileged = service({ error: { message: 'ORDER_NOT_FOUND: private database detail' } });
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(completeMockPayment(confirmForm())).rejects.toThrow('REDIRECT:/giver?fundingError=denied');
    expect(String(mocks.redirect.mock.calls.at(-1)?.[0])).not.toContain('ORDER_NOT_FOUND');
  });

  it.each([
    ['ro', 'Acest cont nu poate finanța experiențe.'],
    ['en', 'This account cannot fund experiences.'],
    ['tr', 'Bu hesap deneyimleri finanse edemez.'],
    ['ar', 'لا يمكن لهذا الحساب تمويل التجارب.'],
  ] as const)('provides safe localized denial copy in %s', (locale, expected) => {
    expect(fundingT(locale, 'denied')).toBe(expected);
  });

  it('requires authentication before either privileged funding operation', async () => {
    const db = client(null, false);
    const privileged = service();
    mocks.createClient.mockResolvedValue(db);
    mocks.adminDb.mockReturnValue(privileged);

    await expect(createOrder(createForm())).rejects.toThrow('REDIRECT:/login?intent=giver&returnTo=/giver');
    await expect(completeMockPayment(confirmForm())).rejects.toThrow('REDIRECT:/login?intent=giver&returnTo=/giver');
    expect(privileged.rpc).not.toHaveBeenCalled();
  });
});
