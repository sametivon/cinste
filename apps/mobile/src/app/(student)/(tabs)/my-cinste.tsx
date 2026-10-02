import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Card, Loading, Pill, colors } from '@/components/ui';
import { formatDate, localizedOffer, useAppLocale } from '@/i18n';
import { claimStatusLabel, fulfillmentEmoji } from '@/lib/presentation';
import { supabase } from '@/lib/supabase';
import type { ClaimStatus, FulfillmentType } from '@/lib/types';

type Item = { id: string; status: ClaimStatus; expires_at: string | null; campaigns: { offers: { localization_key: string | null; name: string; description: string; redemption_instructions: string | null; fulfillment_type: FulfillmentType; partners: { name: string } } } };
export default function MyCinste() {
  const [items, setItems] = useState<Item[]>([]); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const { t, locale, isRTL } = useAppLocale();
  const load = useCallback(async (refresh = false) => { refresh ? setRefreshing(true) : setLoading(true); const { data } = await supabase.from('claims').select('id,status,expires_at,campaigns(offers(localization_key,name,description,redemption_instructions,fulfillment_type,partners(name)))').order('claimed_at', { ascending: false }); setItems((data || []) as unknown as Item[]); setLoading(false); setRefreshing(false); }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load])); if (loading) return <Loading label={t('myCinste.loading')} />;
  const sections: Array<{ key: string; statuses: ClaimStatus[] }> = [{ key: 'myCinste.active', statuses: ['active'] }, { key: 'myCinste.history', statuses: ['redeemed', 'expired', 'cancelled'] }];
  return <FlatList data={sections} keyExtractor={(section) => section.key} contentContainerStyle={[styles.page, isRTL && styles.rtl]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.forest}/>} renderItem={({ item: section }) => { const claims = items.filter((claim) => section.statuses.includes(claim.status)); return <View><Text style={[styles.heading, isRTL && styles.textRtl]}>{t(section.key)}</Text>{claims.length ? claims.map((claim) => { const offer = localizedOffer(claim.campaigns.offers, t); return <Pressable key={claim.id} onPress={() => router.push({ pathname: '/(student)/claim/[claimId]', params: { claimId: claim.id } })}><Card style={[styles.card, isRTL && styles.rowRtl]}><Text style={styles.emoji}>{fulfillmentEmoji(offer.fulfillment_type)}</Text><View style={{ flex: 1 }}><Text style={[styles.name, isRTL && styles.textRtl]}>{offer.name}</Text><Text style={[styles.partner, isRTL && styles.textRtl]}>{offer.partners.name}</Text>{claim.expires_at && claim.status === 'active' && <Text style={[styles.expiry, isRTL && styles.textRtl]}>{t('claim.expiresAt', { date: formatDate(claim.expires_at, locale) })}</Text>}</View><Pill color={claim.status === 'active' ? 'mint' : 'coral'} rtl={isRTL}>{claimStatusLabel(claim.status, t)}</Pill></Card></Pressable>; }) : <Card><Text style={[styles.empty, isRTL && styles.textRtl]}>{t(section.key === 'myCinste.active' ? 'myCinste.noActive' : 'myCinste.noHistory')}</Text></Card>}</View>; }} />;
}
const styles = StyleSheet.create({ page: { padding: 20, gap: 24, backgroundColor: colors.cream }, rtl: { direction: 'rtl' }, rowRtl: { flexDirection: 'row-reverse' }, textRtl: { textAlign: 'right', writingDirection: 'rtl' }, heading: { fontSize: 28, fontWeight: '900', letterSpacing: -.7, color: colors.ink, marginBottom: 10 }, card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }, emoji: { fontSize: 30 }, name: { fontSize: 17, fontWeight: '900', color: colors.ink }, partner: { fontSize: 14, color: colors.muted, marginTop: 3 }, expiry: { fontSize: 12, color: colors.coral, fontWeight: '800', marginTop: 7 }, empty: { fontSize: 15, color: colors.muted, lineHeight: 22 } });
