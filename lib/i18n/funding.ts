import type { WebLocale } from '@/lib/i18n/web';

const fundingMessages = {
  ro: {
    denied: 'Acest cont nu poate finanța experiențe.',
    unavailable: 'Finanțarea nu a putut fi procesată în siguranță. Încearcă din nou.',
  },
  en: {
    denied: 'This account cannot fund experiences.',
    unavailable: 'Funding could not be processed safely. Please try again.',
  },
  tr: {
    denied: 'Bu hesap deneyimleri finanse edemez.',
    unavailable: 'Finansman güvenli bir şekilde işlenemedi. Lütfen tekrar deneyin.',
  },
  ar: {
    denied: 'لا يمكن لهذا الحساب تمويل التجارب.',
    unavailable: 'تعذّرت معالجة التمويل بأمان. يُرجى المحاولة مرة أخرى.',
  },
} as const satisfies Record<WebLocale, Record<'denied' | 'unavailable', string>>;

export function fundingT(locale: WebLocale, key: 'denied' | 'unavailable') {
  return fundingMessages[locale][key];
}
