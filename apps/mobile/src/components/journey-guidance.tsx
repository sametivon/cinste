import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { selectOrientationJourney } from '@/lib/orientation-journey';
import { color, radius, space, type } from '@/design/tokens';

export function JourneyGuidance() {
  const { role, student, workspaceEnvelope, selectedWorkspace } = useAuth();
  const { t, isRTL } = useAppLocale();
  const journey = selectOrientationJourney({ role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace });
  return <Card style={styles.card}>
    <View style={[styles.headingRow, isRTL && styles.rowRtl]}><View style={styles.dot} /><Text style={[styles.kicker, isRTL && styles.textRtl]}>{t('journey.title' as never)}</Text></View>
    <Text style={[styles.stage, isRTL && styles.textRtl]}>{t(journey.stageKey as never)}</Text>
    <Text style={[styles.copy, isRTL && styles.textRtl]}>{t(journey.nextKey as never)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('journey.howItWorks' as never)} onPress={() => router.push('/orientation?revisit=1' as never)} style={styles.link}><Text style={[styles.linkText, isRTL && styles.textRtl]}>{t('journey.howItWorks' as never)}</Text></Pressable>
  </Card>;
}

const styles = StyleSheet.create({ card: { backgroundColor: color.surfaceSubtle, borderColor: color.line, gap: space.xs, marginVertical: space.sm }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs }, rowRtl: { flexDirection: 'row-reverse' }, dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.primary }, kicker: { ...type.label, color: color.primary }, stage: { ...type.cardTitle, color: color.ink }, copy: { ...type.bodySmall, color: color.secondaryText }, link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', borderRadius: radius.button }, linkText: { ...type.label, color: color.lilac }, textRtl: { textAlign: 'right', writingDirection: 'rtl' } });
