import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Loading } from '@/components/ui';
import { useAppLocale } from '@/i18n';
import { resolveMobileDestination } from '@/lib/mobile-routing';

export default function Index() { const { session, loading, role, student } = useAuth(); const { t } = useAppLocale(); const destination = resolveMobileDestination({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null }); if (destination === 'loading') return <Loading label={t('common.loading')}/>; return <Redirect href={destination === 'student' ? '/(student)/(tabs)' : destination === 'verification' ? '/verification' : destination === 'role-boundary' ? '/role-boundary' : '/(auth)/login'} />; }
