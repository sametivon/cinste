import type { AppRole } from '@/lib/types';
import type { WebLocale } from '@/lib/i18n/web';

export type Workspace = 'admin' | 'partner' | 'giver' | 'organization' | 'student';
export type WorkspaceOption = { workspace: Workspace; href: string; label: string; description: string };
export type AuthIntent = 'student' | 'giver';

/** Public routes that may be restored after an auth form submission. */
export const safeAuthReturnPaths = ['/giver', '/student', '/account'] as const;
export const publicRoleDestinations = {
  student: '/onboarding?role=student',
  giver: '/onboarding?role=giver',
} as const;

export function parseAuthIntent(value: unknown): AuthIntent | undefined {
  return value === 'student' || value === 'giver' ? value : undefined;
}

// This intentionally accepts only whole, known internal paths. In particular,
// it does not decode input before matching: encoded separators and schemes must
// never become a redirect destination.
export function safeAuthReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.includes('%') || value.includes('\\') || value.includes('#') || value.includes('?')) return undefined;
  return (safeAuthReturnPaths as readonly string[]).includes(value) ? value : undefined;
}
export function webAuthConfirmationUrl(next: '/student' | '/giver') {
  const url = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');
  url.searchParams.set('next', next);
  return url.toString();
}
export function accountDestination(role: AppRole | null | undefined) { if (role === 'admin') return '/admin'; if (role === 'partner') return '/partner'; if (role === 'giver') return '/giver'; return '/student'; }
const profileWorkspace = (role: AppRole | null | undefined): Workspace => role === 'admin' || role === 'partner' || role === 'giver' ? role : 'student';
const href: Record<Workspace, string> = { admin: '/admin', partner: '/partner', giver: '/giver', organization: '/organization', student: '/student' };
const copy: Record<WebLocale, Record<Workspace, [string, string]>> = {
  ro: { admin: ['Admin', 'Gestionează operațiunile CINSTE.'], partner: ['Partener', 'Scanează și răscumpără experiențe CINSTE.'], giver: ['Oferă o experiență', 'Finanțează o experiență pentru un student.'], organization: ['Operator organizație', 'Gestionează oportunitățile Impact ale organizației.'], student: ['Aplicația pentru studenți', 'Continuă în aplicația mobilă CINSTE.'] },
  en: { admin: ['Admin', 'Manage CINSTE operations.'], partner: ['Partner', 'Scan and redeem CINSTE experiences.'], giver: ['Give an experience', 'Fund an experience for a student.'], organization: ['Organization operator', 'Manage your organization’s Impact opportunities.'], student: ['Student app', 'Continue in the CINSTE mobile app.'] },
  tr: { admin: ['Yönetici', 'CINSTE işlemlerini yönetin.'], partner: ['İş ortağı', 'CINSTE deneyimlerini tarayın ve kullandırın.'], giver: ['Bir deneyim sun', 'Bir öğrenci için deneyim finanse edin.'], organization: ['Kuruluş operatörü', 'Kuruluşunuzun Impact fırsatlarını yönetin.'], student: ['Öğrenci uygulaması', 'CINSTE mobil uygulamasında devam edin.'] },
  ar: { admin: ['المشرف', 'أدر عمليات CINSTE.'], partner: ['الشريك', 'امسح تجارب CINSTE واستردها.'], giver: ['قدّم تجربة', 'موّل تجربة لطالب.'], organization: ['مشغّل المؤسسة', 'أدر فرص Impact لمؤسستك.'], student: ['تطبيق الطالب', 'تابع في تطبيق CINSTE للجوال.'] },
};
export function availableWorkspaces(role: AppRole | null | undefined, hasOrganizationAssignment: boolean, locale: WebLocale = 'ro'): WorkspaceOption[] { const workspaces: Workspace[] = [profileWorkspace(role)]; if (hasOrganizationAssignment) { if (workspaces[0] === 'student') workspaces.unshift('organization'); else workspaces.push('organization'); } return workspaces.map((workspace) => ({ workspace, href: href[workspace], label: copy[locale][workspace][0], description: copy[locale][workspace][1] })); }

export function logoDestination(authenticated: boolean, role: AppRole | null | undefined, hasOrganizationAssignment: boolean) {
  if (!authenticated) return '/';
  const workspaces = availableWorkspaces(role, hasOrganizationAssignment);
  return workspaces.length === 1 ? workspaces[0].href : '/account';
}

/**
 * Intent selects a public continuation only for a matching existing profile.
 * It never grants or rewrites workspace authority; existing multi-workspace
 * resolution remains the fallback for every conflicting or absent intent.
 */
export function postAuthDestination(role: AppRole | null | undefined, hasOrganizationAssignment: boolean, intent?: AuthIntent, returnTo?: string) {
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const workspaces = availableWorkspaces(role, hasOrganizationAssignment);
  if (workspaces.length > 1) return '/account';
  const destination = workspaces[0].href;
  if (role === 'giver' && (intent === 'giver' || safeReturnTo === '/giver')) return '/giver';
  if (role === 'student' && (intent === 'student' || safeReturnTo === '/student')) return '/student';
  return destination;
}
