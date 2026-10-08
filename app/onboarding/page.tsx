
import Link from "next/link";
import { parseAuthIntent } from "@/lib/auth-routing";
import type { WebLocale } from "@/lib/i18n/web";
import { webT } from "@/lib/i18n/web";
import { getWebLocale } from "@/lib/i18n/server";

const details: Record<WebLocale, { returning: string; newAccount: string; whatYouGet: string; whatHappens: string; studentBenefit: string; studentNext: string; giverBenefit: string; giverNext: string; invitationOnly: string; existingAccess: string }> = {
  en: { returning: 'Already have an account? Sign in', newAccount: 'New account', whatYouGet: 'What you get:', whatHappens: 'What happens next:', studentBenefit: 'Experiences available to verified students.', studentNext: 'Create your account, continue verification in the app, then discover and claim experiences.', giverBenefit: 'You can fund experiences and see safely available giving updates.', giverNext: 'Create a Giver account, choose an experience, and make it possible for a student.', invitationOnly: 'Invitation only', existingAccess: 'Existing access' },
  ro: { returning: 'Ai deja un cont? Intră în cont', newAccount: 'Cont nou', whatYouGet: 'Ce primești:', whatHappens: 'Ce urmează:', studentBenefit: 'Experiențe disponibile pentru studenții verificați.', studentNext: 'Creezi contul, continui verificarea în aplicație, apoi descoperi și revendici experiențe.', giverBenefit: 'Poți finanța experiențe și vedea contribuțiile disponibile în siguranță.', giverNext: 'Creezi contul Giver, alegi o experiență și o faci posibilă pentru un student.', invitationOnly: 'Doar cu invitație', existingAccess: 'Acces existent' },
  tr: { returning: 'Zaten hesabınız var mı? Giriş yap', newAccount: 'Yeni hesap', whatYouGet: 'Ne elde edersiniz:', whatHappens: 'Sonraki adım:', studentBenefit: 'Doğrulanmış öğrenciler için sunulan deneyimler.', studentNext: 'Hesabınızı oluşturun, uygulamada doğrulamaya devam edin, sonra deneyimleri keşfedin ve alın.', giverBenefit: 'Deneyimleri finanse edebilir ve güvenle sunulan katkı güncellemelerini görebilirsiniz.', giverNext: 'Bir Giver hesabı oluşturun, bir deneyim seçin ve onu bir öğrenci için mümkün kılın.', invitationOnly: 'Yalnızca davetle', existingAccess: 'Mevcut erişim' },
  ar: { returning: 'هل لديك حساب بالفعل؟ سجّل الدخول', newAccount: 'حساب جديد', whatYouGet: 'ما الذي تحصل عليه:', whatHappens: 'ماذا يحدث بعد ذلك:', studentBenefit: 'تجارب متاحة للطلاب الذين تم التحقق منهم.', studentNext: 'أنشئ حسابك، وأكمل التحقق في التطبيق، ثم اكتشف التجارب واحصل عليها.', giverBenefit: 'يمكنك تمويل التجارب ورؤية تحديثات العطاء المتاحة بأمان.', giverNext: 'أنشئ حساب مانح، واختر تجربة، واجعلها ممكنة لطالب.', invitationOnly: 'بدعوة فقط', existingAccess: 'وصول قائم' },
};

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const [locale, query] = await Promise.all([getWebLocale(), searchParams]);
  const selectedRole = parseAuthIntent(query.role);
  const copy = details[locale];
  const paths = [
    { role: 'student', title: 'join.studentTitle', copy: 'join.studentCopy', benefit: copy.studentBenefit, next: copy.studentNext, action: 'join.studentAction', href: '/login?intent=student&returnTo=/student' },
    { role: 'giver', title: 'join.giverTitle', copy: 'join.giverCopy', benefit: copy.giverBenefit, next: copy.giverNext, action: 'join.giverAction', href: '/login?intent=giver&returnTo=/giver' },
  ] as const;
  const invitations = [
    { title: 'join.partnerTitle', copy: 'join.partnerCopy' },
    { title: 'join.organizationTitle', copy: 'join.organizationCopy' },
  ] as const;
  return <main className="shell auth-page"><section className="auth-intro"><h1>{webT(locale, 'join.title')}</h1><p>{webT(locale, 'join.intro')}</p><p className="auth-path-link"><Link href="/login">{copy.returning}</Link></p></section><section className="join-grid" aria-label={webT(locale, 'join.title')}>{paths.map((path) => <article className={`join-card${selectedRole === path.role ? ' join-card-selected' : ''}`} key={path.href}><span className="join-card-kicker">{copy.newAccount}</span><h2>{webT(locale, path.title)}</h2><p>{webT(locale, path.copy)}</p><p className="join-card-benefit"><strong>{copy.whatYouGet}</strong> {path.benefit}</p><p className="join-card-next"><strong>{copy.whatHappens}</strong> {path.next}</p><Link className="btn mt-5" href={path.href}>{webT(locale, path.action)}</Link></article>)}{invitations.map((invitation) => <article className="join-card join-card-muted" key={invitation.title}><span className="join-card-kicker">{copy.invitationOnly}</span><h2>{webT(locale, invitation.title)}</h2><p>{webT(locale, invitation.copy)}</p></article>)}<article className="join-card join-card-muted"><span className="join-card-kicker">{copy.existingAccess}</span><h2>{webT(locale, 'join.adminTitle')}</h2><p>{webT(locale, 'join.adminCopy')}</p><Link className="text-link mt-5" href="/login">{webT(locale, 'join.adminAction')}</Link></article></section></main>;
}
