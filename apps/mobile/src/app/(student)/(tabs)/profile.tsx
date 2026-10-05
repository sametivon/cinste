import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, Loading, Pill, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { supportedLocales, useAppLocale, type SupportedLocale } from '@/i18n';
import { color, space, type } from '@/design/tokens';

const languageNames: Record<SupportedLocale, string> = { ro: 'Română', en: 'English', tr: 'Türkçe', ar: 'العربية' };

export default function Profile() {
  const { session, student, loading, signOut } = useAuth();
  const { locale, setLocale, t, isRTL } = useAppLocale();
  if (loading) return <Loading label={t('common.loading')} />;

  const status = student?.verification_status;
  const statusKey = status === 'verified' ? 'verification.verified' : status === 'pending' ? 'verification.pending' : status === 'rejected' ? 'verification.rejected' : 'verification.unverified';
  const logout = async () => { await signOut(); router.replace('/(auth)/login'); };

  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <Text style={[styles.title, isRTL && styles.textRtl]}>{t('profile.title')}</Text>
    <Card style={styles.accountCard}>
      <Pill color={status === 'verified' ? 'mint' : 'coral'} rtl={isRTL}>{t(statusKey)}</Pill>
      <Text style={[styles.name, isRTL && styles.textRtl]}>{student?.full_name || session?.user.email}</Text>
      <Text style={[styles.email, isRTL && styles.textRtl]}>{session?.user.email}</Text>
      {status !== 'verified' && <View style={{ marginTop: 18 }}><Button label={t(status === 'pending' ? 'verification.pendingButton' : status === 'rejected' ? 'verification.resubmit' : 'verification.submitDocument')} variant={status === 'pending' ? 'quiet' : 'primary'} onPress={() => router.push('/(student)/verification')} /></View>}
    </Card>
    <Card style={styles.sectionCard}>
      <Text style={[styles.section, isRTL && styles.textRtl]}>{t('profile.language')}</Text>
      <Text style={[styles.copy, isRTL && styles.textRtl]}>{t('profile.languageHint')}</Text>
      <View style={styles.languages}>{supportedLocales.map((candidate) => <Button key={candidate} label={languageNames[candidate]} variant={locale === candidate ? 'primary' : 'quiet'} onPress={() => setLocale(candidate)} />)}</View>
    </Card>
    <Card style={styles.sectionCard}>
      <Text style={[styles.section, isRTL && styles.textRtl]}>{t('profile.howItWorks')}</Text>
      <Text style={[styles.copy, isRTL && styles.textRtl]}>{t('profile.howItWorksCopy')}</Text>
    </Card>
    <Button label={t('profile.logout')} variant="quiet" onPress={logout} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: space.lg, paddingBottom: space.xxl, gap: space.sm, backgroundColor: colors.cream }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  title: { ...type.title, color: colors.ink, marginBottom: space.xs }, accountCard: { backgroundColor: color.surfaceSubtle }, sectionCard: { gap: space.xs }, name: { ...type.cardTitle, color: colors.ink, marginTop: space.md },
  email: { ...type.bodySmall, color: colors.muted, marginTop: 2 }, section: { ...type.cardTitle, color: colors.ink },
  copy: { ...type.bodySmall, color: colors.muted, marginTop: 2 }, languages: { gap: space.xs, marginTop: space.sm },
});
