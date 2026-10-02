import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Loading } from '@/components/ui';
import { useAppLocale } from '@/i18n';
export default function AuthLayout() { const { session, loading } = useAuth(); const { t } = useAppLocale(); if (loading) return <Loading label={t('common.loading')}/>; if (session) return <Redirect href="/"/>; return <Stack screenOptions={{ headerShown: false }}/>; }
