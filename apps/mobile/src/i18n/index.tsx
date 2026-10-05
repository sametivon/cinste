import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { type TFunction } from 'i18next';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type SupportedLocale } from './locales';
import { applyLocaleChange, chooseInitialLocale, isRtlLocale } from './core';
import { appI18n } from './runtime';
export type { SupportedLocale } from './locales';
const localeStorageKey = 'cinste.locale.preference';

type LocaleContextValue = {
  locale: SupportedLocale;
  isRTL: boolean;
  ready: boolean;
  t: TFunction;
  setLocale: (locale: SupportedLocale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setCurrentLocale] = useState<SupportedLocale>('ro');
  const [ready, setReady] = useState(false);
  const latestLocaleRequest = useRef(0);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(localeStorageKey);
      const next = chooseInitialLocale(saved, Localization.getLocales()[0]?.languageCode);
      await appI18n.changeLanguage(next);
      setCurrentLocale(next);
      setReady(true);
    })();
  }, []);

  const setLocale = async (next: SupportedLocale) => {
    if (next === locale) return;
    const request = ++latestLocaleRequest.current;
    try {
      await applyLocaleChange(next, appI18n.changeLanguage.bind(appI18n), (applied) => {
        if (request === latestLocaleRequest.current) setCurrentLocale(applied);
      }, SecureStore, localeStorageKey);
    } catch (error) {
      // Keep the current visible locale if the translation engine cannot apply
      // the requested one. Storage failures are surfaced to the caller.
      if (request === latestLocaleRequest.current) throw error;
    }
  };

  const value = useMemo(() => ({ locale, isRTL: isRtlLocale(locale), ready, t: appI18n.t.bind(appI18n), setLocale }), [locale, ready]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useAppLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useAppLocale must be used inside LocaleProvider');
  return value;
}

export * from './core';
