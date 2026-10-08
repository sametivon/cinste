import { z } from 'zod';

export const partnerOfferDraftInput = z.object({
  partnerId: z.string().uuid(), categoryId: z.string().uuid(), name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(2000), fulfillment: z.enum(['instant', 'appointment_required', 'scheduled_event']),
  instructions: z.string().trim().max(1000).optional().or(z.literal('')), bookingUrl: z.string().url().optional().or(z.literal('')),
}).strict();
