import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Loading, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileDestination } from '@/lib/mobile-routing';

export default function Orientation() {
  const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete, completeOrientation } = useAuth();
  const { t, isRTL } = useAppLocale();
  const { revisit } = useLocalSearchParams<{ revisit?: string }>();
  const [step, setStep] = useState(1);
  const destination = resolveMobileDestination({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace });

  if (loading) return <Loading label={t('common.loading')} />;
  if (!session) return <Redirect href="/(auth)/login" />;
  if (orientationComplete && revisit !== '1') return <Redirect href="/" />;

  const nextKey = workspaceEnvelope.workspaces.length > 1
    ? 'orientation.next.workspace'
    : role === 'student'
    ? student?.verification_status === 'verified' ? 'orientation.next.studentVerified' : 'orientation.next.studentUnverified'
    : role === 'giver'
      ? 'orientation.next.giver'
      : 'orientation.next.boundary';
  const finish = async () => { await completeOrientation(); router.replace('/'); };

  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text>
    {step === 1 ? <>
      <Text style={[styles.title, isRTL && styles.textRtl]}>{t('orientation.title')}</Text>
      <Card style={styles.card}><Text style={[styles.heading, isRTL && styles.textRtl]}>{t('orientation.whatTitle')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('orientation.whatCopy')}</Text></Card>
      <Card style={styles.card}><Text style={[styles.heading, isRTL && styles.textRtl]}>{t('orientation.whyTitle')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('orientation.whyCopy')}</Text></Card>
      <Button label={t('orientation.continue')} onPress={() => setStep(2)} />
    </> : <>
      <Text style={[styles.title, isRTL && styles.textRtl]}>{t('orientation.nextTitle')}</Text>
      <Card style={styles.card}><Text style={[styles.heading, isRTL && styles.textRtl]}>{t(nextKey)}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('orientation.privacyCopy')}</Text></Card>
      <Text style={[styles.step, isRTL && styles.textRtl]}>{destination === 'role-boundary' ? t('orientation.boundaryNote') : t('orientation.ready')}</Text>
      <Button label={t('orientation.continue')} onPress={() => void finish()} />
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: colors.cream, justifyContent: 'center' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  brand: { fontSize: 24, fontWeight: '900', letterSpacing: -1, color: colors.ink }, title: { fontSize: 32, lineHeight: 40, fontWeight: '900', color: colors.ink },
  card: { gap: 8 }, heading: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.ink }, copy: { fontSize: 16, lineHeight: 24, color: colors.muted }, step: { fontSize: 14, lineHeight: 20, color: colors.muted },
});
