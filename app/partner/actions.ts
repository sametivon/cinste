'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { partnerOfferDraftInput } from './offer-draft-schema';

export async function savePartnerOfferDraft(form: FormData) {
  const input = partnerOfferDraftInput.parse(Object.fromEntries(form)); const db = await createClient();
  const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('AUTH_REQUIRED');
  const { error } = await db.from('partner_offer_drafts').insert({ partner_id: input.partnerId, category_id: input.categoryId, created_by: user.id, name: input.name, description: input.description, fulfillment_type: input.fulfillment, redemption_instructions: input.instructions || null, booking_url: input.bookingUrl || null, status: 'submitted' });
  if (error) throw new Error(error.message); revalidatePath('/partner'); revalidatePath('/admin/manage');
}
