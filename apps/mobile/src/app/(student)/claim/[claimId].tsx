import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Button, Card, EmptyState, Loading, Pill, colors } from '@/components/ui';
import { formatDate, localizedOffer, useAppLocale } from '@/i18n';
import { offerFromClaimRelation } from '@/lib/claim-display';
import { claimStatusLabel, fulfillmentLabel } from '@/lib/presentation';
import { supabase } from '@/lib/supabase';
import type { ClaimStatus, FulfillmentType } from '@/lib/types';
import { color, space, type } from '@/design/tokens';

type ClaimView = { id: string; status: ClaimStatus; expires_at: string | null; campaigns: { offers: { localization_key: string | null; name: string; description: string; fulfillment_type: FulfillmentType; redemption_instructions: string | null; booking_url: string | null; partners: { name: string; address: string | null } | null; categories: { name: string } | null } | null } | null };
export default function ClaimScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>(); const { t, locale, isRTL } = useAppLocale(); const [claim, setClaim] = useState<ClaimView>(); const [token, setToken] = useState<string>(); const [showCode, setShowCode] = useState(false); const [hasError, setHasError] = useState(false);
  const load = useCallback(async () => { setHasError(false); const { data, error } = await supabase.from('claims').select('id,status,expires_at,campaigns(offers(localization_key,name,description,fulfillment_type,redemption_instructions,booking_url,partners(name,address),categories(name)))').eq('id', claimId).single(); if (error) { setClaim(undefined); setToken(undefined); setHasError(true); return; } setClaim(data as unknown as ClaimView); if (data.status !== 'active') { setToken(undefined); setShowCode(false); return; } const { data: secret } = await supabase.from('claim_secrets').select('redemption_token').eq('claim_id', claimId).single(); setToken(secret?.redemption_token); }, [claimId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!claim) { if (hasError) return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}><EmptyState title={t('claim.notFound')} copy={t('error.generic')} /><Button label={t('common.retry')} variant="quiet" onPress={() => void load()} /></ScrollView>; return <Loading label={t('common.loading')} />; }
  const linkedOffer = offerFromClaimRelation(claim.campaigns); const offer = linkedOffer ? localizedOffer(linkedOffer, t) : null; const isActive = claim.status === 'active'; const statusTone = claim.status === 'active' || claim.status === 'redeemed' ? 'success' : claim.status === 'expired' ? 'warning' : 'destructive';
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <Pill color={statusTone} rtl={isRTL}>{claimStatusLabel(claim.status, t)}</Pill><Text style={[styles.title, isRTL && styles.textRtl]}>{offer?.name ?? t('claim.notFound')}</Text>{offer?.partners?.name && <Text style={[styles.partner, isRTL && styles.textRtl]}>{offer.partners.name}{offer.partners.address ? ` · ${offer.partners.address}` : ''}</Text>}
    <Card style={styles.qr}>{isActive && token ? <><QRCode value={token} size={230} color={colors.ink} backgroundColor={colors.white}/><Text style={[styles.scan, isRTL && styles.textRtl]}>{t('claim.showPartnerQr')}</Text></> : <Text style={[styles.inactive, isRTL && styles.textRtl]}>{t('claim.inactive')}</Text>}</Card>
    {claim.expires_at && isActive && <Text style={[styles.expiry, isRTL && styles.textRtl]}>{t('claim.expiresAt', { date: formatDate(claim.expires_at, locale) })}</Text>}
    {offer && <Card style={styles.info}><Text style={[styles.fulfillment, isRTL && styles.textRtl]}>{fulfillmentLabel(offer.fulfillment_type, t)}</Text>{offer.fulfillment_type === 'appointment_required' && <Text style={[styles.detail, isRTL && styles.textRtl]}>{t('offer.bookBefore')}</Text>}{offer.redemption_instructions && <Text style={[styles.detail, isRTL && styles.textRtl]}>{offer.redemption_instructions}</Text>}{offer.booking_url && <Button label={t('offer.openBooking')} variant="quiet" onPress={() => Linking.openURL(offer.booking_url!)}/>}</Card>}
    {isActive && token && <Button label={t(showCode ? 'claim.hideManualCode' : 'claim.showManualCode')} variant="quiet" onPress={() => setShowCode(!showCode)}/>} 
    {showCode && <Text selectable style={styles.code}>{token}</Text>}
    {claim.status === 'redeemed' && <Card style={styles.info}><Text style={[styles.fulfillment, isRTL && styles.textRtl]}>{({ ro: 'Cineva ți-a făcut ziua mai bună.', en: 'Someone made your day.', tr: 'Biri gününü güzelleştirdi.', ar: 'جعل شخص ما يومك أفضل.' } as const)[locale]}</Text><Text style={[styles.detail, isRTL && styles.textRtl]}>{({ ro: 'Vrei să dai mai departe?', en: 'Want to pass it forward?', tr: 'Bunu ileri taşımak ister misin?', ar: 'هل تريد أن تمررها للأمام؟' } as const)[locale]}</Text><Button label={t('impact.explore')} onPress={() => router.push('/(student)/(tabs)/impact' as any)}/></Card>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: space.lg, gap: space.sm, paddingBottom: space.xxl, backgroundColor: colors.cream }, rtl: {}, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, title: { ...type.title, color: colors.ink, marginTop: space.xs }, partner: { ...type.body, color: colors.muted }, qr: { alignItems: 'center', paddingVertical: space.xl, borderColor: color.lineStrong }, scan: { ...type.label, marginTop: space.lg, color: colors.ink, textAlign: 'center' }, inactive: { ...type.body, color: colors.muted, textAlign: 'center' }, expiry: { ...type.label, textAlign: 'center', color: color.warning }, info: { gap: space.xs }, fulfillment: { ...type.label, color: color.primary }, detail: { ...type.bodySmall, color: colors.ink }, code: { ...type.caption, color: colors.muted, textAlign: 'center', padding: space.sm, writingDirection: 'ltr', backgroundColor: color.surfaceSubtle, borderRadius: 8 } });
