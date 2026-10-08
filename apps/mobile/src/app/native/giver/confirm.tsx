import { useEffect, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Loading } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useAppLocale } from '@/i18n';
import { authorizationCodeFromParams, completeGiverConfirmation } from '@/lib/native-giver-confirmation';
import { supabase } from '@/lib/supabase';

export default function GiverConfirmation() {
  const params = useLocalSearchParams<Record<string, string | string[]>>(); const { refreshStudent } = useAuth(); const { t } = useAppLocale(); const [invalid, setInvalid] = useState(false);
  useEffect(() => { const code = authorizationCodeFromParams(params); if (!code) { setInvalid(true); return; } void completeGiverConfirmation(code, async (value) => { const result = await supabase.auth.exchangeCodeForSession(value); return { data: { session: result.data.session ? { user: { id: result.data.session.user.id } } : null }, error: result.error }; }, refreshStudent).then((ok) => { if (ok) router.replace('/'); else setInvalid(true); }); }, [params, refreshStudent]);
  if (invalid) return <Redirect href="/(auth)/login" />;
  return <Loading label={t('auth.giverSignup.confirming')} />;
}
