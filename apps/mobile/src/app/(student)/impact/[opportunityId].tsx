import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, EmptyState, Loading, Pill, colors } from '@/components/ui';
import { formatDate, useAppLocale } from '@/i18n';
import { impactOpportunityFromParticipation } from '@/lib/impact-participation';
import { getImpactOpportunities, getMyImpactParticipations, type ImpactOpportunity } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { color, space, type } from '@/design/tokens';

type IncidentCategory = 'safety_concern' | 'harassment' | 'inappropriate_behavior' | 'injury' | 'organization_issue' | 'student_issue' | 'other';
type IncidentSeverity = 'low' | 'medium' | 'serious';
const incidentCategories: IncidentCategory[] = ['safety_concern', 'harassment', 'inappropriate_behavior', 'injury', 'organization_issue', 'student_issue', 'other'];
const incidentSeverities: IncidentSeverity[] = ['low', 'medium', 'serious'];

export default function ImpactOpportunityDetail() {
  const { opportunityId, participationId } = useLocalSearchParams<{ opportunityId: string; participationId?: string }>();
  const { t, locale, isRTL } = useAppLocale();
  const [item, setItem] = useState<ImpactOpportunity | null>(null);
  const [participation, setParticipation] = useState<{ id: string; status: string } | null>(participationId ? { id: participationId, status: 'joined' } : null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [working, setWorking] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [category, setCategory] = useState<IncidentCategory>('safety_concern');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setPhase('loading');
    try {
      const [items, participationRows] = await Promise.all([getImpactOpportunities(), getMyImpactParticipations()]);
      const ownParticipation = participationRows.find((value) => value.opportunity_id === opportunityId);
      setItem(items.find((value) => value.id === opportunityId) ?? (ownParticipation ? impactOpportunityFromParticipation(ownParticipation) : null));
      setParticipation(ownParticipation ? { id: ownParticipation.participation_id, status: ownParticipation.participation_status } : null);
      setPhase('ready');
    } catch { setPhase('error'); }
  }, [opportunityId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (phase === 'loading') return <Loading label={t('impact.loading')} />;
  if (phase === 'error') return <View style={styles.error}><EmptyState title={t('impact.errorTitle')} copy={t('impact.errorCopy')} /><Button label={t('common.retry')} onPress={() => void load()} /></View>;
  if (!item) return <View style={styles.page}><Text style={styles.title}>{t('impact.notFound')}</Text></View>;

  const join = async () => { setWorking(true); const { error } = await supabase.rpc('student_join_impact_opportunity', { p_opportunity_id: item.id }); setWorking(false); if (error) return Alert.alert(t('impact.actionError'), t('impact.actionErrorCopy')); await load(); };
  const cancel = async () => { if (!participation) return; setWorking(true); const { error } = await supabase.rpc('student_cancel_impact_participation', { p_participation_id: participation.id }); setWorking(false); if (error) return Alert.alert(t('impact.actionError'), t('impact.actionErrorCopy')); await load(); };
  const report = async () => { if (!participation || description.trim().length < 3) return; setWorking(true); const { error } = await supabase.rpc('report_impact_incident', { p_participation_id: participation.id, p_category: category, p_severity: severity, p_description: description.trim() }); setWorking(false); if (error) return Alert.alert(t('impact.actionError'), t('impact.actionErrorCopy')); setDescription(''); setReporting(false); Alert.alert(t('impact.reportSuccess'), t('impact.reportSuccessCopy')); };

  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <Text style={[styles.title, isRTL && styles.textRtl]}>{item.title}</Text>
    <Text style={[styles.org, isRTL && styles.textRtl]}>{item.organization_name}</Text>
    <Card style={styles.card}><Text style={[styles.description, isRTL && styles.textRtl]}>{item.description}</Text><Text style={[styles.meta, isRTL && styles.textRtl]}>{item.mode === 'flexible_remote' ? t('impact.remote') : t('impact.starts', { date: formatDate(item.starts_at!, locale) })}</Text><Text style={[styles.meta, isRTL && styles.textRtl]}>{t('impact.dueDate', { date: formatDate(item.due_at, locale) })}</Text><Text style={[styles.meta, isRTL && styles.textRtl]}>{item.expected_eligible_minutes} min · {t('impact.slots', { count: item.remaining_capacity })}</Text></Card>
    {participation ? <Card style={styles.card}>
      <Pill color={participation.status === 'joined' ? 'mint' : 'coral'} rtl={isRTL}>{t(`impact.status.${participation.status}`)}</Pill>
      {participation.status === 'joined' && <Pressable disabled={working} onPress={cancel} style={styles.secondary}><Text style={styles.secondaryText}>{working ? t('common.loading') : t('impact.cancel')}</Text></Pressable>}
      {!reporting && <Pressable onPress={() => setReporting(true)} style={styles.secondary}><Text style={styles.secondaryText}>{t('impact.reportIssue')}</Text></Pressable>}
      {reporting && <View style={styles.reportBox}><Text style={[styles.reportTitle, isRTL && styles.textRtl]}>{t('impact.reportTitle')}</Text><Text style={[styles.meta, isRTL && styles.textRtl]}>{t('impact.reportCategory')}</Text><View style={styles.options}>{incidentCategories.map((value) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.option, category === value && styles.optionSelected]}><Text style={styles.optionText}>{value.replaceAll('_', ' ')}</Text></Pressable>)}</View><Text style={[styles.meta, isRTL && styles.textRtl]}>{t('impact.reportSeverity')}</Text><View style={styles.options}>{incidentSeverities.map((value) => <Pressable key={value} onPress={() => setSeverity(value)} style={[styles.option, severity === value && styles.optionSelected]}><Text style={styles.optionText}>{value}</Text></Pressable>)}</View><TextInput value={description} onChangeText={setDescription} multiline maxLength={4000} placeholder={t('impact.reportDescription')} style={[styles.input, isRTL && styles.textRtl]} textAlign={isRTL ? 'right' : 'left'} /><Pressable disabled={working || description.trim().length < 3} onPress={() => void report()} style={styles.button}><Text style={styles.buttonText}>{working ? t('common.loading') : t('impact.reportSubmit')}</Text></Pressable><Pressable onPress={() => setReporting(false)}><Text style={styles.back}>{t('common.cancel')}</Text></Pressable></View>}
    </Card> : <Pressable disabled={working || item.remaining_capacity === 0} onPress={join} style={styles.button}><Text style={styles.buttonText}>{working ? t('common.loading') : t('impact.join')}</Text></Pressable>}
    <Pressable onPress={() => router.back()}><Text style={styles.back}>{t('common.back')}</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { padding: space.lg, paddingBottom: space.xxl, gap: space.sm, backgroundColor: colors.cream, flexGrow: 1 }, error: { flex: 1, padding: space.lg, gap: space.md, justifyContent: 'center', backgroundColor: colors.cream }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, title: { ...type.title, color: colors.ink }, org: { ...type.label, color: color.primary }, card: { gap: space.sm }, description: { ...type.body, color: colors.ink }, meta: { ...type.bodySmall, color: colors.muted }, button: { alignItems: 'center', backgroundColor: color.primary, borderRadius: 12, minHeight: 48, justifyContent: 'center' }, buttonText: { ...type.label, color: color.surface }, secondary: { marginTop: space.sm, alignItems: 'center', borderWidth: 1, borderColor: color.line, borderRadius: 12, minHeight: 48, justifyContent: 'center' }, secondaryText: { ...type.label, color: color.primary }, back: { ...type.label, color: color.primary, textAlign: 'center', marginTop: space.xs }, reportBox: { gap: space.sm, marginTop: space.sm }, reportTitle: { ...type.label, color: colors.ink }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }, option: { borderWidth: 1, borderColor: color.line, borderRadius: 10, padding: space.xs }, optionSelected: { backgroundColor: color.mintSoft, borderColor: color.primary }, optionText: { ...type.caption, color: colors.ink }, input: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space.sm, ...type.body, color: colors.ink, textAlignVertical: 'top', backgroundColor: color.surface } });
