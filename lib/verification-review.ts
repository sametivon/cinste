import { z } from 'zod';

export const reviewVerificationInput = z.object({
  id: z.string().uuid(),
  decision: z.enum(['verified', 'rejected']),
  rejectionReason: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  if (value.decision === 'rejected' && (!value.rejectionReason || value.rejectionReason.length < 3)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'REJECTION_REASON_REQUIRED' });
  }
  if (value.decision === 'verified' && value.rejectionReason) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rejectionReason'], message: 'REJECTION_REASON_NOT_ALLOWED' });
  }
});
