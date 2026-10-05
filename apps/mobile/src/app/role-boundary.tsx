import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Loading, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileDestination } from '@/lib/mobile-routing';

export default function RoleBoundary() {
  const { session, loading, role, student, signOut } = useAuth();
  const { t, isRTL } = useAppLocale();
  const destination = resolveMobileDestination({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null });
  if (destination === 'loading') return <Loading label={t('common.loading')} />;
  if (destination === 'login') return <Redirect href="/(auth)/login" />;
  if (destination === 'student' || destination === 'verification') return <Redirect href="/" />;
  const copyKey = role === 'partner' ? 'mobileBoundary.partner' : role === 'giver' ? 'mobileBoundary.giver' : role === 'admin' ? 'mobileBoundary.admin' : 'mobileBoundary.unknown';
  const logout = async () => { await signOut(); router.replace('/(auth)/login'); };
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text><Text style={[styles.title, isRTL && styles.textRtl]}>{t('mobileBoundary.title')}</Text><Card><Text style={[styles.copy, isRTL && styles.textRtl]}>{t(copyKey)}</Text></Card><Button label={t('mobileBoundary.logout')} variant="quiet" onPress={logout}/></ScrollView>;
}

const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, gap: 18, backgroundColor: colors.cream, justifyContent: 'center' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, brand: { fontSize: 24, fontWeight: '900', letterSpacing: -1, color: colors.ink }, title: { fontSize: 34, fontWeight: '900', letterSpacing: -1.2, color: colors.ink }, copy: { fontSize: 16, lineHeight: 24, color: colors.muted } });
