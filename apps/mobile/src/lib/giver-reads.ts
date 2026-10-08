import { supabase } from './supabase';
import type { GiverOffer, GivingOutcome, GivingOutcomeState } from './types';

const offerSelect = 'id,localization_key,name,description,image_path,giver_price_bani,fulfillment_type,redemption_instructions,booking_url,active,partners!inner(name,address,active),categories!inner(name,slug,active)';

export async function getActiveGiverOffers() {
  const { data, error } = await supabase.from('offers').select(offerSelect).eq('active', true).eq('partners.active', true).eq('categories.active', true).order('created_at', { ascending: false });
  if (error) throw error;
  return shapeActiveGiverOffers((data ?? []) as unknown as GiverOffer[]);
}
export function shapeActiveGiverOffers(offers: GiverOffer[]) { return offers.filter((offer) => offer.active && offer.partners?.active === true && offer.categories?.active === true); }
export async function getActiveGiverOffer(id: string) {
  const { data, error } = await supabase.from('offers').select(offerSelect).eq('id', id).eq('active', true).eq('partners.active', true).eq('categories.active', true).maybeSingle();
  if (error) throw error;
  return data as unknown as GiverOffer | null;
}
export async function getMyGivingOutcomes() {
  const { data, error } = await supabase.rpc('list_my_giving_outcomes');
  if (error) throw error;
  return (data ?? []) as GivingOutcome[];
}
export type GivingOutcomePresentation = { state: GivingOutcomeState; metrics: { reserved: number; redeemed: number; recordedUnreserved: number | null; availableNow: number | null; availabilityState: 'available' | 'unavailable' | null } | null };
export function presentGivingOutcome(outcome: GivingOutcome): GivingOutcomePresentation {
  if (outcome.outcome_state !== 'available') return { state: outcome.outcome_state, metrics: null };
  if (outcome.reserved_quantity === null || outcome.redeemed_quantity === null) return { state: 'unavailable', metrics: null };
  return { state: 'available', metrics: { reserved: outcome.reserved_quantity, redeemed: outcome.redeemed_quantity, recordedUnreserved: outcome.recorded_unreserved_quantity, availableNow: outcome.available_now_quantity, availabilityState: outcome.availability_state } };
}
