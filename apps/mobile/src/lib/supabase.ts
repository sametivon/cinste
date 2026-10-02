import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const noOpStorage: AuthStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

const webStorage: AuthStorage = typeof window === 'undefined' ? noOpStorage : {
  getItem: async (key) => window.localStorage.getItem(key),
  setItem: async (key, value) => window.localStorage.setItem(key, value),
  removeItem: async (key) => window.localStorage.removeItem(key),
};

// Native sessions stay in the iOS/Android secure keychain storage. The web fallback
// only supports Expo's optional browser preview and is never used by the iPhone app.
const storage: AuthStorage = Platform.OS === 'web' ? webStorage : {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { storage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
