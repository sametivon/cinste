import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Button, Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { color, radius, space, type } from '@/design/tokens';
import { motionDuration, orientationPhaseContent, selectOrientationJourney, systemMapReveal } from '@/lib/orientation-journey';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function Orientation() {
  const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete, completeOrientation } = useAuth();
  const { t, isRTL } = useAppLocale(); const { revisit } = useLocalSearchParams<{ revisit?: string }>();
  const [phase, setPhase] = useState(0); const [reducedMotion, setReducedMotion] = useState(false);
  const fade = useRef(new Animated.Value(0)).current; const progress = useRef(new Animated.Value(0)).current;
  const journey = useMemo(() => selectOrientationJourney({ role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace }), [role, student?.verification_status, workspaceEnvelope, selectedWorkspace]);
  useEffect(() => { void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion); const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion); return () => sub.remove(); }, []);
  useEffect(() => {
    fade.stopAnimation(); progress.stopAnimation(); fade.setValue(1); progress.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: motionDuration(reducedMotion, 180), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 1, duration: motionDuration(reducedMotion, 520), useNativeDriver: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [phase, reducedMotion, fade, progress]);
  if (loading) return <Loading label={t('common.loading')} />; if (!session) return <Redirect href="/(auth)/login" />; if (orientationComplete && revisit !== '1') return <Redirect href="/" />;
  const finish = async () => { await completeOrientation(); router.replace('/'); }; const goNext = () => setPhase((value) => Math.min(2, value + 1));
  const phaseTitle = orientationPhaseContent[phase].titleKey;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safe}><ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <View style={[styles.top, isRTL && styles.rowRtl]}><Text style={styles.brand}>CINSTE<Text style={styles.brandDot}>.</Text></Text><Text style={styles.phase}>{phase + 1}/3</Text></View>
    <Animated.View style={{ opacity: fade, transform: [{ translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [isRTL ? -18 : 18, 0] }) }] }}>
      <Text style={[styles.title, isRTL && styles.textRtl]}>{t(phaseTitle as never)}</Text>
      {phase === 0 && <><Text style={[styles.copy, isRTL && styles.textRtl]}>{t('orientation.systemCopy' as never)}</Text><SystemMap progress={reducedMotion ? 1 : progress} t={t} isRTL={isRTL} /></>}
      {phase === 1 && <><View style={styles.roleHeader}><Text style={[styles.roleLabel, isRTL && styles.textRtl]}>{t(journey.roleLabelKey as never)}</Text><Text style={[styles.stage, isRTL && styles.textRtl]}>{t(journey.stageKey as never)}</Text></View><JourneySteps steps={journey.steps} t={t} isRTL={isRTL} /></>}
      {phase === 2 && <><View style={styles.startBox}><Text style={[styles.startTitle, isRTL && styles.textRtl]}>{t('orientation.nextTitle' as never)}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t(journey.nextKey as never)}</Text></View><Text style={[styles.hint, isRTL && styles.textRtl]}>{t('orientation.ready' as never)}</Text></>}
    </Animated.View>
    <View style={styles.actions}>{phase < 2 ? <Button label={t('orientation.continue' as never)} onPress={goNext} /> : <Button label={t(journey.ctaKey as never)} onPress={() => void finish()} />}<Pressable accessibilityRole="button" accessibilityLabel={t('journey.howItWorks' as never)} onPress={() => phase > 0 && setPhase(0)} style={styles.revisit}><Text style={styles.revisitText}>{phase > 0 ? t('orientation.systemLink' as never) : ''}</Text></Pressable></View>
  </ScrollView></SafeAreaView>;
}

function SystemMap({ progress, t, isRTL }: { progress: number | Animated.Value; t: (key: never) => string; isRTL: boolean }) {
  const nodes = [{ x: 24, y: 70 }, { x: 101, y: 70 }, { x: 178, y: 70 }, { x: 255, y: 70 }];
  const labels = ['orientation.map.support', 'orientation.map.partner', 'orientation.map.student', 'orientation.map.impact'];
  const lineOpacity = (index: number) => typeof progress === 'number' ? (systemMapReveal(progress, index) ? 1 : 0) : progress.interpolate({ inputRange: [0, .25, .5, .75, 1], outputRange: [0, index === 0 ? 1 : 0, index <= 1 ? 1 : 0, index <= 2 ? 1 : 0, 1] });
  const nodeOpacity = (index: number) => typeof progress === 'number' ? (progress >= index / 4 ? 1 : 0) : progress.interpolate({ inputRange: [0, index / 4, Math.min(1, index / 4 + .01)], outputRange: [0, 0, 1] });
  const accessibilityLabel = labels.map((label) => t(label as never)).join(', ');
  return <View accessible accessibilityLabel={accessibilityLabel} style={styles.map}><Svg width="280" height="110" viewBox="0 0 280 110">{nodes.slice(0, -1).map((node, index) => <AnimatedLine key={`line-${index}`} x1={node.x} y1={node.y} x2={nodes[index + 1].x} y2={nodes[index + 1].y} stroke={[color.primary, color.lilac, color.mint][index]} strokeWidth="3" opacity={lineOpacity(index)} />)}{nodes.map((node, index) => <AnimatedCircle key={`node-${index}`} cx={node.x} cy={node.y} r="14" fill={[color.primary, color.lilac, color.mint, color.sky][index]} opacity={nodeOpacity(index)} />)}</Svg><View style={[styles.mapLabels, isRTL && styles.rowRtl]}>{labels.map((label) => <Text key={label} style={styles.mapLabel}>{t(label as never)}</Text>)}</View></View>;
}
function JourneySteps({ steps, t, isRTL }: { steps: string[]; t: (key: never) => string; isRTL: boolean }) { return <View style={styles.steps}>{steps.map((step, index) => <View key={step} style={[styles.stepRow, isRTL && styles.rowRtl]}><View style={[styles.stepDot, index === 0 && styles.currentDot]}><Text style={styles.stepNumber}>{index + 1}</Text></View><Text style={[styles.stepText, isRTL && styles.textRtl]}>{t(step as never)}</Text></View>)}</View>; }

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: color.canvas }, page: { flexGrow: 1, padding: space.lg, paddingBottom: space.md, backgroundColor: color.canvas, justifyContent: 'space-between', gap: space.lg }, rtl: {}, rowRtl: { flexDirection: 'row-reverse' }, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { ...type.label, color: color.ink, letterSpacing: 1 }, brandDot: { color: color.primary }, phase: { ...type.caption, color: color.muted }, title: { ...type.display, color: color.ink, marginTop: space.xl, maxWidth: 350 }, copy: { ...type.body, color: color.secondaryText, marginTop: space.sm, maxWidth: 360 }, map: { alignItems: 'center', marginVertical: space.xl, paddingVertical: space.sm }, mapLabels: { width: 280, flexDirection: 'row', justifyContent: 'space-between', marginTop: -12 }, mapLabel: { ...type.caption, color: color.secondaryText }, roleHeader: { marginTop: space.xl, padding: space.lg, borderRadius: radius.hero, backgroundColor: color.surfaceSubtle, borderWidth: 1, borderColor: color.line }, roleLabel: { ...type.label, color: color.primary }, stage: { ...type.section, color: color.ink, marginTop: space.xs }, steps: { marginTop: space.xl, gap: space.sm }, stepRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, borderRadius: radius.card, backgroundColor: color.surface, borderWidth: 1, borderColor: color.line }, stepDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceSubtle }, currentDot: { backgroundColor: color.primary }, stepNumber: { ...type.label, color: color.ink }, stepText: { ...type.body, color: color.ink, flex: 1 }, startBox: { marginTop: space.xl, padding: space.lg, borderRadius: radius.hero, backgroundColor: color.mintSoft, borderWidth: 1, borderColor: color.line }, startTitle: { ...type.cardTitle, color: color.ink }, hint: { ...type.bodySmall, color: color.muted, marginTop: space.lg }, actions: { gap: space.xs }, revisit: { minHeight: 28, alignItems: 'center', justifyContent: 'center' }, revisitText: { ...type.caption, color: color.muted } });
