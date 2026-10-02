import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { shouldRefreshOnForeground } from '@/lib/freshness';
import type { AppRole, VerificationStatus } from '@/lib/types';

type StudentState = { full_name: string; university_id: string | null; faculty: string | null; verification_status: VerificationStatus; rejection_reason: string | null } | null;
type AuthContextValue = { session: Session | null; loading: boolean; role: AppRole | null; student: StudentState; refreshStudent: () => Promise<StudentState>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [role, setRole] = useState<AppRole | null>(null); const [student, setStudent] = useState<StudentState>(null); const [loading, setLoading] = useState(true);
  const refreshStudent = useCallback(async (userId?: string) => { const id = userId ?? (await supabase.auth.getUser()).data.user?.id; if (!id) { setRole(null); setStudent(null); return null; } const { data: profile } = await supabase.from('profiles').select('role').eq('id', id).maybeSingle(); const nextRole = (profile?.role ?? null) as AppRole | null; setRole(nextRole); if (nextRole !== 'student') { setStudent(null); return null; } const { data } = await supabase.from('student_profiles').select('full_name,university_id,faculty,verification_status').eq('user_id', id).maybeSingle(); if (!data) { setStudent(null); return null; } let rejection_reason: string | null = null; if (data.verification_status === 'rejected') { const { data: rejection } = await supabase.from('student_verifications').select('rejection_reason').eq('student_id', id).eq('status', 'rejected').order('reviewed_at', { ascending: false }).limit(1).maybeSingle(); rejection_reason = rejection?.rejection_reason ?? null; } const next = { ...data, rejection_reason } as StudentState; setStudent(next); return next; }, []);
  const resolveSession = useCallback(async (next: Session | null) => { setLoading(true); setSession(next); try { if (next) await refreshStudent(next.user.id); else { setRole(null); setStudent(null); } } finally { setLoading(false); } }, [refreshStudent]);
  useEffect(() => { void supabase.auth.getSession().then(({ data: { session: next } }) => resolveSession(next)); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { void resolveSession(next); }); return () => subscription.unsubscribe(); }, [resolveSession]);
  useEffect(() => { const listener = AppState.addEventListener('change', (state) => { if (shouldRefreshOnForeground(state, Boolean(session))) void (async () => { setLoading(true); try { await refreshStudent(); } finally { setLoading(false); } })(); }); return () => listener.remove(); }, [session, refreshStudent]);
  const value = useMemo(() => ({ session, loading, role, student, refreshStudent, signOut: async () => { await supabase.auth.signOut(); } }), [session, loading, role, student, refreshStudent]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
