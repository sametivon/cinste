import * as SecureStore from 'expo-secure-store';

export const MOBILE_ORIENTATION_VERSION = 2;
export const MOBILE_ORIENTATION_KEY_PREFIX = `cinste.mobile.orientation.v${MOBILE_ORIENTATION_VERSION}`;

export function mobileOrientationStorageKey(userId: string) {
  return `${MOBILE_ORIENTATION_KEY_PREFIX}.${userId}`;
}

export async function hasCompletedMobileOrientation(userId: string) {
  return (await SecureStore.getItemAsync(mobileOrientationStorageKey(userId))) === 'complete';
}

export async function completeMobileOrientation(userId: string) {
  await SecureStore.setItemAsync(mobileOrientationStorageKey(userId), 'complete');
}
