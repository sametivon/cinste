import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { type TFunction } from 'i18next';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { type SupportedLocale } from './locales';
import { chooseInitialLocale, isRtlLocale } from './core';
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
  const pendingPersistedLocale = useRef<SupportedLocale | null>(null);
  const persistenceRunning = useRef(false);

  const persistLatestLocale = async () => {
    if (persistenceRunning.current) return;
    persistenceRunning.current = true;
    while (pendingPersistedLocale.current) {
      const next = pendingPersistedLocale.current;
      pendingPersistedLocale.current = null;
      await SecureStore.setItemAsync(localeStorageKey, next);
    }
    persistenceRunning.current = false;
  };

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
    setCurrentLocale(next);
    await appI18n.changeLanguage(next);
    pendingPersistedLocale.current = next;
    await persistLatestLocale();
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
