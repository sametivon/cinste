import { useCallback, useEffect, useState } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Loading, colors } from '@/components/ui';
import { OfferVisual } from '@/components/offer-visual';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { localizedCategory, localizedOffer, formatRon } from '@/lib/presentation';
import { getActiveGiverOffer } from '@/lib/giver-reads';
import { resolveMobileEntry } from '@/lib/mobile-routing';
import type { GiverOffer } from '@/lib/types';

export default function GiverOfferDetail() {
  const { offerId } = useLocalSearchParams<{ offerId: string }>(); const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete } = useAuth(); const { t, isRTL, locale } = useAppLocale();
  const destination = resolveMobileEntry({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace, orientationComplete }); const [offer, setOffer] = useState<GiverOffer | null | undefined>(); const [error, setError] = useState(false);
  const load = useCallback(async () => { try { setOffer(await getActiveGiverOffer(offerId)); } catch { setError(true); } }, [offerId]); useEffect(() => { if (destination === 'giver' && offerId) void load(); }, [destination, offerId, load]);
  if (destination === 'loading' || (offer === undefined && !error)) return <Loading label={t('common.loading')} />; if (destination === 'orientation') return <Redirect href="/orientation" />; if (destination !== 'giver') return <Redirect href="/" />; if (error || !offer) return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}><ScrollView contentContainerStyle={styles.page}><Card><Text style={styles.title}>{t('giver.offerUnavailable')}</Text><Text style={styles.copy}>{t('giver.offerUnavailableCopy')}</Text></Card></ScrollView></SafeAreaView>;
  const view = localizedOffer(offer, t); return <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safe}><ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><OfferVisual categorySlug={view.categories?.slug ?? 'default'} imageUrl={view.image_path} /><Text style={[styles.category, isRTL && styles.textRtl]}>{view.categories ? localizedCategory(view.categories.slug, t, view.categories.name) : t('giver.unavailable')}</Text><Text style={[styles.title, isRTL && styles.textRtl]}>{view.name}</Text><Text style={[styles.partner, isRTL && styles.textRtl]}>{view.partners?.name ?? t('giver.unavailable')}</Text><Card><Text style={[styles.copy, isRTL && styles.textRtl]}>{view.description}</Text><Text style={[styles.price, isRTL && styles.textRtl]}>{formatRon(view.giver_price_bani, locale)}</Text><Text style={[styles.copy, isRTL && styles.textRtl]}>{t(`fulfillment.${view.fulfillment_type}`)}</Text>{view.redemption_instructions && <Text style={[styles.copy, isRTL && styles.textRtl]}>{view.redemption_instructions}</Text>}</Card></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.cream }, page: { flexGrow: 1, padding: 24, gap: 14, backgroundColor: colors.cream }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, category: { color: colors.coral, fontWeight: '700' }, title: { fontSize: 30, fontWeight: '900', color: colors.ink }, partner: { color: colors.muted, fontSize: 16 }, copy: { fontSize: 16, lineHeight: 24, color: colors.muted }, price: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8 } });
