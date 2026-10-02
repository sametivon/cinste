import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import { chooseInitialLocale, formatDate, formatNumber, formatRon, isRtlLocale, localizedAvailability, localizedCategory, localizedClaimError, localizedOffer, resolveSupportedLocale } from '@/i18n/core';
import { translations } from '@/i18n/locales';
import { configureTranslationEngine } from '@/i18n/runtime';
import { shouldRefreshOnForeground } from '@/lib/freshness';

async function translatorFor(locale: keyof typeof translations = 'ro') {
  const translator = i18next.createInstance();
  await configureTranslationEngine(translator);
  await translator.changeLanguage(locale);
  return translator;
}

describe('mobile i18n foundation', () => {
  it('uses Romanian as the fallback and gives persisted selection priority over device locale', () => {
    expect(resolveSupportedLocale('de-DE')).toBe('ro');
    expect(chooseInitialLocale('en', 'ar')).toBe('en');
    expect(chooseInitialLocale(null, 'ar-EG')).toBe('ar');
  });

  it('keeps every locale structurally complete against Romanian', () => {
    const canonical = Object.keys(translations.ro).sort();
    for (const locale of ['en', 'tr', 'ar'] as const) expect(Object.keys(translations[locale]).sort()).toEqual(canonical);
  });

  it('localizes every seeded category without exposing a translation key', async () => {
    const translator = await translatorFor('tr');
    for (const slug of ['food-drink', 'cinema', 'hair-grooming', 'beauty', 'fitness', 'entertainment', 'activities', 'education', 'mobility', 'other']) {
      expect(localizedCategory(slug, translator.t.bind(translator), 'fallback')).not.toContain('category.');
    }
  });

  it('uses controlled catalog translations while preserving arbitrary partner content', async () => {
    const translator = await translatorFor('tr');
    expect(localizedOffer({ localization_key: 'movie_ticket', name: 'Movie Ticket', description: 'raw', redemption_instructions: null }, translator.t.bind(translator)).name).toBe('Sinema bileti');
    expect(localizedOffer({ localization_key: null, name: 'Partner special', description: 'Raw description', redemption_instructions: 'Raw instructions' }, translator.t.bind(translator))).toMatchObject({ name: 'Partner special', description: 'Raw description' });
  });

  it('reacts to language changes and uses Romanian fallback instead of leaking a missing key', async () => {
    const translator = await translatorFor('en');
    expect(translator.t('profile.title')).toBe('My profile');
    await translator.changeLanguage('tr');
    expect(translator.t('profile.title')).toBe('Profilim');
    translator.removeResourceBundle('tr', 'translation');
    expect(translator.t('profile.title')).toBe('Profilul meu');
    expect(translator.t('unknown.key')).toBe('⟪missing:unknown.key⟫');
  });

  it('pluralizes availability with a numeric count and locale-aware formatted value', async () => {
    const ro = await translatorFor('ro'); const en = await translatorFor('en'); const ar = await translatorFor('ar');
    expect(localizedAvailability(1, 'ro', ro.t.bind(ro))).toBe('1 disponibilă');
    expect(localizedAvailability(2, 'ro', ro.t.bind(ro))).toBe('2 disponibile');
    expect(localizedAvailability(2, 'en', en.t.bind(en))).toBe('2 available');
    expect(localizedAvailability(2, 'ar', ar.t.bind(ar))).toBe('ضيافتان متاحتان');
  });

  it('maps known claim errors and formats values without changing business amounts', async () => {
    const translator = await translatorFor();
    expect(localizedClaimError('CLAIM_LIMIT_REACHED', translator.t.bind(translator))).toContain('24');
    expect(isRtlLocale('ar')).toBe(true);
    expect(formatNumber(12000, 'ro')).toBe(new Intl.NumberFormat('ro').format(12000));
    expect(formatRon(1500, 'en')).toContain('15');
    expect(formatDate('2026-10-01T12:00:00Z', 'tr')).toBeTruthy();
  });

  it('refreshes material student data only when an authenticated app returns to foreground', () => {
    expect(shouldRefreshOnForeground('active', true)).toBe(true);
    expect(shouldRefreshOnForeground('background', true)).toBe(false);
    expect(shouldRefreshOnForeground('active', false)).toBe(false);
  });
});
