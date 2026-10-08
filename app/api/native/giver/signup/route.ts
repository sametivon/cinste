import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { allowNativeGiverSignup, nativeGiverSignupSchema, strictJson } from '@/lib/native-giver-bff';
import { adminDb } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const confirmationUrl = () => {
  const value = process.env.NEXT_PUBLIC_NATIVE_GIVER_CONFIRMATION_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch { return null; }
};

const response = (status: number) => NextResponse.json(
  { status: status === 202 ? 'confirmation_needed' : 'unavailable' },
  { status, headers: { 'Cache-Control': 'no-store' } },
);

// The only Expo-facing privileged signup path. This route never accepts role,
// grant, redirect, workspace, or metadata input; the database trigger remains
// the sole writer of the initial Giver profile.
export async function POST(request: Request) {
  const input = await strictJson(request, nativeGiverSignupSchema);
  if (!input) return response(400);
  try {
    if (!await allowNativeGiverSignup(request, input.email)) return response(429);
    const redirectTo = confirmationUrl();
    if (!redirectTo) return response(503);

    const service = adminDb();
    const { data: grant, error: grantError } = await service.rpc('issue_giver_provisioning_grant', {
      p_normalized_email: input.email,
    });
    if (grantError || typeof grant !== 'string' || grant.length !== 64) return response(503);

    const auth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    let returnedUserId: string | null = null;
    let signupFailed = false;
    try {
      const { data, error } = await auth.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            display_name: input.displayName,
            cinste_giver_provisioning_token: grant,
          },
        },
      });
      returnedUserId = data.user?.id ?? null;
      signupFailed = Boolean(error);
    } catch {
      signupFailed = true;
    }

    const { data: consumedUserId, error: finalizeError } = await service.rpc('finalize_giver_provisioning_grant', {
      p_token: grant,
    });
    if (signupFailed || finalizeError) return response(503);
    if (consumedUserId !== null && (typeof consumedUserId !== 'string' || consumedUserId !== returnedUserId)) return response(503);

    // An unconsumed proof includes the deliberately indistinguishable existing
    // account case. Do not disclose it or turn this route into role upgrade.
    return response(202);
  } catch {
    return response(503);
  }
}
