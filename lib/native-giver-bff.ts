import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { adminDb } from '@/lib/supabase/admin';

const rateLimitScopes = {
  signup: ['signup_ip_burst', 'signup_ip_sustained', 'signup_email_burst'],
  funding: ['funding_user_burst', 'funding_ip_sustained'],
} as const;

const rateLimitSecret = () => {
  const value = process.env.NATIVE_BFF_RATE_LIMIT_KEY;
  if (!value || value.length < 32) throw new Error('NATIVE_BFF_RATE_LIMIT_KEY is not configured');
  return value;
};

export const nativeGiverSignupSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(80).optional(),
}).strict();

export const nativeCheckoutSchema = z.object({
  offerId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
}).strict();

export const nativeConfirmSchema = z.object({
  orderId: z.string().uuid(),
  success: z.boolean(),
}).strict();

export function strictBearer(request: Request) {
  const value = request.headers.get('authorization');
  const match = value?.match(/^Bearer ([^\s,]+)$/);
  return match?.[1] ?? null;
}

function requestIp(request: Request) {
  // Vercel's edge proxy owns this header before it reaches the Node runtime.
  // Direct/local requests intentionally share one conservative bucket rather
  // than allowing a caller-controlled forwarding header to bypass limits.
  const raw = process.env.VERCEL === '1'
    ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    : null;
  return raw && raw.length <= 128 ? raw : 'unattributed-client';
}

function fingerprint(scope: string, value: string) {
  return createHmac('sha256', rateLimitSecret()).update(`${scope}:${value}`).digest('hex');
}

async function consume(scope: string, value: string) {
  const { data, error } = await adminDb().rpc('consume_native_giver_bff_rate_limit', {
    p_scope: scope,
    p_subject_hash: fingerprint(scope, value),
  });
  if (error || typeof data !== 'boolean') throw new Error('rate-limit unavailable');
  return data;
}

export async function allowNativeGiverSignup(request: Request, normalizedEmail: string) {
  const ip = requestIp(request);
  const results = await Promise.all([
    consume(rateLimitScopes.signup[0], ip),
    consume(rateLimitScopes.signup[1], ip),
    consume(rateLimitScopes.signup[2], normalizedEmail),
  ]);
  return results.every(Boolean);
}

export async function authorizeNativeGiver(request: Request) {
  const token = strictBearer(request);
  if (!token) return null;
  const publicAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: userData, error: userError } = await publicAuth.auth.getUser(token);
  const user = userData.user;
  if (userError || !user) return null;
  const service = adminDb();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError || profile?.role !== 'giver') return null;
  return { id: user.id, ip: requestIp(request) };
}

export async function allowNativeGiverFunding(userId: string, ip: string) {
  const results = await Promise.all([
    consume(rateLimitScopes.funding[0], userId),
    consume(rateLimitScopes.funding[1], ip),
  ]);
  return results.every(Boolean);
}

export async function strictJson<T>(request: Request, schema: z.ZodType<T>) {
  let body: unknown;
  try { body = await request.json(); } catch { return null; }
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}
