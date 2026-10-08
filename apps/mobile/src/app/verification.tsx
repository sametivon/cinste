import { Redirect } from 'expo-router';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { resolveMobileEntry } from '@/lib/mobile-routing';
import VerificationForm from './(student)/verification';

export default function VerificationEntry() {
  const { session, loading, role, student, orientationComplete } = useAuth();
  const { t } = useAppLocale();
  const destination = resolveMobileEntry({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, orientationComplete });
  if (destination === 'loading') return <Loading label={t('common.loading')} />;
  if (destination === 'orientation') return <Redirect href="/orientation" />;
  return <VerificationForm />;
}
