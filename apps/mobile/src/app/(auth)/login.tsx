import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Button, colors } from '@/components/ui';
import { useAppLocale } from '@/i18n';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('verified.student@cinste.test');
  const [password, setPassword] = useState('cinste-local-2026');
  const [busy, setBusy] = useState(false);
  const { t, isRTL } = useAppLocale();
  const signIn = async () => { setBusy(true); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password }); setBusy(false); if (error) return Alert.alert(t('auth.login.errorTitle'), t('error.generic')); router.replace('/'); };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.page, isRTL && styles.rtl]}>
    <View><Text style={[styles.brand, isRTL && styles.textRtl]}>CINSTE<Text style={{ color: colors.coral }}>.</Text></Text><Text style={[styles.title, isRTL && styles.textRtl]}>{t('auth.login.title')}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('auth.login.subtitle')}</Text></View>
    <View style={styles.form}><Text style={[styles.label, isRTL && styles.textRtl]}>{t('auth.email')}</Text><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Text style={[styles.label, isRTL && styles.textRtl]}>{t('auth.password')}</Text><TextInput autoCapitalize="none" autoComplete="password" secureTextEntry value={password} onChangeText={setPassword} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Button label={t(busy ? 'auth.login.submitting' : 'auth.login.submit')} disabled={busy} onPress={signIn}/><Link href="/(auth)/register" style={[styles.link, isRTL && styles.textRtl]}>{t('auth.login.noAccount')}</Link></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ page: { flex: 1, padding: 28, backgroundColor: colors.cream, justifyContent: 'space-between' }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, brand: { marginTop: 36, fontSize: 26, fontWeight: '900', letterSpacing: -1 }, title: { marginTop: 72, fontSize: 42, fontWeight: '900', color: colors.ink, letterSpacing: -1.5 }, copy: { marginTop: 12, fontSize: 17, color: colors.muted, lineHeight: 25 }, form: { gap: 10, marginBottom: 52 }, label: { marginTop: 10, fontSize: 14, fontWeight: '800', color: colors.ink }, input: { height: 52, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingHorizontal: 15, fontSize: 16 }, link: { marginTop: 12, color: colors.forest, fontWeight: '800', textAlign: 'center' } });
