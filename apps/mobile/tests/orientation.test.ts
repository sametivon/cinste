import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
}));

import { completeMobileOrientation, hasCompletedMobileOrientation, mobileOrientationStorageKey, MOBILE_ORIENTATION_VERSION } from '@/lib/orientation';

describe('versioned per-user orientation presentation state', () => {
  beforeEach(() => store.clear());

  it('uses a versioned user-id key and keeps users separate', async () => {
    expect(MOBILE_ORIENTATION_VERSION).toBe(2);
    expect(mobileOrientationStorageKey('user-a')).not.toContain('@');
    expect(mobileOrientationStorageKey('user-a')).not.toBe(mobileOrientationStorageKey('user-b'));
    await completeMobileOrientation('user-a');
    expect(await hasCompletedMobileOrientation('user-a')).toBe(true);
    expect(await hasCompletedMobileOrientation('user-b')).toBe(false);
  });

  it('does not mark orientation complete until the explicit completion call', async () => {
    expect(await hasCompletedMobileOrientation('user-a')).toBe(false);
    await completeMobileOrientation('user-a');
    expect(await hasCompletedMobileOrientation('user-a')).toBe(true);
  });
});
