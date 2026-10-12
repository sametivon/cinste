import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), activeOrganizationWorkspaces: vi.fn(), getWebLocale: vi.fn(async () => 'en') }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/organization-workspace', () => ({ activeOrganizationWorkspaces: mocks.activeOrganizationWorkspaces }));
vi.mock('@/lib/i18n/server', () => ({ getWebLocale: mocks.getWebLocale }));
vi.mock('@/app/actions', () => ({ createOrder: vi.fn() }));

import Account from '@/app/account/page';
import Student from '@/app/student/page';
import Giver from '@/app/giver/page';
import GiverSuccess from '@/app/giver/success/[orderId]/page';
import Checkout from '@/app/checkout/[orderId]/page';
import { metadata as giverMetadata } from '@/app/giver/layout';
import { WorkspaceUnavailable } from '@/components/workspace-unavailable';
import { pilotStates } from '@/lib/i18n/pilot-states';
import { webLocales } from '@/lib/i18n/web';

function client(role: string, student: { verification_status: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: [], error: null }));
  const offerQuery = { eq: vi.fn() };
  offerQuery.eq.mockReturnValueOnce(offerQuery).mockResolvedValueOnce({ data: [{ id: 'offer', name: 'Cinema', giver_price_bani: 1000, partners: { name: 'Partner' }, categories: null }] });
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => table === 'offers' ? offerQuery.eq('active', true) : {
        maybeSingle: async () => ({ data: table === 'profiles' ? { role } : student, error: null }),
      },
    }),
  }));
  mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'fixture' } } }) }, from, rpc });
  return { from, rpc, offerQuery };
}

describe('pilot account and workspace states', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.activeOrganizationWorkspaces.mockResolvedValue([]); });

  it('keeps a single-workspace unverified Student on My Account and gives a deliberate verification action', async () => {
    client('student');
    const account = renderToStaticMarkup(await Account());
    const student = renderToStaticMarkup(await Student());
    expect(account).toContain('My account');
    expect(account).toContain('Unverified Student account');
    expect(account).toContain('href="/student"');
    expect(account).not.toContain('Organization operator');
    expect(student).toContain('Your Student account is currently unverified');
    expect(student).toContain('Verification confirms your student status');
    expect(student).toContain('Verify your account');
    expect(student).toContain('href="cinste://"');
  });

  it('distinguishes a pending Student review from an unverified account', async () => {
    client('student', { verification_status: 'pending' });
    const page = renderToStaticMarkup(await Student());
    expect(page).toContain('Your verification is under review');
    expect(page).not.toContain('currently unverified');
  });

  it('uses one dedicated denial state with route-specific reasons and recovery links', () => {
    for (const workspace of ['organization', 'partner', 'admin'] as const) {
      const page = renderToStaticMarkup(createElement(WorkspaceUnavailable, { workspace, locale: 'en' }));
      expect(page).toContain(`${workspace === 'admin' ? 'Admin' : workspace === 'partner' ? 'Partner' : 'Organization'} access is not available`);
      expect(page).toContain('href="/account"');
      expect(page).toContain('href="/"');
      expect(page).not.toContain('landing');
    }
  });

  it('shows a Student only the public Giver catalog and does not request private outcomes', async () => {
    const { rpc, offerQuery } = client('student');
    const page = renderToStaticMarkup(await Giver({ searchParams: Promise.resolve({}) }));
    expect(page).toContain('Explore giving');
    expect(page).toContain('Experiences you can give');
    expect(page).toContain('Use a separate Giver account');
    expect(page).not.toContain('My giving');
    expect(page).not.toContain('You have not treated anyone yet');
    expect(page).not.toContain('name="quantity"');
    expect(rpc).not.toHaveBeenCalled();
    expect(offerQuery.eq).toHaveBeenCalledWith('partners.active', true);
  });

  it('uses a neutral route title for public Giver discovery', () => {
    expect(giverMetadata.title).toBe('Explore giving · CINSTE');
  });

  it('retains authenticated Giver history and pilot checkout access', async () => {
    const { rpc } = client('giver');
    const page = renderToStaticMarkup(await Giver({ searchParams: Promise.resolve({}) }));
    expect(page).toContain('My giving');
    expect(page).toContain('name="quantity"');
    expect(page).toContain('No real payment will be charged during this pilot');
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('uses singular and no-charge copy after one mock contribution', async () => {
    const orderQuery = { eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { giver_order_items: [{ quantity: 1 }], campaigns: [{ quantity_available: 1 }], total_bani: 1500 } })) };
    orderQuery.eq.mockReturnValue(orderQuery);
    mocks.createClient.mockResolvedValue({ from: () => ({ select: () => orderQuery }) });
    const page = renderToStaticMarkup(await GiverSuccess({ params: Promise.resolve({ orderId: 'order' }) }));
    expect(page).toContain('One student can receive an experience from you.');
    expect(page).toContain('No real payment was charged.');
    expect(page).not.toContain('1 students');
    orderQuery.maybeSingle.mockResolvedValueOnce({ data: { giver_order_items: [{ quantity: 3 }], campaigns: [{ quantity_available: 3 }], total_bani: 4500 } });
    const pluralPage = renderToStaticMarkup(await GiverSuccess({ params: Promise.resolve({ orderId: 'order' }) }));
    expect(pluralPage).toContain('3 students can receive an experience from you.');
  });

  it('directs a failed mock order to a fresh attempt instead of confirming the terminal order', async () => {
    const orderQuery = { eq: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { status: 'failed', giver_order_items: [{ quantity: 1, unit_price_bani: 1500, offers: { name: 'Cappuccino' } }], total_bani: 1500 } })) };
    orderQuery.eq.mockReturnValue(orderQuery);
    mocks.createClient.mockResolvedValue({ from: () => ({ select: () => orderQuery }) });
    const page = renderToStaticMarkup(await Checkout({ params: Promise.resolve({ orderId: 'order' }), searchParams: Promise.resolve({ failed: '1' }) }));
    expect(page).toContain('The unsuccessful attempt was recorded.');
    expect(page).toContain('href="/giver"');
    expect(page).toContain('Treat someone else');
    expect(page).not.toContain('Confirm pilot contribution');
  });

  it('keeps the pilot state copy complete across web locales', () => {
    const keys = Object.keys(pilotStates.en).sort();
    for (const locale of webLocales) expect(Object.keys(pilotStates[locale]).sort()).toEqual(keys);
    expect(pilotStates.en.checkoutNote).toContain('No real payment');
  });
});
