import Link from 'next/link';
import { login, signup, signupGiver } from '@/app/actions';
import { AuthSubmitButton } from '@/components/auth-submit-button';
import { getWebLocale } from '@/lib/i18n/server';
import { webT } from '@/lib/i18n/web';
import { parseAuthIntent, safeAuthReturnTo } from '@/lib/auth-routing';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; status?: string; intent?: string; returnTo?: string }> }) {
  const [q, locale] = await Promise.all([searchParams, getWebLocale()]);
  const intent = parseAuthIntent(q.intent);
  const returnTo = safeAuthReturnTo(q.returnTo);
  const isGiver = intent === 'giver';
  const canCreateAccount = Boolean(intent);
  const context = <><input type="hidden" name="intent" value={intent ?? ''}/><input type="hidden" name="returnTo" value={returnTo ?? ''}/></>;
  return <main className="shell auth-page"><section className="auth-intro"><span className="auth-kicker">CINSTE</span><h1>{webT(locale, 'login.welcome')}</h1><p>{webT(locale, isGiver ? 'login.giverIntro' : 'login.intro')}</p></section>{q.error && <p className="auth-error" role="alert">{q.error}</p>}{q.status === 'confirm-email' && <p className="auth-notice" role="status">{webT(locale, 'login.confirmEmail')}</p>}<div className={canCreateAccount ? 'auth-grid' : 'auth-grid auth-grid-single'}><form action={login} className="auth-card"><div><h2>{webT(locale, 'login.signIn')}</h2><p>{webT(locale, 'login.signInHint')}</p></div>{context}<label htmlFor="login-email">{webT(locale, 'login.email')}</label><input id="login-email" name="email" type="email" autoComplete="email" required/><label htmlFor="login-password">{webT(locale, 'login.password')}</label><input id="login-password" name="password" type="password" autoComplete="current-password" minLength={8} required/><AuthSubmitButton locale={locale}>{webT(locale, 'login.signIn')}</AuthSubmitButton>{!canCreateAccount && <p className="auth-path-link">{webT(locale, 'login.newHere')} <Link href="/onboarding">{webT(locale, 'login.choosePath')}</Link></p>}</form>{canCreateAccount && <form action={isGiver ? signupGiver : signup} className="auth-card auth-card-secondary"><div><h2>{webT(locale, 'login.signUp')}</h2><p>{webT(locale, isGiver ? 'login.giverSignUpHint' : 'login.signUpHint')}</p></div>{!isGiver && context}<label htmlFor="signup-name">{webT(locale, 'login.name')}</label><input id="signup-name" name="displayName" autoComplete="name"/><label htmlFor="signup-email">{webT(locale, 'login.email')}</label><input id="signup-email" name="email" type="email" autoComplete="email" required/><label htmlFor="signup-password">{webT(locale, 'login.password')}</label><input id="signup-password" name="password" type="password" autoComplete="new-password" minLength={8} required/><AuthSubmitButton locale={locale} variant="secondary">{webT(locale, 'login.create')}</AuthSubmitButton></form>}</div></main>;
}
