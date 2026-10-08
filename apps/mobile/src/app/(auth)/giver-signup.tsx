import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { Button, colors } from '@/components/ui';
import { useAppLocale } from '@/i18n';
import { submitNativeGiverSignup } from '@/lib/native-giver';

export default function GiverSignup() {
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const { t, isRTL } = useAppLocale();
  const submit = async () => { setBusy(true); const result = await submitNativeGiverSignup({ email, password, displayName: name }); setBusy(false); if (result === 'confirmation_needed') return Alert.alert(t('auth.giverSignup.confirmTitle'), t('auth.giverSignup.confirmCopy')); Alert.alert(t('auth.giverSignup.errorTitle'), t('error.generic')); };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.page, isRTL && styles.rtl]}>
    <View><Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text><Text style={[styles.title, isRTL && styles.textRtl]}>{t('auth.giverSignup.title')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('auth.giverSignup.subtitle')}</Text></View>
    <View style={styles.form}><Text style={[styles.label, isRTL && styles.textRtl]}>{t('auth.fullName')}</Text><TextInput value={name} onChangeText={setName} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Text style={[styles.label, isRTL && styles.textRtl]}>{t('auth.email')}</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Text style={[styles.label, isRTL && styles.textRtl]}>{t('auth.password')}</Text><TextInput autoCapitalize="none" autoComplete="new-password" secureTextEntry value={password} onChangeText={setPassword} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Button label={t(busy ? 'auth.giverSignup.submitting' : 'auth.giverSignup.submit')} disabled={busy} onPress={() => void submit()} /><Link href="/(auth)/login" style={[styles.link, isRTL && styles.textRtl]}>{t('auth.register.hasAccount')}</Link></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 28, backgroundColor: colors.cream, justifyContent: 'space-between' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, brand: { marginTop: 36, fontSize: 26, fontWeight: '900', letterSpacing: -1 }, title: { marginTop: 60, fontSize: 38, fontWeight: '900', color: colors.ink, letterSpacing: -1 }, copy: { marginTop: 12, fontSize: 17, color: colors.muted, lineHeight: 25 }, form: { gap: 10, marginBottom: 35 }, label: { marginTop: 8, fontSize: 14, fontWeight: '800' }, input: { height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, fontSize: 16 }, link: { marginTop: 12, color: colors.forest, fontWeight: '800', textAlign: 'center' } });
