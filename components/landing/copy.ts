import type { WebLocale } from "@/lib/i18n/web";

type Copy = {
  skip: string; eyebrow: string; title: string; accent: string; intro: string;
  student: string; give: string; how: string; note: string; example: string;
  cinema: string; cinemaText: string; care: string; careText: string; activity: string; activityText: string;
  categories: string[]; discovery: string; discoveryTitle: string; discoveryBody: string;
  stepsTitle: string; steps: [string, string][];
  impact: string; impactTitle: string; impactBody: string; impactNote: string;
  rolesTitle: string; studentRole: string; studentAction: string; roles: [string, string, string][];
  finalTitle: string; finalBody: string; footer: string; workspace: string; story: string[];
};
export const landingCopy: Record<WebLocale, Copy> = {
  en: {
    skip: "Skip to content", eyebrow: "GOOD EXPERIENCES. GOOD ENERGY.",
    title: "Someone’s got", accent: "this one.",
    intro: "A film. A fresh haircut. A little change of scene. People make real experiences possible for students. With CINSTE, good things keep going.",
    student: "I’m a student", give: "Make someone’s day", how: "How it works", note: "For verified students · Starting in Romania",
    example: "Experience examples", cinema: "A night at the movies", cinemaText: "Big screen. A little escape.",
    care: "A fresh start", careText: "A haircut. A confidence boost.", activity: "Try something new", activityText: "New places. New people.",
    categories: ["Cinema", "Food & coffee", "Personal care", "Activities", "Entertainment"],
    discovery: "MORE THAN AN EVERYDAY TREAT", discoveryTitle: "A little moment. A whole better day.",
    discoveryBody: "There’s more than one way to make someone smile. Explore the kinds of experiences generosity can unlock. Examples shown, not live availability.",
    stepsTitle: "One good thing leads to another.",
    steps: [["Someone makes it possible", "A person or company funds an experience with a CINSTE partner."], ["You discover it", "Verified students find and claim experiences in the CINSTE app."], ["Go. Enjoy the moment.", "Show your CINSTE QR to the partner and redeem your experience."], ["Let the good keep going", "Discover opportunities to take part in your community through CINSTE Impact."]],
    impact: "CINSTE IMPACT", impactTitle: "Good things don’t have to stop with you.",
    impactBody: "An experience can be the beginning of something bigger. CINSTE connects students with opportunities to share their time, take part, and make a difference in their community.",
    impactNote: "Small actions. Wider impact.", rolesTitle: "There’s a place for you here.", studentRole: "Discover, verify, and claim experiences in the CINSTE mobile app.", studentAction: "Continue in the student app",
    roles: [["For givers", "Turn a little generosity into someone’s next great experience.", "Fund an experience"], ["For experience partners", "Bring students through your doors and be part of their day.", "Partner invitations are coming next"], ["For community organizations", "Create opportunities for students to take part and pass something forward.", "Organization invitations are coming next"]],
    finalTitle: "Make a day. Start a ripple.", finalBody: "Enjoy an experience. Make one possible. See where it goes.",
    footer: "Good experiences, passed forward.", workspace: "Workspace access is for assigned partners and organizations.",
    story: ["Someone gives", "An experience", "A student enjoys", "Community grows"]
  },
  ro: {
    skip: "Sari la conținut", eyebrow: "EXPERIENȚE FRUMOASE. ENERGIE BUNĂ.",
    title: "De data asta,", accent: "face cineva cinste.",
    intro: "Un film. O tunsoare nouă. O schimbare de peisaj. Oamenii fac posibile experiențe reale pentru studenți. Cu CINSTE, lucrurile bune merg mai departe.",
    student: "Sunt student", give: "Fă cuiva ziua mai frumoasă", how: "Cum funcționează", note: "Pentru studenți verificați · Începem în România",
    example: "Exemple de experiențe", cinema: "O seară la cinema", cinemaText: "Ecran mare. O mică evadare.",
    care: "Un nou început", careText: "O tunsoare. Mai multă încredere.", activity: "Încearcă ceva nou", activityText: "Locuri noi. Oameni noi.",
    categories: ["Cinema", "Mâncare și cafea", "Îngrijire personală", "Activități", "Divertisment"],
    discovery: "MAI MULT DECÂT O MICĂ BUCURIE", discoveryTitle: "Un moment mic. O zi mult mai bună.",
    discoveryBody: "Există multe feluri de a aduce un zâmbet. Descoperă experiențele pe care generozitatea le poate face posibile. Exemple ilustrative, nu disponibilitate în timp real.",
    stepsTitle: "Un lucru bun aduce altul.",
    steps: [["Cineva face primul pas", "O persoană sau o companie finanțează o experiență la un partener CINSTE."], ["Tu o descoperi", "Studenții verificați descoperă și revendică experiențe în aplicația CINSTE."], ["Mergi. Bucură-te de moment.", "Arată partenerului codul QR CINSTE și folosește experiența."], ["Dă binele mai departe", "Descoperă oportunități de implicare în comunitate prin CINSTE Impact."]],
    impact: "CINSTE IMPACT", impactTitle: "Lucrurile bune pot merge mai departe de tine.",
    impactBody: "O experiență poate fi începutul a ceva mai mare. CINSTE conectează studenții cu oportunități de a oferi din timpul lor, de a participa și de a contribui în comunitate.",
    impactNote: "Gesturi mici. Impact mai mare.", rolesTitle: "Ai și tu un loc aici.", studentRole: "Descoperă, verifică-te și revendică experiențe în aplicația mobilă CINSTE.", studentAction: "Continuă în aplicația pentru studenți",
    roles: [["Pentru cei care fac cinste", "Transformă un gest de generozitate în următoarea experiență frumoasă a cuiva.", "Finanțează o experiență"], ["Pentru parteneri", "Primește studenți și fii parte din ziua lor.", "Invitațiile pentru parteneri urmează"], ["Pentru organizații", "Creează oportunități prin care studenții se pot implica și pot da binele mai departe.", "Invitațiile pentru organizații urmează"]],
    finalTitle: "Fă o zi mai bună. Dă binele mai departe.", finalBody: "Bucură-te de o experiență. Fă una posibilă. Vezi unde duce.",
    footer: "Experiențe frumoase, date mai departe.", workspace: "Accesul în spațiile de lucru este pentru partenerii și organizațiile desemnate.",
    story: ["Cineva oferă", "O experiență", "Un student se bucură", "Comunitatea crește"]
  },
  tr: {
    skip: "İçeriğe geç", eyebrow: "GÜZEL DENEYİMLER. GÜZEL ENERJİ.",
    title: "Bu sefer", accent: "birinden sana.",
    intro: "Bir film. Yeni bir saç kesimi. Küçük bir değişiklik. İnsanlar öğrenciler için gerçek deneyimler sunar. CINSTE ile güzel şeyler devam eder.",
    student: "Öğrenciyim", give: "Birinin gününü güzelleştir", how: "Nasıl çalışır?", note: "Doğrulanmış öğrenciler için · Romanya’dan başlıyoruz",
    example: "Deneyim örnekleri", cinema: "Bir sinema akşamı", cinemaText: "Büyük ekran. Küçük bir kaçış.",
    care: "Yeni bir başlangıç", careText: "Yeni saçlar. Yeni bir özgüven.", activity: "Yeni bir şey dene", activityText: "Yeni yerler. Yeni insanlar.",
    categories: ["Sinema", "Yemek ve kahve", "Kişisel bakım", "Aktiviteler", "Eğlence"],
    discovery: "KÜÇÜK BİR İKRAMDAN FAZLASI", discoveryTitle: "Küçük bir an. Çok daha güzel bir gün.",
    discoveryBody: "Birini gülümsetmenin pek çok yolu var. Paylaşmanın mümkün kıldığı deneyimleri keşfet. Bunlar örnektir; güncel uygunluk bilgisi değildir.",
    stepsTitle: "Bir güzel şey, diğerini başlatır.",
    steps: [["Biri mümkün kılar", "Bir kişi veya şirket, CINSTE ortağında bir deneyimi finanse eder."], ["Sen keşfedersin", "Doğrulanmış öğrenciler CINSTE uygulamasında deneyimleri keşfeder ve alır."], ["Git. Anın tadını çıkar.", "Deneyimi kullanmak için ortağa CINSTE QR kodunu göster."], ["İyiliği ileri taşı", "CINSTE Impact ile topluluğuna katılma fırsatlarını keşfet."]],
    impact: "CINSTE IMPACT", impactTitle: "Güzel şeyler seninle bitmek zorunda değil.",
    impactBody: "Bir deneyim daha büyük bir şeyin başlangıcı olabilir. CINSTE, öğrencileri zamanlarını paylaşabilecekleri, katılabilecekleri ve topluluklarına katkıda bulunabilecekleri fırsatlarla buluşturur.",
    impactNote: "Küçük adımlar. Daha geniş etki.", rolesTitle: "Burada sana da yer var.", studentRole: "CINSTE mobil uygulamasında deneyimleri keşfedin, doğrulanın ve alın.", studentAction: "Öğrenci uygulamasında devam et",
    roles: [["Ismarlayanlar için", "Küçük bir paylaşımı birinin güzel deneyimine dönüştür.", "Bir deneyimi finanse et"], ["Deneyim ortakları için", "Öğrencileri karşıla, günlerinin bir parçası ol.", "İş ortağı davetleri yakında"], ["Topluluk kuruluşları için", "Öğrencilerin katılıp iyiliği ileri taşıyabileceği fırsatlar oluştur.", "Kuruluş davetleri yakında"]],
    finalTitle: "Bir günü güzelleştir. Bir etki başlat.", finalBody: "Bir deneyimin tadını çıkar. Birini mümkün kıl. Nereye gittiğini gör.",
    footer: "Paylaşılan güzel deneyimler.", workspace: "Çalışma alanları atanmış ortaklar ve kuruluşlar içindir.",
    story: ["Biri paylaşır", "Bir deneyim", "Bir öğrenci yaşar", "Topluluk büyür"]
  },
  ar: {
    skip: "انتقل إلى المحتوى", eyebrow: "تجارب جميلة. طاقة إيجابية.",
    title: "هذه المرة،", accent: "أحدهم يعزمك.",
    intro: "فيلم. قصة شعر جديدة. تغيير بسيط في يومك. أشخاص يجعلون تجارب حقيقية ممكنة للطلاب. مع CINSTE، يستمر الخير.",
    student: "أنا طالب", give: "اجعل يوم أحدهم أجمل", how: "كيف تعمل؟", note: "للطلاب الذين تم التحقق منهم · البداية في رومانيا",
    example: "أمثلة على التجارب", cinema: "أمسية في السينما", cinemaText: "شاشة كبيرة. استراحة صغيرة.",
    care: "بداية جديدة", careText: "قصة شعر. وثقة جديدة.", activity: "جرّب شيئًا جديدًا", activityText: "أماكن جديدة. وأشخاص جدد.",
    categories: ["سينما", "طعام وقهوة", "عناية شخصية", "أنشطة", "ترفيه"],
    discovery: "أكثر من لفتة يومية", discoveryTitle: "لحظة صغيرة. يوم أجمل بكثير.",
    discoveryBody: "هناك طرق كثيرة لرسم ابتسامة. اكتشف أنواع التجارب التي يجعلها العطاء ممكنة. هذه أمثلة توضيحية وليست عروضًا متاحة حاليًا.",
    stepsTitle: "شيء جميل يقود إلى آخر.",
    steps: [["أحدهم يجعلها ممكنة", "يموّل شخص أو شركة تجربة لدى شريك CINSTE."], ["أنت تكتشفها", "يكتشف الطلاب المتحقق منهم التجارب ويحجزونها في تطبيق CINSTE."], ["اذهب واستمتع باللحظة", "اعرض رمز QR الخاص بك لدى الشريك للاستفادة من التجربة."], ["دع الخير يستمر", "اكتشف فرص المشاركة في مجتمعك عبر CINSTE Impact."]],
    impact: "CINSTE IMPACT", impactTitle: "الأشياء الجميلة لا تتوقف عندك.",
    impactBody: "قد تكون التجربة بداية لشيء أكبر. تربط CINSTE الطلاب بفرص لمشاركة وقتهم والمشاركة وإحداث أثر في مجتمعهم.",
    impactNote: "خطوات صغيرة. أثر أوسع.", rolesTitle: "لك مكان هنا.", studentRole: "اكتشف التجارب وأكمل التحقق والمطالبة في تطبيق CINSTE للجوال.", studentAction: "تابع في تطبيق الطالب",
    roles: [["لمن يقدمون التجارب", "حوّل لفتة كريمة إلى تجربة جميلة لشخص آخر.", "موّل تجربة"], ["لشركاء التجارب", "استقبل الطلاب وكن جزءًا من يومهم.", "دعوات الشركاء ستتوفر قريباً"], ["للمؤسسات المجتمعية", "أنشئ فرصًا للطلاب للمشاركة ونشر الأثر.", "دعوات المؤسسات ستتوفر قريباً"]],
    finalTitle: "اجعل يومًا أجمل. وابدأ أثرًا.", finalBody: "استمتع بتجربة. اجعل أخرى ممكنة. وشاهد أثرها.",
    footer: "تجارب جميلة يستمر أثرها.", workspace: "مساحات العمل مخصصة للشركاء والمؤسسات المعينين.",
    story: ["شخص يعطي", "تجربة", "طالب يستمتع", "مجتمع ينمو"]
  }
};
