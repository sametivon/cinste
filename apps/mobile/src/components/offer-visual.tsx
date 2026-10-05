import { Image, StyleSheet, View } from 'react-native';

import { color, radius } from '@/design/tokens';
import { AppIcon, categoryIcon } from './app-icon';

const tones = { 'food-drink': { base: color.mintSoft, accent: '#B8DFC8' }, cinema: { base: color.surfaceSubtle, accent: '#F7C9BA' }, 'hair-grooming': { base: color.lilacSoft, accent: '#D6C7F2' }, default: { base: color.skySoft, accent: '#C4DDF0' } };

export function OfferVisual({ categorySlug, imageUrl, compact = false }: { categorySlug: string; imageUrl?: string | null; compact?: boolean }) {
  const tone = tones[categorySlug as keyof typeof tones] ?? tones.default;
  const imageIsUsable = typeof imageUrl === 'string' && /^https:\/\//.test(imageUrl);
  if (imageIsUsable) return <Image accessibilityLabel="" source={{ uri: imageUrl }} style={[styles.image, compact && styles.compact]} resizeMode="cover" />;
  return <View style={[styles.fallback, { backgroundColor: tone.base }, compact && styles.compact]} accessibilityLabel=""><View style={[styles.orbOne, { backgroundColor: tone.accent }]} /><View style={styles.orbTwo} /><View style={styles.icon}><AppIcon name={categoryIcon(categorySlug)} size={compact ? 30 : 44} color={color.brandDark} /></View></View>;
}

const styles = StyleSheet.create({ image: { width: '100%', height: 184, borderRadius: radius.card }, compact: { height: 116, borderRadius: 0 }, fallback: { width: '100%', height: 184, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, orbOne: { width: 144, height: 144, borderRadius: 72, position: 'absolute', right: -32, top: -36 }, orbTwo: { width: 98, height: 98, borderRadius: 49, position: 'absolute', left: -20, bottom: -28, borderWidth: 16, borderColor: color.surface, opacity: .76 }, icon: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' } });
