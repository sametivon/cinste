import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, radius, space, type } from '@/design/tokens';

export const colors = { ink: color.ink, cream: color.canvas, coral: color.primary, mint: color.mintSoft, forest: color.primary, muted: color.secondaryText, border: color.line, white: color.surface };

export function ScreenContainer({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <SafeAreaView edges={['left', 'right']} style={[styles.screen, style]}>{children}</SafeAreaView>; }
export function Button({ label, onPress, variant = 'primary', disabled = false }: { label: string; onPress: () => void; variant?: 'primary' | 'coral' | 'quiet' | 'destructive'; disabled?: boolean }) {
  const isPrimary = variant === 'primary' || variant === 'coral';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, isPrimary && styles.primary, variant === 'quiet' && styles.quiet, variant === 'destructive' && styles.destructive, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><Text style={[styles.buttonText, variant === 'quiet' && styles.quietText]}>{label}</Text></Pressable>;
}
export function Pill({ children, color: tone = 'success', rtl = false }: { children: React.ReactNode; color?: 'mint' | 'coral' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral'; rtl?: boolean }) {
  const mappedTone = tone === 'mint' ? 'success' : tone === 'coral' ? 'warning' : tone;
  const background = mappedTone === 'success' ? styles.pill_success : mappedTone === 'warning' ? styles.pill_warning : mappedTone === 'destructive' ? styles.pill_destructive : mappedTone === 'info' ? styles.pill_info : styles.pill_neutral;
  const foreground = mappedTone === 'success' ? styles.pillText_success : mappedTone === 'warning' ? styles.pillText_warning : mappedTone === 'destructive' ? styles.pillText_destructive : mappedTone === 'info' ? styles.pillText_info : styles.pillText_neutral;
  return <View style={[styles.pill, background, rtl && styles.pillRtl]}><Text style={[styles.pillText, foreground, rtl && styles.rtlText]}>{children}</Text></View>;
}
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[styles.card, style]}>{children}</View>; }
export function Loading({ label = '…' }: { label?: string }) { return <View accessibilityRole="progressbar" style={styles.loading}><ActivityIndicator color={color.primary}/><Text style={styles.muted}>{label}</Text></View>; }
export function EmptyState({ title, copy }: { title: string; copy: string }) { return <View style={styles.empty}><View style={styles.emptyMark} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyCopy}>{copy}</Text></View>; }

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas }, button: { minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.button, justifyContent: 'center', alignItems: 'center' }, primary: { backgroundColor: color.primary }, destructive: { backgroundColor: color.danger }, quiet: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }, disabled: { backgroundColor: color.surfaceSubtle, opacity: 1 }, pressed: { backgroundColor: color.primaryPressed, transform: [{ scale: 0.985 }] }, buttonText: { ...type.label, color: color.surface }, quietText: { color: color.primary },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }, pillRtl: { alignSelf: 'flex-end' }, pill_success: { backgroundColor: color.successSoft }, pill_warning: { backgroundColor: color.warningSoft }, pill_destructive: { backgroundColor: color.dangerSoft }, pill_info: { backgroundColor: color.infoSoft }, pill_neutral: { backgroundColor: color.surfaceSubtle }, pillText: { ...type.caption }, pillText_success: { color: color.success }, pillText_warning: { color: color.warning }, pillText_destructive: { color: color.danger }, pillText_info: { color: color.info }, pillText_neutral: { color: color.secondaryText }, rtlText: { writingDirection: 'rtl', textAlign: 'right' },
  card: { backgroundColor: color.surface, borderRadius: radius.card, padding: space.lg, borderWidth: 1, borderColor: color.line }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.sm, backgroundColor: color.canvas }, muted: { ...type.body, color: color.secondaryText }, empty: { alignItems: 'center', paddingHorizontal: space.xxl, paddingVertical: 44, backgroundColor: color.surface, borderRadius: radius.card, borderWidth: 1, borderColor: color.line }, emptyMark: { width: 30, height: 7, borderRadius: radius.pill, backgroundColor: color.primary, marginBottom: space.md }, emptyTitle: { ...type.section, color: color.ink, textAlign: 'center' }, emptyCopy: { ...type.body, color: color.secondaryText, textAlign: 'center', marginTop: space.xs },
});
