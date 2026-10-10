import type { WebLocale } from './i18n/web';

export type CommunityImpactOutcome = {
  outcome_state: 'available' | 'privacy_suppressed';
  completed_impact_activities: number | null;
  total_impact_hours: number | null;
  participating_students: number | null;
};

export function communityImpactOutcomeCopy(locale: WebLocale) {
  const copy = {
    ro: { title: 'Impact în comunitate', hint: 'Rezultate agregate, fără a identifica studenți sau a atribui o activitate unui Giver.', activities: 'Activități Impact finalizate', hours: 'Ore Impact', students: 'Studenți participanți', hidden: 'Detaliile Impact sunt ascunse până când grupul agregat include cel puțin cinci studenți.' },
    en: { title: 'Community Impact', hint: 'Aggregated outcomes without identifying students or attributing an activity to a Giver.', activities: 'Completed Impact activities', hours: 'Impact hours', students: 'Participating Students', hidden: 'Impact details stay hidden until the aggregate includes at least five Students.' },
    tr: { title: 'Topluluk Etkisi', hint: 'Öğrencileri tanımlamadan veya bir etkinliği belirli bir Giver’a bağlamadan toplu sonuçlar.', activities: 'Tamamlanan Impact etkinlikleri', hours: 'Impact saatleri', students: 'Katılan Öğrenciler', hidden: 'Toplam en az beş Öğrenci içerene kadar Impact ayrıntıları gizli kalır.' },
    ar: { title: 'الأثر المجتمعي', hint: 'نتائج مجمّعة من دون تحديد هوية الطلاب أو ربط نشاط بجهة مانحة محددة.', activities: 'أنشطة Impact المكتملة', hours: 'ساعات Impact', students: 'الطلاب المشاركون', hidden: 'تبقى تفاصيل Impact مخفية حتى يشمل التجميع خمسة طلاب على الأقل.' },
  } as const;
  return copy[locale];
}
