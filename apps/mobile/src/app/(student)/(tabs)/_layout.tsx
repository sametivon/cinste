import { StyleSheet, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';

import { AppIcon } from '@/components/app-icon';
import { color } from '@/design/tokens';
import { useAppLocale } from '@/i18n';

export default function TabsLayout() {
  const { t } = useAppLocale();
  const icon = (name: 'discover' | 'cinste' | 'impact' | 'profile') => ({ color: tint }: { color: ColorValue }) => <AppIcon name={name} size={22} color={tint} />;
  return <Tabs screenOptions={{ headerStyle: styles.header, headerShadowVisible: false, headerTitleStyle: styles.headerTitle, tabBarActiveTintColor: color.brand, tabBarInactiveTintColor: color.muted, tabBarStyle: styles.tabBar, tabBarLabelStyle: styles.tabLabel, tabBarHideOnKeyboard: true }}><Tabs.Screen name="index" options={{ title: t('tabs.discover'), tabBarIcon: icon('discover') }}/><Tabs.Screen name="my-cinste" options={{ title: t('tabs.myCinste'), tabBarIcon: icon('cinste') }}/><Tabs.Screen name="impact" options={{ title: t('tabs.impact'), tabBarIcon: icon('impact') }}/><Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('profile') }}/></Tabs>;
}

const styles = StyleSheet.create({ header: { backgroundColor: color.canvas }, headerTitle: { color: color.ink, fontWeight: '800' }, tabBar: { backgroundColor: color.surface, borderTopColor: color.line, height: 66, paddingTop: 7 }, tabLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 } });
