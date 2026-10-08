import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EmptyState, Card, Loading, Button } from '@/components/ui';
import { OfferCard } from '@/components/offer-card';
import { JourneyGuidance } from '@/components/journey-guidance';
import { getActiveGiverOffers } from '@/lib/giver-reads';
import { localizedCategory, localizedOffer, formatRon } from '@/lib/presentation';
import { useAppLocale } from '@/i18n';
import type { GiverOffer } from '@/lib/types';
import { color, space, type } from '@/design/tokens';

export default function GiverCatalog() {
  const { t, isRTL, locale } = useAppLocale(); const [offers, setOffers] = useState<GiverOffer[]>([]); const [busy, setBusy] = useState(true); const [error, setError] = useState(false);
  const load = useCallback(async () => { setBusy(true); setError(false); try { setOffers(await getActiveGiverOffers()); } catch { setError(true); } finally { setBusy(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void load()} tintColor={color.primary} />}>
    <Text style={[styles.title, isRTL && styles.textRtl]}>{t('giver.title')}</Text><Text style={[styles.intro, isRTL && styles.textRtl]}>{t('giver.catalogIntro')}</Text><JourneyGuidance />
    {busy ? <Loading label={t('giver.loading')} /> : error ? <Card><Text style={[styles.errorTitle, isRTL && styles.textRtl]}>{t('giver.errorTitle')}</Text><Text style={[styles.intro, isRTL && styles.textRtl]}>{t('giver.errorCopy')}</Text><Button label={t('common.retry')} variant="quiet" onPress={() => void load()} /></Card> : !offers.length ? <EmptyState title={t('giver.emptyCatalog')} copy={t('giver.emptyCatalogCopy')} /> : <View style={styles.stack}>{offers.map((item) => { const offer = localizedOffer(item, t); return <OfferCard key={item.id} category={offer.categories ? localizedCategory(offer.categories.slug, t, offer.categories.name) : t('giver.unavailable')} categorySlug={offer.categories?.slug ?? 'default'} title={offer.name} description={offer.description} partner={offer.partners?.name ?? t('giver.unavailable')} availability={formatRon(offer.giver_price_bani, locale)} fulfillment={t(`fulfillment.${offer.fulfillment_type}`)} imageUrl={offer.image_path} rtl={isRTL} onPress={() => router.push({ pathname: '/native/giver/offer/[offerId]', params: { offerId: item.id } })} />; })}</View>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, padding: space.lg, paddingBottom: space.xxl, gap: space.sm, backgroundColor: color.canvas }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, title: { ...type.title, color: color.ink }, intro: { ...type.bodySmall, color: color.secondaryText }, errorTitle: { ...type.cardTitle, color: color.ink, marginBottom: space.xs }, stack: { gap: space.sm } });
