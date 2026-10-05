import { Redirect } from 'expo-router';
import { ImpactView } from '@/components/impact-view';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileDestination } from '@/lib/mobile-routing';

export default function ImpactHistory() { const { session, loading, role, student } = useAuth(); const { t } = useAppLocale(); const destination = resolveMobileDestination({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null }); if (destination === 'loading') return <Loading label={t('common.loading')} />; if (destination === 'student') return <Redirect href="/(student)/(tabs)/impact" />; if (destination !== 'impact-history') return <Redirect href={destination === 'verification' ? '/verification' : destination === 'role-boundary' ? '/role-boundary' : '/(auth)/login'} />; return <ImpactView historyOnly />; }
