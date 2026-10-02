import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import { Button, Card, Loading, Pill, colors } from '@/components/ui';
import { formatDate, localizedOffer, useAppLocale } from '@/i18n';
import { claimStatusLabel, fulfillmentLabel } from '@/lib/presentation';
import { supabase } from '@/lib/supabase';
import type { ClaimStatus, FulfillmentType } from '@/lib/types';

type ClaimView = { id: string; status: ClaimStatus; expires_at: string | null; campaigns: { offers: { localization_key: string | null; name: string; description: string; fulfillment_type: FulfillmentType; redemption_instructions: string | null; booking_url: string | null; partners: { name: string; address: string }; categories: { name: string } } } };
export default function ClaimScreen() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>(); const { t, locale, isRTL } = useAppLocale(); const [claim, setClaim] = useState<ClaimView>(); const [token, setToken] = useState<string>(); const [showCode, setShowCode] = useState(false);
  const load = useCallback(async () => { const { data, error } = await supabase.from('claims').select('id,status,expires_at,campaigns(offers(localization_key,name,description,fulfillment_type,redemption_instructions,booking_url,partners(name,address),categories(name)))').eq('id', claimId).single(); if (error) { setClaim(undefined); setToken(undefined); return Alert.alert(t('claim.notFound'), t('error.generic')); } setClaim(data as unknown as ClaimView); if (data.status !== 'active') { setToken(undefined); setShowCode(false); return; } const { data: secret } = await supabase.from('claim_secrets').select('redemption_token').eq('claim_id', claimId).single(); setToken(secret?.redemption_token); }, [claimId, t]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!claim) return <Loading label={t('common.loading')} />;
  const offer = localizedOffer(claim.campaigns.offers, t); const isActive = claim.status === 'active';
  return <ScrollView contentContainerStyle={[styles.page, isRTL && styles.rtl]}>
    <Pill color={isActive ? 'mint' : 'coral'} rtl={isRTL}>{claimStatusLabel(claim.status, t)}</Pill><Text style={[styles.title, isRTL && styles.textRtl]}>{offer.name}</Text><Text style={[styles.partner, isRTL && styles.textRtl]}>{offer.partners.name} · {offer.partners.address}</Text>
    <Card style={styles.qr}>{isActive && token ? <><QRCode value={token} size={230} color={colors.ink} backgroundColor={colors.white}/><Text style={[styles.scan, isRTL && styles.textRtl]}>{t('claim.showPartnerQr')}</Text></> : <Text style={[styles.inactive, isRTL && styles.textRtl]}>{t('claim.inactive')}</Text>}</Card>
    {claim.expires_at && isActive && <Text style={[styles.expiry, isRTL && styles.textRtl]}>{t('claim.expiresAt', { date: formatDate(claim.expires_at, locale) })}</Text>}
    <Card style={styles.info}><Text style={[styles.fulfillment, isRTL && styles.textRtl]}>{fulfillmentLabel(offer.fulfillment_type, t)}</Text>{offer.fulfillment_type === 'appointment_required' && <Text style={[styles.detail, isRTL && styles.textRtl]}>{t('offer.bookBefore')}</Text>}{offer.redemption_instructions && <Text style={[styles.detail, isRTL && styles.textRtl]}>{offer.redemption_instructions}</Text>}{offer.booking_url && <Button label={t('offer.openBooking')} variant="quiet" onPress={() => Linking.openURL(offer.booking_url!)}/>}</Card>
    {isActive && token && <Button label={t(showCode ? 'claim.hideManualCode' : 'claim.showManualCode')} variant="quiet" onPress={() => setShowCode(!showCode)}/>} 
    {showCode && <Text selectable style={styles.code}>{token}</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 14, backgroundColor: colors.cream }, rtl: { direction: 'rtl' }, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, title: { fontSize: 37, fontWeight: '900', letterSpacing: -1.3, color: colors.ink }, partner: { fontSize: 16, color: colors.muted, lineHeight: 23 }, qr: { alignItems: 'center', paddingVertical: 28 }, scan: { marginTop: 18, fontWeight: '900', color: colors.ink }, inactive: { fontSize: 16, color: colors.muted }, expiry: { textAlign: 'center', fontWeight: '800', color: colors.coral }, info: { gap: 8 }, fulfillment: { fontSize: 17, fontWeight: '900', color: colors.forest }, detail: { fontSize: 15, lineHeight: 22, color: colors.ink }, code: { fontSize: 12, color: colors.muted, textAlign: 'center', padding: 10, writingDirection: 'ltr' } });
