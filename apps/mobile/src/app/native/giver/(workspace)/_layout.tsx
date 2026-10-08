import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { color, font } from '@/design/tokens';
import { resolveMobileEntry } from '@/lib/mobile-routing';

export default function GiverLayout() {
  const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete } = useAuth();
  const { t } = useAppLocale();
  const destination = resolveMobileEntry({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace, orientationComplete });
  if (destination === 'loading') return <Loading label={t('common.loading')} />;
  if (destination !== 'giver') return <Redirect href={destination === 'orientation' ? '/orientation' : destination === 'workspace-chooser' ? '/workspace-chooser' : destination === 'role-boundary' ? '/role-boundary' : '/(auth)/login'} />;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: color.canvas }, headerShadowVisible: false, headerTintColor: color.primary, headerTitleStyle: { color: color.ink, fontFamily: font.semiBold, fontSize: 16 }, contentStyle: { backgroundColor: color.canvas } }}><Stack.Screen name="(tabs)" options={{ headerShown: false }} /><Stack.Screen name="offer/[offerId]" options={{ title: t('giver.offerTitle') }} /></Stack>;
}
