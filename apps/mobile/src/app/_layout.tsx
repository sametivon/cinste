import { useEffect } from 'react';
import { PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, useFonts } from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/auth';
import { LocaleProvider, useAppLocale } from '@/i18n';
import { mobileNavigationKey } from '@/lib/mobile-routing';
import { color } from '@/design/tokens';

void SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { session } = useAuth();
  // Subscribe the root navigator too: React Navigation caches route options
  // unless the navigator receives the locale context update.
  useAppLocale();
  return <><StatusBar style="dark"/><Stack key={mobileNavigationKey(session?.user.id)} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.canvas } }}><Stack.Screen name="index"/><Stack.Screen name="(auth)"/><Stack.Screen name="(student)"/><Stack.Screen name="verification"/><Stack.Screen name="impact-history"/><Stack.Screen name="workspace-chooser"/><Stack.Screen name="giver"/><Stack.Screen name="role-boundary"/></Stack></>;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  useEffect(() => { if (loaded || error) void SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;
  return <LocaleProvider><AuthProvider><AppNavigator/></AuthProvider></LocaleProvider>;
}
