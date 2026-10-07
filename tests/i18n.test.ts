import { describe, expect, it } from 'vitest';
import { localizedWebCategory, resolveWebLocale, webLocales, webLocaleFromAcceptLanguage, webT, workspaceMessages } from '@/lib/i18n/web';
import { webPresentation } from '@/lib/i18n/presentation';
import { organizationCategories, organizationCopies, organizationCopy } from '@/lib/i18n/organization';

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

  it('keeps status and redemption presentation dictionaries in parity', () => {
    const expected = Object.keys(webPresentation.ro).sort();
    for (const locale of webLocales) expect(Object.keys(webPresentation[locale]).sort()).toEqual(expected);
  });

  it('keeps Organization Operator copy and controlled categories in parity', () => {
    const copyKeys = Object.keys(organizationCopies.ro).sort();
    const categoryKeys = Object.keys(organizationCategories.ro).sort();
    for (const locale of webLocales) {
      expect(Object.keys(organizationCopies[locale]).sort()).toEqual(copyKeys);
      expect(Object.keys(organizationCategories[locale]).sort()).toEqual(categoryKeys);
    }
  });

  it('serves Organization Operator copy in the selected Romanian and Turkish locales', () => {
    expect(organizationCopy('ro').queue).toBe('Coadă de acțiuni');
    expect(organizationCopy('tr').queue).toBe('İşlem kuyruğu');
  });

  it('interpolates common public copy and localizes controlled category slugs', () => {
    expect(webT('en', 'home.available', { count: 4 })).toBe('4 available');
    expect(webT('tr', 'giver.fundedMany', { count: 4 })).toBe('4 deneyim finanse edildi');
    expect(webT('ar', 'partner.cameraDetected')).toBe('تم اكتشاف رمز QR. جارٍ التحقق…');
    expect(localizedWebCategory('ar', 'cinema', 'Cinema')).toBe('سينما');
  });
});
