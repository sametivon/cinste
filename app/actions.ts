"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";

const credentials = z.object({
  email: z.string().email(), password: z.string().min(8), displayName: z.string().max(80).optional(),
});

export async function login(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form)); const db = await createClient();
  const { data, error } = await db.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error || !data.user) redirect(`/login?error=${encodeURIComponent(error?.message ?? "Login failed")}`);
  redirect("/account");
}
export async function logout() { const db = await createClient(); await db.auth.signOut(); redirect("/"); }
export async function signup(form: FormData) {
  const input = credentials.parse(Object.fromEntries(form)); const db = await createClient();
  const { error } = await db.auth.signUp({ email: input.email, password: input.password, options: { data: { display_name: input.displayName } } });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`); redirect("/onboarding");
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
  const db = await createClient(); const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/login");
  const { data: orderId, error } = await adminDb().rpc("create_mock_checkout", { p_giver_id: user.id, p_offer_id: input.offerId, p_quantity: input.quantity });
  if (error || !orderId) redirect(`/giver?error=${encodeURIComponent(error?.message ?? "Oferta nu este disponibilă")}`);
  redirect(`/checkout/${orderId}`);
}

// Local MockPaymentProvider simulation boundary. The server verifies ownership
// before the service-only confirmation RPC can change funding state.
export async function completeMockPayment(form: FormData) {
  const input = z.object({ orderId: z.string().uuid(), success: z.enum(["true", "false"]) }).parse(Object.fromEntries(form));
  const db = await createClient();
  const { data: order } = await db.from("giver_orders").select("id").eq("id", input.orderId).maybeSingle();
  if (!order) redirect("/giver");
  const { data, error } = await adminDb().rpc("confirm_mock_payment", { p_order_id: input.orderId, p_success: input.success === "true" });
  if (error) redirect(`/checkout/${input.orderId}?error=${encodeURIComponent(error.message)}`);
  redirect(data === "paid" ? `/giver/success/${input.orderId}` : `/checkout/${input.orderId}?failed=1`);
}
export async function redeem(form: FormData) {
  const token = z.string().min(32).max(128).parse(form.get("token")); const db = await createClient();
  const { data, error } = await db.rpc("redeem_claim", { p_token: token });
  if (error) redirect('/partner?result=ERROR'); revalidatePath("/partner"); redirect(`/partner?result=${encodeURIComponent(data)}`);
}
