import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/auth';
import { LocaleProvider } from '@/i18n';
import { mobileNavigationKey } from '@/lib/mobile-routing';

function AppNavigator() {
  const { session } = useAuth();
  return <><StatusBar style="dark"/><Stack key={mobileNavigationKey(session?.user.id)} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fffdf7' } }}><Stack.Screen name="index"/><Stack.Screen name="(auth)"/><Stack.Screen name="(student)"/><Stack.Screen name="verification"/><Stack.Screen name="role-boundary"/></Stack></>;
}

export default function RootLayout() { return <LocaleProvider><AuthProvider><AppNavigator/></AuthProvider></LocaleProvider>; }
