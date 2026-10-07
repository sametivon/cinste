export const webLocales = ['ro', 'en', 'tr', 'ar'] as const;
export type WebLocale = (typeof webLocales)[number];

type MessageValues = Record<string, string | number>;

export const webLocaleCookie = 'cinste_web_locale';

/**
 * Copy that is shared by authenticated web workspaces.  Every locale owns the
 * same keys; `webT` deliberately does not fall back to Romanian for these.
 */
export const workspaceMessages = {
  ro: {
    'common.processing': 'Se procesează…', 'common.working': 'Se lucrează…', 'common.back': 'Înapoi', 'common.close': 'Închide', 'common.refreshRetry': 'Reîmprospătează pagina și încearcă din nou.', 'common.notRecorded': 'Neînregistrat', 'common.unavailable': 'Indisponibil',
    'login.welcome': 'Bine ai venit', 'login.intro': 'Intră pentru a continua în spațiul tău CINSTE sau creează un cont nou.', 'login.signIn': 'Intră în cont', 'login.signInHint': 'Folosește datele contului tău existent.', 'login.signUp': 'Cont nou', 'login.signUpHint': 'Un cont nou începe cu experiența de student; accesul la alte spații rămâne atribuit separat.', 'login.email': 'Email', 'login.password': 'Parolă', 'login.name': 'Nume', 'login.create': 'Creează cont',
    'giver.eyebrow': 'CONTRIBUȚIILE MELE', 'giver.title': 'Lucrurile bune merg mai departe.', 'giver.intro': 'Vezi experiențele pe care le-ai făcut posibile, fără a expune detalii despre studenți.', 'giver.outcomes': 'Contribuțiile mele', 'giver.outcomesHint': 'Rezultatele apar numai când pot fi partajate în siguranță.', 'giver.signInTitle': 'Ai mai făcut cinste?', 'giver.signInBody': 'Conectează-te pentru a-ți vedea contribuțiile și rezultatele disponibile în siguranță.', 'giver.signIn': 'CONECTEAZĂ-TE', 'giver.error': 'Contribuțiile tale nu pot fi încărcate acum.', 'giver.empty': 'Încă nu ai făcut cinste.', 'giver.fund': 'Mai fă cinste', 'giver.fundHint': 'Alege o experiență. Plata este simulată în acest MVP local.', 'giver.quantity': 'Cantitate', 'giver.fundButton': 'FĂ CINSTE', 'giver.available': 'Disponibilă acum', 'giver.unavailable': 'Experiența nu este disponibilă pentru revendicări acum.',
    'partner.workspace': 'Partener CINSTE', 'partner.authorized': 'Spațiu autorizat', 'partner.recent': 'Activitate recentă', 'partner.history': 'Răscumpărări recente', 'partner.emptyHistory': 'Încă nu există răscumpărări recente pentru acest partener.', 'partner.confirm': 'Confirmă răscumpărarea', 'partner.confirming': 'Se confirmă…', 'partner.scan': 'Scanează un CINSTE', 'partner.manual': 'Introdu codul în schimb', 'partner.validate': 'Validează codul', 'partner.cameraStart': 'Pornește camera', 'partner.cameraStop': 'Închide scannerul', 'partner.cameraHelp': 'Îndreaptă camera spre codul QR CINSTE.', 'partner.cameraIdle': 'Camera pornește doar când alegi scannerul.',
    'checkout.title': 'Plată de dezvoltare', 'checkout.mock': 'MockPaymentProvider · fără bani reali', 'checkout.total': 'Total', 'checkout.success': 'Simulează plată reușită', 'checkout.failure': 'Simulează eșec',
  },
  en: {
    'common.processing': 'Processing…', 'common.working': 'Working…', 'common.back': 'Back', 'common.close': 'Close', 'common.refreshRetry': 'Refresh the page and try again.', 'common.notRecorded': 'Not recorded', 'common.unavailable': 'Unavailable',
    'login.welcome': 'Welcome', 'login.intro': 'Sign in to continue to your CINSTE workspace or create a new account.', 'login.signIn': 'Sign in', 'login.signInHint': 'Use your existing account details.', 'login.signUp': 'New account', 'login.signUpHint': 'A new account starts with the student experience; other workspaces remain assigned separately.', 'login.email': 'Email', 'login.password': 'Password', 'login.name': 'Name', 'login.create': 'Create account',
    'giver.eyebrow': 'MY GIVING', 'giver.title': 'Good things keep going.', 'giver.intro': 'See the experiences you made possible without exposing student details.', 'giver.outcomes': 'My giving', 'giver.outcomesHint': 'Results appear only when they can be shared safely.', 'giver.signInTitle': 'Have you treated someone before?', 'giver.signInBody': 'Sign in to see your contributions and safely available results.', 'giver.signIn': 'SIGN IN', 'giver.error': 'Your contributions cannot be loaded right now.', 'giver.empty': 'You have not treated anyone yet.', 'giver.fund': 'Treat someone else', 'giver.fundHint': 'Choose an experience. Payment is simulated in this local MVP.', 'giver.quantity': 'Quantity', 'giver.fundButton': 'TREAT SOMEONE', 'giver.available': 'Available now', 'giver.unavailable': 'This experience is not available to claim right now.',
    'partner.workspace': 'CINSTE partner', 'partner.authorized': 'Authorized workspace', 'partner.recent': 'Recent activity', 'partner.history': 'Recent redemptions', 'partner.emptyHistory': 'There are no recent redemptions for this partner yet.', 'partner.confirm': 'Confirm redemption', 'partner.confirming': 'Confirming…', 'partner.scan': 'Scan a CINSTE', 'partner.manual': 'Enter a code instead', 'partner.validate': 'Validate code', 'partner.cameraStart': 'Start camera', 'partner.cameraStop': 'Close scanner', 'partner.cameraHelp': 'Point the camera at the CINSTE QR code.', 'partner.cameraIdle': 'The camera starts only when you choose the scanner.',
    'checkout.title': 'Development payment', 'checkout.mock': 'MockPaymentProvider · no real money', 'checkout.total': 'Total', 'checkout.success': 'Simulate successful payment', 'checkout.failure': 'Simulate failure',
  },
  tr: {
    'common.processing': 'İşleniyor…', 'common.working': 'İşleniyor…', 'common.back': 'Geri', 'common.close': 'Kapat', 'common.refreshRetry': 'Sayfayı yenileyin ve tekrar deneyin.', 'common.notRecorded': 'Kaydedilmedi', 'common.unavailable': 'Kullanılamıyor',
    'login.welcome': 'Hoş geldiniz', 'login.intro': 'CINSTE çalışma alanınıza devam etmek için giriş yapın veya yeni hesap oluşturun.', 'login.signIn': 'Giriş yap', 'login.signInHint': 'Mevcut hesap bilgilerinizi kullanın.', 'login.signUp': 'Yeni hesap', 'login.signUpHint': 'Yeni bir hesap öğrenci deneyimiyle başlar; diğer çalışma alanları ayrı atanır.', 'login.email': 'E-posta', 'login.password': 'Şifre', 'login.name': 'Ad', 'login.create': 'Hesap oluştur',
    'giver.eyebrow': 'KATKILARIM', 'giver.title': 'Güzel şeyler devam eder.', 'giver.intro': 'Öğrenci ayrıntılarını göstermeden mümkün kıldığınız deneyimleri görün.', 'giver.outcomes': 'Katkılarım', 'giver.outcomesHint': 'Sonuçlar yalnızca güvenle paylaşılabildiğinde görünür.', 'giver.signInTitle': 'Daha önce ikram yaptınız mı?', 'giver.signInBody': 'Katkılarınızı ve güvenle kullanılabilen sonuçları görmek için giriş yapın.', 'giver.signIn': 'GİRİŞ YAP', 'giver.error': 'Katkılarınız şu anda yüklenemiyor.', 'giver.empty': 'Henüz ikram yapmadınız.', 'giver.fund': 'Bir kez daha ısmarla', 'giver.fundHint': 'Bir deneyim seçin. Ödeme bu yerel MVP’de simüle edilir.', 'giver.quantity': 'Adet', 'giver.fundButton': 'ISMARLA', 'giver.available': 'Şu anda kullanılabilir', 'giver.unavailable': 'Bu deneyim şu anda alınamıyor.',
    'partner.workspace': 'CINSTE iş ortağı', 'partner.authorized': 'Yetkili çalışma alanı', 'partner.recent': 'Son etkinlik', 'partner.history': 'Son kullanımlar', 'partner.emptyHistory': 'Bu iş ortağı için henüz kullanım yok.', 'partner.confirm': 'Kullanımı onayla', 'partner.confirming': 'Onaylanıyor…', 'partner.scan': 'Bir CINSTE tara', 'partner.manual': 'Bunun yerine kod gir', 'partner.validate': 'Kodu doğrula', 'partner.cameraStart': 'Kamerayı aç', 'partner.cameraStop': 'Tarayıcıyı kapat', 'partner.cameraHelp': 'Kamerayı CINSTE QR koduna doğrultun.', 'partner.cameraIdle': 'Kamera yalnızca tarayıcıyı seçtiğinizde açılır.',
    'checkout.title': 'Geliştirme ödemesi', 'checkout.mock': 'MockPaymentProvider · gerçek para yok', 'checkout.total': 'Toplam', 'checkout.success': 'Başarılı ödemeyi simüle et', 'checkout.failure': 'Başarısızlığı simüle et',
  },
  ar: {
    'common.processing': 'جارٍ المعالجة…', 'common.working': 'جارٍ التنفيذ…', 'common.back': 'رجوع', 'common.close': 'إغلاق', 'common.refreshRetry': 'حدّث الصفحة وحاول مرة أخرى.', 'common.notRecorded': 'غير مسجل', 'common.unavailable': 'غير متاح',
    'login.welcome': 'مرحباً', 'login.intro': 'سجّل الدخول للمتابعة إلى مساحة عمل CINSTE أو أنشئ حساباً جديداً.', 'login.signIn': 'تسجيل الدخول', 'login.signInHint': 'استخدم بيانات حسابك الحالي.', 'login.signUp': 'حساب جديد', 'login.signUpHint': 'يبدأ الحساب الجديد بتجربة الطالب؛ وتُعيَّن مساحات العمل الأخرى بشكل منفصل.', 'login.email': 'البريد الإلكتروني', 'login.password': 'كلمة المرور', 'login.name': 'الاسم', 'login.create': 'إنشاء حساب',
    'giver.eyebrow': 'مساهماتي', 'giver.title': 'الأشياء الجميلة تستمر.', 'giver.intro': 'اطّلع على التجارب التي جعلتها ممكنة دون كشف تفاصيل الطلاب.', 'giver.outcomes': 'مساهماتي', 'giver.outcomesHint': 'تظهر النتائج فقط عندما يمكن مشاركتها بأمان.', 'giver.signInTitle': 'هل قدّمت تجربة من قبل؟', 'giver.signInBody': 'سجّل الدخول لرؤية مساهماتك والنتائج المتاحة بأمان.', 'giver.signIn': 'تسجيل الدخول', 'giver.error': 'لا يمكن تحميل مساهماتك الآن.', 'giver.empty': 'لم تقدّم تجربة بعد.', 'giver.fund': 'قدّم تجربة أخرى', 'giver.fundHint': 'اختر تجربة. الدفع محاكى في هذا الإصدار المحلي.', 'giver.quantity': 'الكمية', 'giver.fundButton': 'قَدِّم تجربة', 'giver.available': 'متاح الآن', 'giver.unavailable': 'هذه التجربة غير متاحة للمطالبة الآن.',
    'partner.workspace': 'شريك CINSTE', 'partner.authorized': 'مساحة عمل معتمدة', 'partner.recent': 'النشاط الأخير', 'partner.history': 'أحدث عمليات الاسترداد', 'partner.emptyHistory': 'لا توجد عمليات استرداد حديثة لهذا الشريك بعد.', 'partner.confirm': 'تأكيد الاسترداد', 'partner.confirming': 'جارٍ التأكيد…', 'partner.scan': 'امسح رمز CINSTE', 'partner.manual': 'أدخل رمزاً بدلاً من ذلك', 'partner.validate': 'تحقق من الرمز', 'partner.cameraStart': 'تشغيل الكاميرا', 'partner.cameraStop': 'إغلاق الماسح', 'partner.cameraHelp': 'وجّه الكاميرا إلى رمز QR الخاص بـ CINSTE.', 'partner.cameraIdle': 'تبدأ الكاميرا فقط عند اختيار الماسح.',
    'checkout.title': 'دفع التطوير', 'checkout.mock': 'MockPaymentProvider · لا أموال حقيقية', 'checkout.total': 'الإجمالي', 'checkout.success': 'محاكاة دفع ناجح', 'checkout.failure': 'محاكاة فشل',
  },
} as const;

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

export type WebMessageKey = keyof typeof messages.ro | keyof typeof workspaceMessages.ro;

export function webT(locale: WebLocale, key: WebMessageKey, values: MessageValues = {}) {
  const publicMessage = messages[locale][key as keyof typeof messages.ro];
  const workspaceMessage = workspaceMessages[locale][key as keyof typeof workspaceMessages.ro];
  let message: string | undefined = publicMessage ?? workspaceMessage;
  if (!message) throw new Error(`Missing web translation: ${locale}.${key}`);
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

export function formatWebDate(locale: WebLocale, value: string | null, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }) {
  return value ? new Intl.DateTimeFormat(locale, options).format(new Date(value)) : webT(locale, 'common.notRecorded');
}

export function formatWebMoney(locale: WebLocale, bani: number) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'RON' }).format(bani / 100);
}
