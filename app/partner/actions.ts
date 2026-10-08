'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const partnerOfferDraftInput = z.object({
  partnerId: z.string().uuid(), categoryId: z.string().uuid(), name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000), fulfillment: z.enum(['instant', 'appointment_required', 'scheduled_event']),
  instructions: z.string().trim().max(1000).optional().or(z.literal('')), bookingUrl: z.string().url().optional().or(z.literal('')),
}).strict();

export async function savePartnerOfferDraft(form: FormData) {
  const input = partnerOfferDraftInput.parse(Object.fromEntries(form)); const db = await createClient();
  const { data: { user } } = await db.auth.getUser(); if (!user) throw new Error('AUTH_REQUIRED');
  const { error } = await db.from('partner_offer_drafts').insert({ partner_id: input.partnerId, category_id: input.categoryId, created_by: user.id, name: input.name, description: input.description, fulfillment_type: input.fulfillment, redemption_instructions: input.instructions || null, booking_url: input.bookingUrl || null, status: 'submitted' });
  if (error) throw new Error(error.message); revalidatePath('/partner'); revalidatePath('/admin/manage');
}
