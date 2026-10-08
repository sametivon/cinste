import { Redirect } from 'expo-router';
import { useAuth } from '@/context/auth';
import { Loading } from '@/components/ui';
import { useAppLocale } from '@/i18n';
import { resolveMobileEntry } from '@/lib/mobile-routing';

export default function Index() { const { session, loading, role, student, workspaceEnvelope, selectedWorkspace, orientationComplete } = useAuth(); const { t } = useAppLocale(); const destination = resolveMobileEntry({ hasSession: Boolean(session), resolved: !loading, role, verificationStatus: student?.verification_status ?? null, envelope: workspaceEnvelope, selectedWorkspace, orientationComplete }); if (destination === 'loading') return <Loading label={t('common.loading')}/>; return <Redirect href={(destination === 'orientation' ? '/orientation' : destination === 'student' ? '/(student)/(tabs)' : destination === 'giver' ? '/giver' : destination === 'workspace-chooser' ? '/workspace-chooser' : destination === 'impact-history' ? '/impact-history' : destination === 'verification' ? '/verification' : destination === 'role-boundary' ? '/role-boundary' : '/(auth)/login') as any} />; }
