export type FulfillmentType = 'instant' | 'appointment_required' | 'scheduled_event';
export type ClaimStatus = 'active' | 'redeemed' | 'expired' | 'cancelled';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AppRole = 'student' | 'giver' | 'partner' | 'admin';

export type CampaignCard = { id: string; name: string; quantity_available: number; ends_at: string; event_starts_at: string | null; offers: { id: string; localization_key: string | null; name: string; description: string; image_path: string | null; fulfillment_type: FulfillmentType; redemption_instructions: string | null; booking_url: string | null; partners: { name: string; address: string }; categories: { name: string; slug: string } } };
export type GiverOffer = { id: string; localization_key: string | null; name: string; description: string; image_path: string | null; giver_price_bani: number; fulfillment_type: FulfillmentType; redemption_instructions: string | null; booking_url: string | null; active: boolean; partners: { name: string; address: string | null; active: boolean } | null; categories: { name: string; slug: string; active: boolean } | null };
export type ControlledOfferContent = { localization_key: string | null; name: string; description: string; redemption_instructions: string | null };
export type GivingOutcomeState = 'available' | 'privacy_suppressed' | 'unavailable';
export type GivingOutcome = { order_id: string; order_item_id: string; offer_title: string; funded_quantity: number; outcome_state: GivingOutcomeState; reserved_quantity: number | null; redeemed_quantity: number | null; recorded_unreserved_quantity: number | null; available_now_quantity: number | null; availability_state: 'available' | 'unavailable' | null };
