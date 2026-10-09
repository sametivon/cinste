import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, Card, Loading, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileEntry, type MobileWorkspace } from '@/lib/mobile-routing';

export default function WorkspaceChooser() {
  const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete, selectWorkspace, signOut } = useAuth();
  const { t, isRTL } = useAppLocale();
  const { switch: switching } = useLocalSearchParams<{ switch?: string }>();
  const destination = resolveMobileEntry({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace, orientationComplete });
  if (destination === 'loading') return <Loading label={t('common.loading')} />;
  if (destination === 'orientation') return <Redirect href="/orientation" />;
  if (destination !== 'workspace-chooser' && switching !== '1') return <Redirect href="/" />;
  const workspaces = workspaceEnvelope.workspaces;
  const choose = async (workspace: MobileWorkspace) => { await selectWorkspace(workspace); router.replace('/'); };
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text><Text style={[styles.title, isRTL && styles.textRtl]}>{t('workspace.title')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('workspace.copy')}</Text>{workspaces.map((workspace) => <Card key={workspace} style={styles.card}><Text style={[styles.name, isRTL && styles.textRtl]}>{t(`workspace.${workspace}`)}</Text><Button label={t('workspace.open')} onPress={() => void choose(workspace)} /></Card>)}<Button label={t('workspace.logout')} variant="quiet" onPress={() => void signOut()} /></ScrollView>;
}

const styles = StyleSheet.create({ page: { flexGrow: 1, padding: 24, gap: 16, backgroundColor: colors.cream, justifyContent: 'center' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, brand: { fontSize: 24, fontWeight: '900', letterSpacing: -1, color: colors.ink }, title: { fontSize: 32, fontWeight: '900', color: colors.ink }, copy: { fontSize: 16, lineHeight: 24, color: colors.muted }, card: { gap: 14 }, name: { fontSize: 20, fontWeight: '700', color: colors.ink } });
