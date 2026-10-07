"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import { parseAuthIntent, postAuthDestination, safeAuthReturnTo } from "@/lib/auth-routing";
import { activeOrganizationWorkspaces } from "@/lib/organization-workspace";
import type { AppRole } from "@/lib/types";
import { getWebLocale } from "@/lib/i18n/server";
import { webT } from "@/lib/i18n/web";

const credentials = z.object({
  email: z.string().email(), password: z.string().min(8), displayName: z.string().max(80).optional(),
});

const giverCredentials = z.object({
  email: z.string().trim().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8),
  displayName: z.string().max(80).optional(),
}).strict();

function authContext(form: FormData) {
  return {
    intent: parseAuthIntent(form.get('intent')),
    returnTo: safeAuthReturnTo(form.get('returnTo')),
  };
}

function loginError(message: string, context: ReturnType<typeof authContext>) {
  const query = new URLSearchParams({ error: message });
  if (context.intent) query.set('intent', context.intent);
  if (context.returnTo) query.set('returnTo', context.returnTo);
  return `/login?${query}`;
}

async function destinationAfterAuth(db: Awaited<ReturnType<typeof createClient>>, userId: string, context: ReturnType<typeof authContext>) {
  const { data: profile } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  const role = profile?.role as AppRole | undefined;
  const organizations = await activeOrganizationWorkspaces(db, userId, role);
  return postAuthDestination(role, organizations.length > 0, context.intent, context.returnTo);
}

export async function login(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form)); const context = authContext(form); const db = await createClient();
  const { data, error } = await db.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) redirect(loginError(error?.message ?? "Login failed", context));
  redirect(await destinationAfterAuth(db, data.user.id, context));
}
export async function logout() { const db = await createClient(); await db.auth.signOut(); redirect("/"); }
export async function signup(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form)); const context = authContext(form); const db = await createClient();
  const { error } = await db.auth.signUp({ email: input.email, password: input.password, options: { data: { display_name: input.displayName } } });
  if (error) redirect(loginError(error.message, context));
  // The database trigger is deliberately the only profile-provisioning path.
  // Do not turn URL/form intent into a role mutation here.
  redirect('/onboarding');
}

export async function signupGiver(form: FormData) {
  const input = giverCredentials.parse({
    email: form.get('email'),
    password: form.get('password'),
    displayName: form.get('displayName') ?? undefined,
  });
  const context = { intent: 'giver' as const, returnTo: '/giver' as const };
  const [db, locale] = await Promise.all([createClient(), getWebLocale()]);
  const { data: { user: authenticatedUser } } = await db.auth.getUser();

  // A signed-in account keeps its stored role and assignment-derived
  // destinations. Revisiting this form never becomes a role mutation path.
  if (authenticatedUser) redirect(await destinationAfterAuth(db, authenticatedUser.id, context));

  const service = adminDb();
  const { data: grantToken, error: grantError } = await service.rpc('issue_giver_provisioning_grant', {
    p_normalized_email: input.email,
  });
  const genericError = webT(locale, 'login.giverSignupError');
  if (grantError || typeof grantToken !== 'string' || grantToken.length !== 64) {
    redirect(loginError(genericError, context));
  }

  let signupData: Awaited<ReturnType<typeof db.auth.signUp>>['data'] | undefined;
  try {
    const result = await db.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          display_name: input.displayName,
          cinste_giver_provisioning_token: grantToken,
        },
      },
    });
    signupData = result.data;
  } catch {
    // Finalization below cancels an unused grant. Internal Auth/provisioning
    // errors are deliberately collapsed into localized public copy.
  }

  const { data: provisionedUserId, error: finalizeError } = await service.rpc('finalize_giver_provisioning_grant', {
    p_token: grantToken,
  });
  if (finalizeError || typeof provisionedUserId !== 'string') {
    redirect(loginError(genericError, context));
  }

  if (signupData?.session) {
    if (signupData.session.user.id !== provisionedUserId) {
      await db.auth.signOut();
      redirect(loginError(genericError, context));
    }
    redirect(await destinationAfterAuth(db, provisionedUserId, context));
  }

  const query = new URLSearchParams({
    status: 'confirm-email',
    intent: 'giver',
    returnTo: '/giver',
  });
  redirect(`/login?${query}`);
}
export async function claimCampaign(form: FormData) {
  const campaignId = z.string().uuid().parse(form.get("campaignId")); const db = await createClient();
  const { data, error } = await db.rpc("claim_campaign", { p_campaign_id: campaignId });
  if (error) redirect(`/?error=${encodeURIComponent(error.message)}`); redirect(`/claim/${data?.[0]?.claim_id}`);
}

// The browser never writes order items, prices, or payments. The service-only
// checkout RPC derives all three from the current offer after this action has
// established the authenticated giver identity.
export async function createOrder(form: FormData) {
  const input = z.object({ offerId: z.string().uuid(), quantity: z.coerce.number().int().min(1).max(100) }).parse(Object.fromEntries(form));
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?intent=giver&returnTo=/giver");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "giver") {
    redirect("/giver?fundingError=denied");
  }
  const { data: orderId, error } = await adminDb().rpc("create_mock_checkout", { p_giver_id: user.id, p_offer_id: input.offerId, p_quantity: input.quantity });
  if (error || !orderId) {
    redirect(`/giver?fundingError=${error?.message.includes("GIVER_REQUIRED") ? "denied" : "unavailable"}`);
  }
  redirect(`/checkout/${orderId}`);
}

// Local MockPaymentProvider simulation boundary. The server verifies ownership
// before the service-only confirmation RPC can change funding state.
export async function completeMockPayment(form: FormData) {
  const input = z.object({ orderId: z.string().uuid(), success: z.enum(["true", "false"]) }).parse(Object.fromEntries(form));
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login?intent=giver&returnTo=/giver");
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "giver") {
    redirect("/giver?fundingError=denied");
  }
  const { data, error } = await adminDb().rpc("confirm_mock_payment", {
    p_giver_id: user.id,
    p_order_id: input.orderId,
    p_success: input.success === "true",
  });
  if (error) {
    const denied = error.message.includes("GIVER_REQUIRED") || error.message.includes("ORDER_NOT_FOUND");
    redirect(`${denied ? "/giver" : `/checkout/${input.orderId}`}?fundingError=${denied ? "denied" : "unavailable"}`);
  }
  redirect(data === "paid" ? `/giver/success/${input.orderId}` : `/checkout/${input.orderId}?failed=1`);
}
export async function redeem(form: FormData) {
  const token = z.string().min(32).max(128).parse(form.get("token")); const db = await createClient();
  const { data, error } = await db.rpc("redeem_claim", { p_token: token });
  if (error) redirect('/partner?result=ERROR'); revalidatePath("/partner"); redirect(`/partner?result=${encodeURIComponent(data)}`);
}
