import Link from 'next/link';
import { login, signup, signupGiver } from '@/app/actions';
import { AuthSubmitButton } from '@/components/auth-submit-button';
import { AuthHero } from '@/components/auth-hero';
import { getWebLocale } from '@/lib/i18n/server';
import { webT, type WebMessageKey } from '@/lib/i18n/web';
import { parseAuthIntent, safeAuthReturnTo } from '@/lib/auth-routing';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; intent?: string; returnTo?: string; mode?: string }> }) {
  const [q, locale] = await Promise.all([searchParams, getWebLocale()]);
  const intent = parseAuthIntent(q.intent);
  const returnTo = safeAuthReturnTo(q.returnTo);
  const isGiver = intent === 'giver';
  const canCreateAccount = Boolean(intent);
  const showSignup = canCreateAccount && q.mode !== 'signin';
  const panel: { title: WebMessageKey; body: WebMessageKey; steps: readonly WebMessageKey[] } = intent === 'giver'
    ? { title: 'login.giverSignUpHint', body: 'login.giverIntro', steps: ['giver.fund', 'giver.available', 'giver.outcomes'] as const }
    : intent === 'student'
      ? { title: 'join.studentTitle', body: 'join.studentCopy', steps: ['join.studentTitle', 'join.studentAction', 'home.all'] as const }
      : { title: 'login.welcome', body: 'login.intro', steps: ['join.studentTitle', 'join.giverTitle', 'join.title'] as const };
  const context = <><input type="hidden" name="intent" value={intent ?? ''}/><input type="hidden" name="returnTo" value={returnTo ?? ''}/></>;
  const roleQuery = intent ? `?intent=${intent}&returnTo=${returnTo ?? (isGiver ? '/giver' : '/student')}` : '';
  const signupForm = <form action={isGiver ? signupGiver : signup} className="auth-card auth-card-primary"><div><h2>{webT(locale, 'login.signUp')}</h2><p>{webT(locale, isGiver ? 'login.giverSignUpHint' : 'login.signUpHint')}</p></div>{!isGiver && context}<label htmlFor="signup-name">{webT(locale, 'login.name')}</label><input id="signup-name" name="displayName" autoComplete="name"/><label htmlFor="signup-email">{webT(locale, 'login.email')}</label><input id="signup-email" name="email" type="email" autoComplete="email" required/><label htmlFor="signup-password">{webT(locale, 'login.password')}</label><input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required/><AuthSubmitButton locale={locale}>{webT(locale, 'login.create')}</AuthSubmitButton><p className="auth-switch">{webT(locale, 'login.signInHint')} <Link href={`${roleQuery}&mode=signin`}>{webT(locale, 'login.signIn')}</Link></p></form>;
  const loginForm = <form action={login} className="auth-card"><div><h2>{webT(locale, 'login.signIn')}</h2><p>{webT(locale, 'login.signInHint')}</p></div>{context}<label htmlFor="login-email">{webT(locale, 'login.email')}</label><input id="login-email" name="email" type="email" autoComplete="email" required/><label htmlFor="login-password">{webT(locale, 'login.password')}</label><input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required/><AuthSubmitButton locale={locale}>{webT(locale, 'login.signIn')}</AuthSubmitButton>{canCreateAccount ? <p className="auth-switch"><Link href={`/login${roleQuery}`}>{webT(locale, 'login.create')}</Link></p> : <p className="auth-path-link">{webT(locale, 'login.newHere')} <Link href="/onboarding">{webT(locale, 'login.choosePath')}</Link></p>}</form>;
  return <main className="shell auth-page"><AuthHero variant={intent ?? 'generic'} title={webT(locale, panel.title)} body={webT(locale, showSignup ? (isGiver ? 'login.giverSignUpHint' : 'login.signUpHint') : panel.body)} steps={panel.steps.map((step) => webT(locale, step))} />{q.error && <p className="auth-error" role="alert">{q.error}</p>}{q.status === 'confirm-email' && <p className="auth-notice" role="status">{webT(locale, 'login.confirmEmail')}</p>}<div className="auth-grid auth-grid-single">{showSignup ? signupForm : loginForm}</div></main>;
}
