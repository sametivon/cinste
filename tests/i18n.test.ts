import { describe, expect, it } from 'vitest';
import { localizedWebCategory, resolveWebLocale, webLocales, webLocaleFromAcceptLanguage, webT, workspaceMessages } from '@/lib/i18n/web';

describe('web i18n foundation', () => {
  it('defaults to Romanian and recognizes supported browser locales', () => {
    expect(resolveWebLocale('de-DE')).toBe('ro');
    expect(webLocaleFromAcceptLanguage('tr-TR,tr;q=0.9')).toBe('tr');
    expect(webLocaleFromAcceptLanguage('ro-RO,ro;q=0.9', 'ar')).toBe('ar');
  });

  it('keeps a selected locale over the browser locale on refresh and navigation', () => {
    expect(webLocaleFromAcceptLanguage('ro-RO,ro;q=0.9', 'tr')).toBe('tr');
    expect(webLocaleFromAcceptLanguage('tr-TR,tr;q=0.9', 'ro')).toBe('ro');
  });

  it('keeps the authenticated workspace dictionary in parity for every supported locale', () => {
    const expected = Object.keys(workspaceMessages.ro).sort();
    for (const locale of webLocales) expect(Object.keys(workspaceMessages[locale]).sort()).toEqual(expected);
  });

  it('interpolates common public copy and localizes controlled category slugs', () => {
    expect(webT('en', 'home.available', { count: 4 })).toBe('4 available');
    expect(localizedWebCategory('ar', 'cinema', 'Cinema')).toBe('سينما');
  });
});
