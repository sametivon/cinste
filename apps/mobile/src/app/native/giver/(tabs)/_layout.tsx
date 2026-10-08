import { StyleSheet, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { AppIcon } from '@/components/app-icon';
import { color, font } from '@/design/tokens';
import { useAppLocale } from '@/i18n';

export default function GiverTabsLayout() {
  const { t } = useAppLocale();
  const icon = (name: 'discover' | 'cinste' | 'profile') => ({ color: tint }: { color: ColorValue }) => <AppIcon name={name} size={22} color={tint} />;
  return <Tabs screenOptions={{ headerStyle: styles.header, headerShadowVisible: false, headerTitleStyle: styles.headerTitle, tabBarActiveTintColor: color.brand, tabBarInactiveTintColor: color.muted, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarHideOnKeyboard: true }}><Tabs.Screen name="index" options={{ title: t('giver.catalog'), tabBarIcon: icon('discover') }} /><Tabs.Screen name="my-giving" options={{ title: t('giver.outcomes'), tabBarIcon: icon('cinste') }} /><Tabs.Screen name="account" options={{ title: t('giver.account'), tabBarIcon: icon('profile') }} /></Tabs>;
}

const styles = StyleSheet.create({ header: { backgroundColor: color.canvas }, headerTitle: { color: color.ink, fontFamily: font.semiBold, fontSize: 16 }, tabBar: { backgroundColor: color.surface, borderTopColor: color.line, height: 70, paddingTop: 8, paddingBottom: 7 }, tabLabel: { fontFamily: font.semiBold, fontSize: 11, marginTop: 2 } });
