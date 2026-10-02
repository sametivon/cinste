import type { TFunction } from 'i18next';

import type { ClaimStatus, FulfillmentType } from './types';

export function fulfillmentLabel(type: FulfillmentType, t: TFunction) {
  return t(`fulfillment.${type}`);
}

export function fulfillmentEmoji(type: FulfillmentType) {
  return type === 'scheduled_event' ? '🎬' : type === 'appointment_required' ? '💇' : '☕';
}

export function claimStatusLabel(status: ClaimStatus, t: TFunction) {
  return t(`claim.${status}`);
}
