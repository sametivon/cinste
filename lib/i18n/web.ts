export const webLocales = ['ro', 'en', 'tr', 'ar'] as const;
export type WebLocale = (typeof webLocales)[number];

type MessageValues = Record<string, string | number>;

const messages = {
  ro: { 'nav.discover': 'Descoperă', 'nav.give': 'Vreau să fac cinste', 'nav.account': 'Contul meu', 'nav.logout': 'Ieși', 'nav.login': 'Intră', 'home.tagline': 'FAC EU CINSTE', 'home.title': 'Azi cine face cinste?', 'home.subtitle': 'Lucruri bune, oferite de oameni și companii pentru studenți verificați.', 'home.student': 'Sunt student', 'home.all': 'Toate', 'home.available': '{{count}} disponibile', 'home.free': 'GRATIS', 'home.emptyTitle': 'Momentan nu mai avem cinste disponibile.', 'home.emptyBody': 'Revino în curând. Pregătim următoarele.', 'fulfillment.instant': 'Disponibil acum', 'fulfillment.appointment_required': 'Necesită programare', 'fulfillment.scheduled_event': 'Eveniment programat', 'category.food-drink': 'Mâncare și băuturi', 'category.cinema': 'Cinema', 'category.hair-grooming': 'Păr și îngrijire', 'category.beauty': 'Frumusețe și îngrijire personală', 'category.fitness': 'Fitness și sport', 'category.entertainment': 'Divertisment', 'category.activities': 'Activități', 'category.education': 'Educație', 'category.mobility': 'Mobilitate', 'category.other': 'Altele' },
  en: { 'nav.discover': 'Discover', 'nav.give': 'Treat someone', 'nav.account': 'My account', 'nav.logout': 'Log out', 'nav.login': 'Log in', 'home.tagline': 'MY TREAT', 'home.title': 'Who is treating today?', 'home.subtitle': 'Good things from people and companies for verified students.', 'home.student': 'I’m a student', 'home.all': 'All', 'home.available': '{{count}} available', 'home.free': 'FREE', 'home.emptyTitle': 'There are no treats available right now.', 'home.emptyBody': 'Check back soon. More are on the way.', 'fulfillment.instant': 'Available now', 'fulfillment.appointment_required': 'Booking required', 'fulfillment.scheduled_event': 'Scheduled event', 'category.food-drink': 'Food & Drink', 'category.cinema': 'Cinema', 'category.hair-grooming': 'Hair & Grooming', 'category.beauty': 'Beauty & Personal Care', 'category.fitness': 'Fitness & Sports', 'category.entertainment': 'Entertainment', 'category.activities': 'Activities', 'category.education': 'Education', 'category.mobility': 'Mobility', 'category.other': 'Other' },
  tr: { 'nav.discover': 'Keşfet', 'nav.give': 'Ismarla', 'nav.account': 'Hesabım', 'nav.logout': 'Çıkış yap', 'nav.login': 'Giriş yap', 'home.tagline': 'BENDEN', 'home.title': 'Bugün kim ısmarlıyor?', 'home.subtitle': 'Doğrulanmış öğrenciler için kişilerden ve şirketlerden güzel deneyimler.', 'home.student': 'Öğrenciyim', 'home.all': 'Tümü', 'home.available': '{{count}} mevcut', 'home.free': 'ÜCRETSİZ', 'home.emptyTitle': 'Şu an uygun ikram yok.', 'home.emptyBody': 'Yakında tekrar gel. Yenileri hazırlanıyor.', 'fulfillment.instant': 'Şimdi kullanılabilir', 'fulfillment.appointment_required': 'Randevu gerekli', 'fulfillment.scheduled_event': 'Planlı etkinlik', 'category.food-drink': 'Yeme İçme', 'category.cinema': 'Sinema', 'category.hair-grooming': 'Saç ve bakım', 'category.beauty': 'Güzellik ve kişisel bakım', 'category.fitness': 'Fitness ve spor', 'category.entertainment': 'Eğlence', 'category.activities': 'Aktiviteler', 'category.education': 'Eğitim', 'category.mobility': 'Ulaşım', 'category.other': 'Diğer' },
  ar: { 'nav.discover': 'اكتشف', 'nav.give': 'قدّم ضيافة', 'nav.account': 'حسابي', 'nav.logout': 'تسجيل الخروج', 'nav.login': 'تسجيل الدخول', 'home.tagline': 'عليّ الحساب', 'home.title': 'من سيقدّم ضيافة اليوم؟', 'home.subtitle': 'تجارب جميلة من أشخاص وشركات لطلاب تم التحقق منهم.', 'home.student': 'أنا طالب', 'home.all': 'الكل', 'home.available': '{{count}} متاح', 'home.free': 'مجانًا', 'home.emptyTitle': 'لا توجد ضيافات متاحة الآن.', 'home.emptyBody': 'عد قريبًا، فالمزيد في الطريق.', 'fulfillment.instant': 'متاح الآن', 'fulfillment.appointment_required': 'يتطلب حجزًا', 'fulfillment.scheduled_event': 'فعالية مجدولة', 'category.food-drink': 'طعام وشراب', 'category.cinema': 'سينما', 'category.hair-grooming': 'الشعر والعناية', 'category.beauty': 'الجمال والعناية الشخصية', 'category.fitness': 'اللياقة والرياضة', 'category.entertainment': 'ترفيه', 'category.activities': 'أنشطة', 'category.education': 'تعليم', 'category.mobility': 'تنقل', 'category.other': 'أخرى' },
} as const;

export function resolveWebLocale(value?: string | null): WebLocale {
  const language = value?.toLowerCase().split('-')[0];
  return webLocales.includes(language as WebLocale) ? language as WebLocale : 'ro';
}

export function webLocaleFromAcceptLanguage(value?: string | null, savedLocale?: string | null): WebLocale {
  return savedLocale ? resolveWebLocale(savedLocale) : resolveWebLocale(value?.split(',')[0]);
}

export function webT(locale: WebLocale, key: keyof typeof messages.ro, values: MessageValues = {}) {
  let message: string = messages[locale][key] ?? messages.ro[key];
  for (const [name, value] of Object.entries(values)) message = message.replace(`{{${name}}}`, String(value));
  return message;
}

export function localizedWebCategory(locale: WebLocale, slug: string, fallback: string) {
  const key = `category.${slug}` as keyof typeof messages.ro;
  return key in messages.ro ? webT(locale, key) : fallback;
}

export function localizedWebFulfillment(locale: WebLocale, type: string, fallback: string) {
  const key = `fulfillment.${type}` as keyof typeof messages.ro;
  return key in messages.ro ? webT(locale, key) : fallback;
}
