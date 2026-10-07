import type { WebLocale } from './i18n/web';
import { webLabel } from './i18n/presentation';

export type GivingOutcome = { order_id: string; order_item_id: string; offer_title: string; funded_quantity: number; outcome_state: 'available' | 'privacy_suppressed' | 'unavailable'; reserved_quantity: number | null; redeemed_quantity: number | null; recorded_unreserved_quantity: number | null; available_now_quantity: number | null; availability_state: 'available' | 'unavailable' | null };

export function givingOutcomePresentation(outcome: GivingOutcome, locale: WebLocale = 'ro') {
  if (outcome.outcome_state === 'privacy_suppressed') return { kind: 'privacy_suppressed' as const, message: webLabel(locale, 'outcome_privacy'), metrics: null };
  if (outcome.outcome_state === 'unavailable') return { kind: 'unavailable' as const, message: webLabel(locale, 'outcome_unavailable'), metrics: null };
  return { kind: 'available' as const, message: null, metrics: { reserved: outcome.reserved_quantity, redeemed: outcome.redeemed_quantity, recordedUnreserved: outcome.recorded_unreserved_quantity, availableNow: outcome.available_now_quantity, availabilityState: outcome.availability_state } };
}
