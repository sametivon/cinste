import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button, Card, EmptyState, Loading, Pill, colors } from '@/components/ui';
import { OfferVisual } from '@/components/offer-visual';
import { useAuth } from '@/context/auth';
import { formatDate, localizedAvailabilityAndFree, localizedCategory, localizedClaimError, localizedOffer, useAppLocale } from '@/i18n';
import { fulfillmentEmoji, fulfillmentLabel } from '@/lib/presentation';
import { supabase } from '@/lib/supabase';
import { color, space, type } from '@/design/tokens';
import type { CampaignCard } from '@/lib/types';

export default function OfferDetail() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>(); const { refreshStudent } = useAuth(); const { t, locale, isRTL } = useAppLocale();
  const [campaign, setCampaign] = useState<CampaignCard>(); const [busy, setBusy] = useState(false); const [hasError, setHasError] = useState(false);
  const load = useCallback(async () => { setHasError(false); const { data, error } = await supabase.from('campaigns').select('id,name,quantity_available,ends_at,event_starts_at,offers!inner(id,localization_key,name,description,fulfillment_type,redemption_instructions,booking_url,partners(name,address),categories(name,slug))').eq('id', campaignId).single(); if (error) { setCampaign(undefined); setHasError(true); } else setCampaign(data as unknown as CampaignCard); }, [campaignId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!campaign) { if (hasError) return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><EmptyState title={t('offer.notFound')} copy={t('error.generic')} /><Button label={t('common.retry')} variant="quiet" onPress={() => void load()} /></ScrollView>; return <Loading label={t('common.loading')} />; }
  const offer = localizedOffer(campaign.offers, t);
  const claim = async () => { const refreshedStudent = await refreshStudent(); if (refreshedStudent?.verification_status !== 'verified') { router.push('/verification'); return; } setBusy(true); try { const { data, error } = await supabase.rpc('claim_campaign', { p_campaign_id: campaign.id }); if (error) return Alert.alert(t('offer.claimErrorTitle'), localizedClaimError(error.message, t)); const result = data?.[0]; if (!result?.claim_id) return Alert.alert(t('offer.claimErrorTitle'), localizedClaimError(undefined, t)); router.replace({ pathname: '/(student)/claim/[claimId]', params: { claimId: result.claim_id } }); } catch { Alert.alert(t('offer.claimErrorTitle'), localizedClaimError(undefined, t)); } finally { setBusy(false); } };
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <OfferVisual categorySlug={offer.categories?.slug ?? 'default'} imageUrl={offer.image_path} />
    {offer.categories && <Pill rtl={isRTL}>{localizedCategory(offer.categories.slug, t, offer.categories.name)}</Pill>}<Text style={[styles.title, isRTL && styles.textRtl]}>{offer.name}</Text><Text style={[styles.description, isRTL && styles.textRtl]}>{offer.description}</Text>
    <Card style={styles.info}>{offer.partners?.name && <><Text style={[styles.label, isRTL && styles.textRtl]}>{t('offer.partner')}</Text><Text style={[styles.value, isRTL && styles.textRtl]}>{offer.partners.name}</Text>{offer.partners.address && <Text style={[styles.address, isRTL && styles.textRtl]}>{offer.partners.address}</Text>}<View style={styles.line}/></>}<Text style={[styles.fulfillment, isRTL && styles.textRtl]}>{fulfillmentLabel(offer.fulfillment_type, t)}</Text>{offer.fulfillment_type === 'scheduled_event' && campaign.event_starts_at && <Text style={[styles.detail, isRTL && styles.textRtl]}>{t('offer.event', { date: formatDate(campaign.event_starts_at, locale) })}</Text>}{offer.fulfillment_type === 'appointment_required' && <><Text style={[styles.detail, isRTL && styles.textRtl]}>{t('offer.bookBefore')}</Text>{offer.booking_url && <Button label={t('offer.openBooking')} variant="quiet" onPress={() => Linking.openURL(offer.booking_url!)}/>}</>}<Text style={[styles.available, isRTL && styles.textRtl]}>{localizedAvailabilityAndFree(campaign.quantity_available, locale, t)}</Text>{offer.redemption_instructions && <Text style={[styles.instructions, isRTL && styles.textRtl]}>{offer.redemption_instructions}</Text>}</Card>
    <Text style={[styles.note, isRTL && styles.textRtl]}>{t('offer.reserveNote')}</Text><Button label={t(busy ? 'offer.claiming' : 'offer.claim')} disabled={busy} onPress={claim}/>
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl, backgroundColor: colors.cream }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, title: { ...type.title, color: color.ink, marginTop: space.xs }, description: { ...type.body, color: color.secondaryText }, info: { gap: space.xs, marginTop: space.sm }, label: { ...type.caption, color: color.muted, textTransform: 'uppercase', letterSpacing: .5 }, value: { ...type.cardTitle, color: color.ink }, address: { ...type.bodySmall, color: color.secondaryText }, line: { height: 1, backgroundColor: color.line, marginVertical: space.sm }, fulfillment: { ...type.label, color: color.primary }, detail: { ...type.bodySmall, color: color.ink, marginTop: 2 }, available: { ...type.label, color: color.success, marginTop: space.sm }, instructions: { ...type.bodySmall, color: color.secondaryText, marginTop: space.xs }, note: { ...type.caption, color: color.secondaryText, textAlign: 'center', paddingHorizontal: space.sm, marginVertical: space.xs } });
