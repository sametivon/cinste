import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Loading, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileDestination } from '@/lib/mobile-routing';

export default function GiverShell() {
  const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, signOut } = useAuth();
  const { t, isRTL } = useAppLocale();
  const destination = resolveMobileDestination({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace });
  if (destination === 'loading') return <Loading label={t('common.loading')} />;
  if (destination !== 'giver') return <Redirect href="/" />;
  const logout = async () => { await signOut(); router.replace('/(auth)/login'); };
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text><Text style={[styles.title, isRTL && styles.textRtl]}>{t('giver.title')}</Text><Card><Text style={[styles.heading, isRTL && styles.textRtl]}>{t('giver.entryTitle')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('giver.entryCopy')}</Text></Card><Button label={t('giver.logout')} variant="quiet" onPress={() => void logout()} /></ScrollView>;
}

const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, gap: 18, backgroundColor: colors.cream, justifyContent: 'center' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, brand: { fontSize: 24, fontWeight: '900', letterSpacing: -1, color: colors.ink }, title: { fontSize: 34, fontWeight: '900', color: colors.ink }, heading: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: 8 }, copy: { fontSize: 16, lineHeight: 24, color: colors.muted } });
