import { cookies, headers } from 'next/headers';
import { webLocaleCookie, webLocaleFromAcceptLanguage, type WebLocale } from './web';

/** The single server-side locale resolution entry point for the web app. */
export async function getWebLocale(): Promise<WebLocale> {
  const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
  return webLocaleFromAcceptLanguage(
    requestHeaders.get('accept-language'),
    jar.get(webLocaleCookie)?.value,
  );
}
