import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { translations } from './locales';

const development = typeof __DEV__ === 'undefined' ? process.env.NODE_ENV !== 'production' : __DEV__;

export function configureTranslationEngine(instance: i18n) {
  return instance.use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(translations).map(([locale, resource]) => [locale, { translation: resource }])),
    lng: 'ro',
    fallbackLng: 'ro',
    interpolation: { escapeValue: false },
    keySeparator: false,
    returnNull: false,
    saveMissing: false,
    parseMissingKeyHandler: (key) => development ? `⟪missing:${key}⟫` : '…',
  });
}

export const appI18n = i18next.createInstance();
void configureTranslationEngine(appI18n);
