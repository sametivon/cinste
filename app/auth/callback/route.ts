import { NextResponse } from 'next/server';

import { safeAuthReturnTo } from '@/lib/auth-routing';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = safeAuthReturnTo(requestUrl.searchParams.get('next')) ?? '/account';
  const code = requestUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=Confirmation%20link%20is%20invalid', requestUrl.origin));

  const db = await createClient();
  const { error } = await db.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/login?error=Confirmation%20link%20could%20not%20be%20completed', requestUrl.origin));
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
