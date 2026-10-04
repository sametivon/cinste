"use server";

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { reviewVerificationInput } from '@/lib/verification-review';
import type { OperationalActionState } from '@/lib/operational-action';

const optionalUrl = z.string().url().optional().or(z.literal(''));
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));
const optionalInteger = z.preprocess((value) => value === '' || value === null || value === undefined ? null : value, z.coerce.number().int().nullable());
const dateInput = z.string().min(1).transform((value, context) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) { context.addIssue({ code: z.ZodIssueCode.custom, message: 'INVALID_DATE' }); return z.NEVER; }
  return date.toISOString();
});

async function admin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('AUTH_REQUIRED');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('ADMIN_REQUIRED');
  return db;
}
function refresh() { revalidatePath('/admin'); revalidatePath('/admin/impact'); revalidatePath('/admin/manage'); revalidatePath('/admin/operations'); revalidatePath('/partner'); revalidatePath('/'); }
function throwIf(error: { message: string } | null) { if (error) throw new Error(error.message); }

export async function reviewVerification(form: FormData) {
  const input = reviewVerificationInput.parse(Object.fromEntries(form)); const db = await admin();
  const { error } = await db.rpc('review_student_verification', { p_verification_id: input.id, p_decision: input.decision, p_rejection_reason: input.decision === 'rejected' ? input.rejectionReason : null });
  throwIf(error); refresh();
}
export async function createUniversity(form: FormData) { const v = z.object({ name: z.string().trim().min(2).max(120) }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('universities').insert({ name: v.name })).error); refresh(); }
export async function createCategory(form: FormData) { const v = z.object({ name: z.string().trim().min(2), slug: z.string().regex(/^[a-z0-9-]+$/), icon: z.string().trim().min(1).max(40) }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('categories').insert({ name: v.name, slug: v.slug, icon_identifier: v.icon })).error); refresh(); }

const partnerInput = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().trim().regex(/^[a-z0-9-]+$/), address: z.string().trim().min(4).max(300), city: z.string().trim().min(2).max(120), description: optionalText(500), bookingUrl: optionalUrl, phone: optionalText(40), website: optionalUrl });
export async function createPartner(form: FormData) { const v = partnerInput.parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('partners').insert({ name: v.name, slug: v.slug, address: v.address, city: v.city, description: v.description || null, booking_url: v.bookingUrl || null, phone: v.phone || null, website: v.website || null })).error); refresh(); }
export async function updatePartner(form: FormData) { const v = partnerInput.extend({ id: z.string().uuid() }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('partners').update({ name: v.name, slug: v.slug, address: v.address, city: v.city, description: v.description || null, booking_url: v.bookingUrl || null, phone: v.phone || null, website: v.website || null, updated_at: new Date().toISOString() }).eq('id', v.id)).error); refresh(); }

const offerInput = z.object({ partnerId: z.string().uuid(), categoryId: z.string().uuid(), name: z.string().trim().min(2).max(160), description: z.string().trim().min(2).max(2000), price: z.coerce.number().int().min(1), internalValue: optionalInteger.refine((value) => value === null || value >= 0), fulfillment: z.enum(['instant', 'appointment_required', 'scheduled_event']), instructions: optionalText(1000), bookingUrl: optionalUrl, imagePath: optionalText(500), localizationKey: optionalText(120) });
export async function createOffer(form: FormData) { const v = offerInput.parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('offers').insert({ partner_id: v.partnerId, category_id: v.categoryId, name: v.name, description: v.description, giver_price_bani: v.price, internal_redemption_value_bani: v.internalValue, fulfillment_type: v.fulfillment, redemption_instructions: v.instructions || null, booking_url: v.bookingUrl || null, image_path: v.imagePath || null, localization_key: v.localizationKey || null })).error); refresh(); }
export async function updateOffer(form: FormData) { const v = offerInput.extend({ id: z.string().uuid() }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from('offers').update({ partner_id: v.partnerId, category_id: v.categoryId, name: v.name, description: v.description, giver_price_bani: v.price, internal_redemption_value_bani: v.internalValue, fulfillment_type: v.fulfillment, redemption_instructions: v.instructions || null, booking_url: v.bookingUrl || null, image_path: v.imagePath || null, localization_key: v.localizationKey || null, updated_at: new Date().toISOString() }).eq('id', v.id)).error); refresh(); }

const campaignInput = z.object({ offerId: z.string().uuid(), name: z.string().trim().min(2).max(160), quantity: z.coerce.number().int().min(1).max(10000), startsAt: dateInput, endsAt: dateInput, expiry: optionalInteger.refine((value) => value === null || (value >= 1 && value <= 10080)), sponsor: z.enum(['individual', 'company', 'creator', 'cinste', 'partner']), display: optionalText(80), eventStartsAt: z.string().optional().or(z.literal('')), eventEndsAt: z.string().optional().or(z.literal('')), status: z.enum(['draft', 'active', 'paused']).default('active') });
function campaignParams(v: z.infer<typeof campaignInput>) { const toIso = (value?: string) => value ? new Date(value).toISOString() : null; return { p_offer_id: v.offerId, p_name: v.name, p_quantity: v.quantity, p_starts_at: v.startsAt, p_ends_at: v.endsAt, p_claim_expiration_minutes: v.expiry, p_sponsor_type: v.sponsor, p_sponsor_display_name: v.display || null, p_event_starts_at: toIso(v.eventStartsAt), p_event_ends_at: toIso(v.eventEndsAt), p_status: v.status }; }
export async function createCampaign(form: FormData) { const v = campaignInput.parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.rpc('admin_create_campaign', campaignParams(v))).error); refresh(); }
export async function updateCampaign(form: FormData) { const v = campaignInput.extend({ id: z.string().uuid() }).parse(Object.fromEntries(form)); const db = await admin(); const { p_offer_id, p_quantity, p_sponsor_type, p_sponsor_display_name, ...params } = campaignParams(v); void p_offer_id; void p_quantity; void p_sponsor_type; void p_sponsor_display_name; throwIf((await db.rpc('admin_update_campaign', { p_campaign_id: v.id, p_name: params.p_name, p_starts_at: params.p_starts_at, p_ends_at: params.p_ends_at, p_claim_expiration_minutes: params.p_claim_expiration_minutes, p_event_starts_at: params.p_event_starts_at, p_event_ends_at: params.p_event_ends_at, p_status: params.p_status })).error); refresh(); }

export async function assignPartnerUser(form: FormData) { const v = z.object({ partnerId: z.string().uuid(), userId: z.string().uuid() }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.rpc('admin_assign_partner_user', { p_partner_id: v.partnerId, p_user_id: v.userId })).error); refresh(); }
export async function revokePartnerUser(form: FormData) { const v = z.object({ partnerId: z.string().uuid(), userId: z.string().uuid() }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.rpc('admin_revoke_partner_user', { p_partner_id: v.partnerId, p_user_id: v.userId })).error); refresh(); }
export async function setOperationalState(form: FormData) { const v = z.object({ kind: z.enum(['categories', 'partners', 'offers', 'universities']), id: z.string().uuid(), active: z.enum(['true', 'false']) }).parse(Object.fromEntries(form)); const db = await admin(); throwIf((await db.from(v.kind).update({ active: v.active === 'true' }).eq('id', v.id)).error); refresh(); }
const impactReason = z.string().trim().min(3).max(500);
function operationalError(error: unknown): OperationalActionState {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('SELF_VERIFICATION_FORBIDDEN')) return { ok: false, message: 'A student cannot verify their own contribution.' };
  if (message.includes('not found') || message.includes('NOT_FOUND')) return { ok: false, message: 'This record is no longer available. Refresh and try again.' };
  if (message.includes('ADMIN_REQUIRED') || message.includes('AUTH_REQUIRED')) return { ok: false, message: 'Your Admin session is no longer valid. Please sign in again.' };
  return { ok: false, message: 'The action could not be completed. Check the required details and try again.' };
}
async function impactAction(work: () => Promise<void>, success: string): Promise<OperationalActionState> { try { await work(); refresh(); return { ok: true, message: success }; } catch (error) { return operationalError(error); } }
export async function createOrganization(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ name: z.string().trim().min(2).max(200), city: optionalText(120) }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_create_organization', { p_name: v.name, p_city: v.city || null })).error); }, 'Organization created. Activate it when it is ready for opportunities.'); }
export async function activateOrganization(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ id: z.string().uuid(), reason: optionalText(500) }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_activate_organization', { p_organization_id: v.id, p_reason: v.reason || null })).error); }, 'Organization activated.'); }
export async function deactivateOrganization(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ id: z.string().uuid(), reason: impactReason }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_deactivate_organization', { p_organization_id: v.id, p_reason: v.reason })).error); }, 'Organization suspended. New Impact activity is stopped.'); }
export async function assignOrganizationUser(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ organizationId: z.string().uuid(), userId: z.string().uuid() }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_assign_organization_user', { p_organization_id: v.organizationId, p_user_id: v.userId })).error); }, 'Operator assigned.'); }
export async function revokeOrganizationUser(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ organizationId: z.string().uuid(), userId: z.string().uuid(), reason: impactReason }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_revoke_organization_user', { p_organization_id: v.organizationId, p_user_id: v.userId, p_reason: v.reason })).error); }, 'Operator access revoked.'); }
export async function verifyImpactParticipation(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ id: z.string().uuid(), reason: impactReason }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_verify_impact_participation', { p_participation_id: v.id, p_reason: v.reason })).error); }, 'Participation verified.'); }
export async function revokeImpactContribution(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ id: z.string().uuid(), reason: impactReason }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_revoke_impact_contribution', { p_contribution_id: v.id, p_reason: v.reason })).error); }, 'Contribution revoked. This does not reconstruct previous reciprocity cycles.'); }
export async function waiveImpactReciprocity(_: OperationalActionState, form: FormData) { return impactAction(async () => { const v = z.object({ studentId: z.string().uuid(), cycle: z.coerce.number().int().min(1), reason: impactReason }).parse(Object.fromEntries(form)); throwIf((await (await admin()).rpc('admin_waive_impact_reciprocity', { p_student_id: v.studentId, p_expected_cycle_number: v.cycle, p_reason: v.reason })).error); }, 'Reciprocity requirement waived for the current cycle.'); }
