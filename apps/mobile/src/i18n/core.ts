import type { SupportedLocale } from './locales';

export const supportedLocales: SupportedLocale[] = ['ro', 'en', 'tr', 'ar'];
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export function resolveSupportedLocale(locale?: string | null): SupportedLocale {
  const language = locale?.toLowerCase().split('-')[0];
  return supportedLocales.includes(language as SupportedLocale) ? language as SupportedLocale : 'ro';
}

export function detectDeviceLocale(languageCode?: string | null): SupportedLocale { return resolveSupportedLocale(languageCode); }
export function chooseInitialLocale(savedLocale?: string | null, deviceLanguage?: string | null): SupportedLocale {
  return savedLocale ? resolveSupportedLocale(savedLocale) : detectDeviceLocale(deviceLanguage);
}
export function isRtlLocale(locale: SupportedLocale) { return locale === 'ar'; }
export function formatDate(value: string | Date, locale: SupportedLocale, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) { return new Intl.DateTimeFormat(locale, options).format(new Date(value)); }
export function formatNumber(value: number, locale: SupportedLocale) { return new Intl.NumberFormat(locale).format(value); }
export function formatRon(bani: number, locale: SupportedLocale) { return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RON' }).format(bani / 100); }
export function localizedAvailability(count: number, locale: SupportedLocale, t: Translate) { return t('discover.available', { count, formattedCount: formatNumber(count, locale) }); }
export function localizedAvailabilityAndFree(count: number, locale: SupportedLocale, t: Translate) { return t('discover.availabilityFree', { availability: localizedAvailability(count, locale, t), free: t('common.free') }); }
export function localizedCategory(slug: string, t: Translate, fallbackName: string) { const key = `category.${slug}`; const translation = t(key, { defaultValue: fallbackName }); return translation === key ? fallbackName : translation; }
export type ControlledOfferContent = { localization_key: string | null; name: string; description: string; redemption_instructions: string | null };
export function localizedOffer<T extends ControlledOfferContent>(offer: T, t: Translate): T {
  if (!offer.localization_key) return offer;
  const translation = (field: 'name' | 'description' | 'redemption_instructions', fallback: string | null) => fallback === null ? null : t(`catalog.${offer.localization_key}.${field}`, { defaultValue: fallback });
  return { ...offer, name: translation('name', offer.name)!, description: translation('description', offer.description)!, redemption_instructions: translation('redemption_instructions', offer.redemption_instructions) } as T;
}
export function localizedClaimError(error: string | undefined, t: Translate) { if (error?.includes('STUDENT_NOT_VERIFIED')) return t('error.studentNotVerified'); if (error?.includes('CLAIM_LIMIT_REACHED')) return t('error.claimLimit'); if (error?.includes('SOLD_OUT')) return t('error.soldOut'); if (error?.includes('CAMPAIGN_UNAVAILABLE')) return t('error.campaignUnavailable'); return t('error.genericClaim'); }
