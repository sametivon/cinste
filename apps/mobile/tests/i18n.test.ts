import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import { applyLocaleChange, chooseInitialLocale, formatDate, formatNumber, formatRon, isRtlLocale, localizedAvailability, localizedCategory, localizedClaimError, localizedOffer, resolveSupportedLocale } from '@/i18n/core';
import { translations, type SupportedLocale } from '@/i18n/locales';
import { configureTranslationEngine } from '@/i18n/runtime';
import { shouldRefreshOnForeground } from '@/lib/freshness';
import { directionalListKey } from '@/lib/rtl-list';

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

  it('localizes the ordered system map and compact Giver guidance in every locale', () => {
    for (const locale of ['ro', 'en', 'tr', 'ar'] as const) {
      expect(translations[locale]['orientation.map.support']).toBeTruthy();
      expect(translations[locale]['orientation.map.partner']).toBeTruthy();
      expect(translations[locale]['orientation.map.student']).toBeTruthy();
      expect(translations[locale]['orientation.map.impact']).toBeTruthy();
      expect(translations[locale]['orientation.map.accessibility']).toBeTruthy();
      expect(translations[locale]['journey.giverTitle']).toBeTruthy();
      expect(translations[locale]['journey.giverNext']).toBeTruthy();
    }
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

  it('updates current-screen, tab, and navigation copy live for Romanian, English, and Turkish', async () => {
    const translator = await translatorFor('ro');
    const saved: string[] = [];
    let visibleLocale: SupportedLocale = 'ro';
    const apply = (next: 'en' | 'tr') => applyLocaleChange(next, translator.changeLanguage.bind(translator), (locale) => { visibleLocale = locale; }, { setItemAsync: async (_key, value) => { saved.push(value); } }, 'cinste.locale.preference');

    expect(translator.t('tabs.discover')).toBe('Descoperă');
    await apply('en');
    expect(visibleLocale).toBe('en');
    expect(translator.t('tabs.myCinste')).toBe('My treats');
    expect(translator.t('common.back')).toBe('Back');
    expect(translator.t('impact.title')).toBe('Impact');
    await apply('tr');
    expect(visibleLocale).toBe('tr');
    expect(translator.t('tabs.discover')).toBe('Keşfet');
    expect(translator.t('profile.title')).toBe('Profilim');
    expect(translator.t('impact.status.joined')).toBe('Katıldı');
    expect(saved).toEqual(['en', 'tr']);
  });

  it('switches Arabic direction and restores LTR while keeping the selected locale after reload', async () => {
    const translator = await translatorFor('tr');
    let persisted: string | null = 'tr';
    let visibleLocale: SupportedLocale = 'tr';
    const save = { setItemAsync: async (_key: string, value: string) => { persisted = value; } };

    await applyLocaleChange('ar', translator.changeLanguage.bind(translator), (locale) => { visibleLocale = locale; }, save, 'cinste.locale.preference');
    expect(visibleLocale).toBe('ar');
    expect(isRtlLocale(visibleLocale)).toBe(true);
    expect(translator.t('tabs.profile')).toBe('الملف الشخصي');
    expect(translator.t('impact.status.completed')).toBe('مكتمل');
    expect(chooseInitialLocale(persisted, 'en')).toBe('ar');

    await applyLocaleChange('ro', translator.changeLanguage.bind(translator), (locale) => { visibleLocale = locale; }, save, 'cinste.locale.preference');
    expect(visibleLocale).toBe('ro');
    expect(isRtlLocale(visibleLocale)).toBe(false);
    expect(translator.t('tabs.profile')).toBe('Profil');
    expect(chooseInitialLocale(persisted, 'ar')).toBe('ro');
  });

  it('uses a direction-specific remount boundary for the Discover category rail', () => {
    expect(directionalListKey('discover-categories', false)).toBe('discover-categories-ltr');
    expect(directionalListKey('discover-categories', true)).toBe('discover-categories-rtl');
    expect(directionalListKey('discover-categories', false)).toBe('discover-categories-ltr');
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
