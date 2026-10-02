export type FulfillmentType = 'instant' | 'appointment_required' | 'scheduled_event';
export type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'cancelled';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AppRole = 'student' | 'giver' | 'partner' | 'admin';

export type CampaignCard = { id: string; name: string; quantity_available: number; ends_at: string; event_starts_at: string | null; offers: { id: string; localization_key: string | null; name: string; description: string; image_path: string | null; fulfillment_type: FulfillmentType; redemption_instructions: string | null; booking_url: string | null; partners: { name: string; address: string }; categories: { name: string; slug: string } } };
