export const NATIVE_GIVER_SIGNUP_URL = 'https://cinste.vercel.app/api/native/giver/signup';
export const NATIVE_GIVER_CONFIRMATION_URL = 'https://cinste.vercel.app/native/giver/confirm';

export type NativeGiverSignupInput = { email: string; password: string; displayName?: string };
export type NativeGiverSignupResult = 'confirmation_needed' | 'unavailable';

export function shapeNativeGiverSignupPayload(input: NativeGiverSignupInput) {
  const payload: { email: string; password: string; displayName?: string } = { email: input.email.trim(), password: input.password };
  const displayName = input.displayName?.trim();
  if (displayName) payload.displayName = displayName;
  return payload;
}

export async function submitNativeGiverSignup(input: NativeGiverSignupInput): Promise<NativeGiverSignupResult> {
  try {
    const response = await fetch(NATIVE_GIVER_SIGNUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shapeNativeGiverSignupPayload(input)) });
    return response.status === 202 ? 'confirmation_needed' : 'unavailable';
  } catch { return 'unavailable'; }
}
