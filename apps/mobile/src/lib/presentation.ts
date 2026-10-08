import type { TFunction } from 'i18next';

import type { ClaimStatus, FulfillmentType } from './types';
import type { ControlledOfferContent } from './types';

export function fulfillmentLabel(type: FulfillmentType, t: TFunction) {
  return t(`fulfillment.${type}`);
}

export function fulfillmentEmoji(type: FulfillmentType) {
  return type === 'scheduled_event' ? '🎬' : type === 'appointment_required' ? '💇' : '☕';
}

export function claimStatusLabel(status: ClaimStatus, t: TFunction) {
  return t(`claim.${status}`);
}
export function formatRon(bani: number, locale: string) { return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RON' }).format(bani / 100); }
export function localizedCategory(slug: string, t: TFunction, fallbackName: string) { const key = `category.${slug}`; const value = t(key, { defaultValue: fallbackName }); return value === key ? fallbackName : value; }
export function localizedOffer<T extends ControlledOfferContent>(offer: T, t: TFunction): T { if (!offer.localization_key) return offer; const value = (field: 'name' | 'description' | 'redemption_instructions', fallback: string | null) => fallback === null ? null : t(`catalog.${offer.localization_key}.${field}`, { defaultValue: fallback }); return { ...offer, name: value('name', offer.name)!, description: value('description', offer.description)!, redemption_instructions: value('redemption_instructions', offer.redemption_instructions) } as T; }
