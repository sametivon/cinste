import type { AppRole } from '@/lib/types';
import type { WebLocale } from '@/lib/i18n/web';

export type Workspace = 'admin' | 'partner' | 'giver' | 'organization' | 'student';
export type WorkspaceOption = { workspace: Workspace; href: string; label: string; description: string };
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
