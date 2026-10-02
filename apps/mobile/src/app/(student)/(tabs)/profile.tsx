import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, Loading, Pill, colors } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { supportedLocales, useAppLocale, type SupportedLocale } from '@/i18n';

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
    <Card>
      <Pill color={status === 'verified' ? 'mint' : 'coral'} rtl={isRTL}>{t(statusKey)}</Pill>
      <Text style={[styles.name, isRTL && styles.textRtl]}>{student?.full_name || session?.user.email}</Text>
      <Text style={[styles.email, isRTL && styles.textRtl]}>{session?.user.email}</Text>
      {status !== 'verified' && <View style={{ marginTop: 18 }}><Button label={t(status === 'pending' ? 'verification.pendingButton' : status === 'rejected' ? 'verification.resubmit' : 'verification.submitDocument')} variant={status === 'pending' ? 'quiet' : 'primary'} onPress={() => router.push('/(student)/verification')} /></View>}
    </Card>
    <Card>
      <Text style={[styles.section, isRTL && styles.textRtl]}>{t('profile.language')}</Text>
      <Text style={[styles.copy, isRTL && styles.textRtl]}>{t('profile.languageHint')}</Text>
      <View style={styles.languages}>{supportedLocales.map((candidate) => <Button key={candidate} label={languageNames[candidate]} variant={locale === candidate ? 'primary' : 'quiet'} onPress={() => setLocale(candidate)} />)}</View>
    </Card>
    <Card>
      <Text style={[styles.section, isRTL && styles.textRtl]}>{t('profile.howItWorks')}</Text>
      <Text style={[styles.copy, isRTL && styles.textRtl]}>{t('profile.howItWorksCopy')}</Text>
    </Card>
    <Button label={t('profile.logout')} variant="quiet" onPress={logout} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 15, backgroundColor: colors.cream }, rtl: { direction: 'rtl' }, textRtl: { textAlign: 'right', writingDirection: 'rtl' },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: -1.2, color: colors.ink }, name: { fontSize: 23, fontWeight: '900', color: colors.ink, marginTop: 15 },
  email: { fontSize: 15, color: colors.muted, marginTop: 4 }, section: { fontSize: 18, fontWeight: '900', color: colors.ink },
  copy: { fontSize: 15, lineHeight: 23, color: colors.muted, marginTop: 8 }, languages: { gap: 8, marginTop: 14 },
});
