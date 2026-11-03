import { DailyQuestion, DailyQuestionCategory } from "../types";

export interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

export const QUESTION_CATEGORIES: Record<DailyQuestionCategory, CategoryMeta> = {
  nostalgia: {
    label: "خاطرات و اولین‌ها",
    emoji: "📸",
    color: "text-[#D94E4E]",
    bg: "bg-[#FEE2E2]",
    border: "border-[#FECACA]"
  },
  deep: {
    label: "شناخت و احساسات عمیق",
    emoji: "🤍",
    color: "text-[#4A154B]",
    bg: "bg-[#F3E8FF]",
    border: "border-[#E9D5FF]"
  },
  fun: {
    label: "شوخی، شیطنت و فانتزی",
    emoji: "✨",
    color: "text-[#B45309]",
    bg: "bg-[#FEF3C7]",
    border: "border-[#FDE68A]"
  },
  future: {
    label: "رویاها و آینده دونفره",
    emoji: "🚀",
    color: "text-[#15803D]",
    bg: "bg-[#DCFCE7]",
    border: "border-[#BBF7D0]"
  }
};

export const DAILY_QUESTIONS_POOL: Array<{ id: number; text: string; category: DailyQuestionCategory }> = [
  // 1-25: Nostalgia & Firsts (خاطرات و اولین‌ها)
  { id: 1, text: "اولین بار که حس کردی واقعاً عاشقم شدی کی و کجا بود؟", category: "nostalgia" },
  { id: 2, text: "اولین باری که با هم غذا خوردیم یادته؟ چه حسی به من داشتی؟", category: "nostalgia" },
  { id: 3, text: "کدوم ویژگی ظاهری یا رفتاری من اولین بار چشمت رو گرفت؟", category: "nostalgia" },
  { id: 4, text: "قشنگ‌ترین سوپرایزی که تا حالا برای هم داشتیم به نظرت کدوم بود؟", category: "nostalgia" },
  { id: 5, text: "خنده‌دارترین سوتی یا اتفاق بامزه‌ای که دوتایی تجربه کردیم چی بوده؟", category: "nostalgia" },
  { id: 6, text: "اولین عکسی که دونفره گرفتیم رو یادته؟ چه حسی بهش داری الان؟", category: "nostalgia" },
  { id: 7, text: "شیرین‌ترین مکالمه شبانه‌مون که هنوز تو خاطرت مونده کدومه؟", category: "nostalgia" },
  { id: 8, text: "کدوم آهنگ یا ترانه تو رو دقیقاً پرت می‌کنه به اوایل رابطه‌مون؟", category: "nostalgia" },
  { id: 9, text: "اولین باری که دست همدیگه رو گرفتیم چه حسی تو دلت پیچید؟", category: "nostalgia" },
  { id: 10, text: "بهترین مسافرت یا گشت‌وگذار دونفره‌مون تا امروز به نظرت کجا بوده؟", category: "nostalgia" },
  { id: 11, text: "یکی از هدیه‌هایی که از من گرفتی و هنوزم خیلی برات باارزشه چیه؟", category: "nostalgia" },
  { id: 12, text: "اولین باری که به خاطر یه موضوع خنده‌دار با هم قهر کردیم یادت میاد؟", category: "nostalgia" },
  { id: 13, text: "کدوم دیت اولیه‌مون بود که با خودت گفتی: این همون آدمیه که می‌خوام؟", category: "nostalgia" },
  { id: 14, text: "خاطره‌انگیزترین پیاده‌روی که با هم داشتیم کجا بود؟", category: "nostalgia" },
  { id: 15, text: "اولین غذایی که برای هم پختیم یا با هم امتحان کردیم چی بود؟", category: "nostalgia" },
  { id: 16, text: "کدوم شوخی یا تیکه‌کلام مشترکمون از یک اتفاق قدیمی موندگار شد؟", category: "nostalgia" },
  { id: 17, text: "بهترین کادوی تولدی که برات گرفتم کدوم بود؟", category: "nostalgia" },
  { id: 18, text: "اولین باری که عصبانیت من رو دیدی چه فکری کردی؟", category: "nostalgia" },
  { id: 19, text: "خاطره‌انگیزترین فیلمی که توی تاریکی کنار هم دیدیم کدومه؟", category: "nostalgia" },
  { id: 20, text: "یادته اولین باری که به خانواده یا دوستات راجع به من گفتی چی گفتی؟", category: "nostalgia" },
  { id: 21, text: "کدوم عطر یا بوی خاص همیشه تو رو یاد روزهای اول رابطه‌مون میندازه؟", category: "nostalgia" },
  { id: 22, text: "اولین بار چه چیزی باعث شد حس کنی کاملاً به من اعتماد داری؟", category: "nostalgia" },
  { id: 23, text: "قشنگ‌ترین پیامی که ازم توی تلگرام یا واتساپ ذخیره کردی یا یادت مونده چیه؟", category: "nostalgia" },
  { id: 24, text: "اولین باری که توی چشمای هم طولانی نگاه کردیم یادت میاد؟", category: "nostalgia" },
  { id: 25, text: "اگه بتونی یک روز از روزهای گذشته‌مون رو دوباره زندگی کنی، کدوم روزه؟", category: "nostalgia" },

  // 26-50: Deep & Emotional Intimacy (شناخت و احساسات عمیق)
  { id: 26, text: "توی چه لحظاتی بیشتر از همیشه حس می‌کنی بهت افتخار می‌کنم و تحسینت می‌کنم؟", category: "deep" },
  { id: 27, text: "وقتی کلافه یا ناراحتی، چطور کنارت باشم که بیشتر حس آرامش کنی؟", category: "deep" },
  { id: 28, text: "شیرین‌ترین تعریفی که تا حالا از من شنیدی چی بوده؟", category: "deep" },
  { id: 29, text: "چه چیزی توی شخصیت من هست که بهت حس امنیت واقعی میده؟", category: "deep" },
  { id: 30, text: "اگه بخوای عشق ما رو با یک تصویر، استعاره یا شعر توصیف کنی اون چیه؟", category: "deep" },
  { id: 31, text: "فکر می‌کنی توی این مدت حضور من چه تغییر مثبتی توی زندگیت ایجاد کرده؟", category: "deep" },
  { id: 32, text: "کدوم اخلاق یا رفتار من همیشه باعث لبخندت میشه حتی وسط روزهای سخت؟", category: "deep" },
  { id: 33, text: "تا حالا شده چیزی ته دلت باشه که ترسیده باشی به من بگی؟ الان وقتشه!", category: "deep" },
  { id: 34, text: "یک بغل طولانی و آروم، یا شنیدن حرف‌های عاشقانه؛ کدوم الان بیشتر حالت رو جا میاره؟", category: "deep" },
  { id: 35, text: "کدوم ویژگی توی وجود خودت هست که حس می‌کنی من واقعاً درکش کردم؟", category: "deep" },
  { id: 36, text: "فکر می‌کنی بهترین راه برای آشتی کردن و پایان دادن به دلخوری‌های ما چیه؟", category: "deep" },
  { id: 37, text: "وقتی از هم دوریم، چه چیزی باعث میشه بیشتر از همیشه دلت برام تنگ بشه؟", category: "deep" },
  { id: 38, text: "چه کار کوچیکی در طول روز انجام بدم حس می‌کنی خیلی دوستت دارم؟", category: "deep" },
  { id: 39, text: "کدوم نقطه ضعف من رو با مهربونی پذیرفتی و دوستش داری؟", category: "deep" },
  { id: 40, text: "چه زمانی حس کردی که ما یک تیم شکست‌ناپذیر هستیم؟", category: "deep" },
  { id: 41, text: "بزرگ‌ترین درسی که از رابطه و با هم بودنمون گرفتی چی بوده؟", category: "deep" },
  { id: 42, text: "توی رابطه‌مون چقدر حس می‌کنی خودِ واقعی و بدون نقابت هستی؟", category: "deep" },
  { id: 43, text: "اگه قرار بود یک چیز رو در شیوه ابراز علاقه‌مون بهتر کنیم چی بود؟", category: "deep" },
  { id: 44, text: "کدوم عادتم هست که با اینکه عجیبه، اما از نظرت خیلی جذابه؟", category: "deep" },
  { id: 45, text: "چقدر حس می‌کنی توی سختی‌ها پشتوانه‌ات هستم؟", category: "deep" },
  { id: 46, text: "شیرین‌ترین حس تعلق خاطری که با هم تجربه کردیم چه موقعی بوده؟", category: "deep" },
  { id: 47, text: "چه وقتایی بیشتر از همیشه دلت می‌خواد فقط دستامو محکم بگیری؟", category: "deep" },
  { id: 48, text: "یک جمله که همیشه دوست داری از من بشنوی چیه؟", category: "deep" },
  { id: 49, text: "فکر می‌کنی راز اصلی موندگاری و گرمای رابطه ما توی این روزها چیه؟", category: "deep" },
  { id: 50, text: "همین الان چقدر دوستم داری؟ توی یک جمله بگو!", category: "deep" },

  // 51-75: Fun, Playful & Fantasy (شوخی، شیطنت و فانتزی)
  { id: 51, text: "اگه قرار بود فردا یک روز کامل هیچ قانونی نباشه، دوتایی چیکار می‌کردیم؟", category: "fun" },
  { id: 52, text: "اگه یه قدرت ماورایی دونفره داشتیم دوست داشتی چی باشه؟ تله‌پاتی یا غیب شدن؟", category: "fun" },
  { id: 53, text: "اگه قرار بود من یک شخصیت کارتونی باشم، شبیه کی می‌شدم؟", category: "fun" },
  { id: 54, text: "بامزه‌ترین عادت من موقع خواب یا بیدار شدن چیه؟", category: "fun" },
  { id: 55, text: "اگه بهت ۱۰ میلیارد تومن بدن به شرطی که ۱ ماه با من حرف نزنی قبول می‌کنی؟ صادقانه!", category: "fun" },
  { id: 56, text: "کدوم استیکر یا ایموجی دقیقاً شخصیت من رو نشون میده؟", category: "fun" },
  { id: 57, text: "اگه بخوای منو به یه خوراکی یا دسر تشبیه کنی، اون چیه و چرا؟", category: "fun" },
  { id: 58, text: "اگه یک روز جای همدیگه بیدار می‌شدیم، اولین کاری که می‌کردی چی بود؟", category: "fun" },
  { id: 59, text: "کدوم کار من بیشتر از همه قلقلکت میده یا خنده‌ت رو میندازه؟", category: "fun" },
  { id: 60, text: "اگه توی جزیره متروکه گیر بیفتیم، کدوممون زودتر دووم میاره؟", category: "fun" },
  { id: 61, text: "کدوم مدل لباس یا استایل من رو بیشتر از همه دوست داری؟", category: "fun" },
  { id: 62, text: "اگه یک مسابقه ماراتن بین دوتامون بذارن کی اول میشه؟ با دلیل بگو!", category: "fun" },
  { id: 63, text: "عجیب‌ترین چیزی که توی رفتارهای من کشف کردی چیه؟", category: "fun" },
  { id: 64, text: "اگه قرار بود توی یک فیلم هالیوودی نقش اول زن و مرد باشیم، کدوم فیلمه؟", category: "fun" },
  { id: 65, text: "اگه بتونی یک ویژگی من رو با کنترل جادویی کم یا زیاد کنی اون چیه؟", category: "fun" },
  { id: 66, text: "کدوم شیطنت دونفره‌مون بود که آدرنالینت رو به سقف چسبوند؟", category: "fun" },
  { id: 67, text: "اگه بهت بگم همین الان حاضر شو بریم، دوست داری کجا ببرمت؟", category: "fun" },
  { id: 68, text: "کدوم فحش یا تیکه بامزه‌ای که به شوخی به هم میندازیم رو بیشتر دوست داری؟", category: "fun" },
  { id: 69, text: "اگه قرار بود با هم یه گروه موسیقی بزنیم اسم گروهمون چی می‌شد؟", category: "fun" },
  { id: 70, text: "بدترین غذایی که با هم خوردیم ولی به روی خودمون نیاوردیم چی بوده؟", category: "fun" },
  { id: 71, text: "اگه بتونی به مدت یک روز ذهن من رو بخونی، دوست داری چی ازش بفهمی؟", category: "fun" },
  { id: 72, text: "کدوم بازی ویدیویی یا بازی فکری هست که همیشه می‌خوای منو توش شکست بدی؟", category: "fun" },
  { id: 73, text: "اگه قرار بود توی یک عصر بارونی فقط خوراکی بخوریم، منوی دلخواهت چیه؟", category: "fun" },
  { id: 74, text: "شیطنت‌آمیزترین فکری که توی این هفته راجع به من کردی چی بوده؟", category: "fun" },
  { id: 75, text: "اگه بخوای یک لقب مخفی و خیلی خنده‌دار برای من انتخاب کنی چیه؟", category: "fun" },

  // 76-100: Future, Dreams & Goals (رویاها و آینده دونفره)
  { id: 76, text: "دوست داری ۵ سال بعد همین موقع توی کدوم نقطه از دنیا کنار هم نشسته باشیم؟", category: "future" },
  { id: 77, text: "بزرگ‌ترین رویایی که می‌خوای حتماً دوتایی بهش برسیم چیه؟", category: "future" },
  { id: 78, text: "اگه خونه رویایی‌مون رو طراحی می‌کردیم، قشنگ‌ترین گوشه‌ش چه شکلی بود؟", category: "future" },
  { id: 79, text: "کدوم کشور یا شهر هست که قول دادیم با هم حتماً کشفش کنیم؟", category: "future" },
  { id: 80, text: "دوست داری چه مهارت یا سرگرمی جدیدی رو دوتایی با هم شروع کنیم؟", category: "future" },
  { id: 81, text: "توی دوره پیری‌مون چه تصویری از من و خودت توی ذهنت داری؟", category: "future" },
  { id: 82, text: "اگه یک حیوان خونگی با هم به سرپرستی بگیریم، چی انتخاب می‌کنی و اسمش چی میشه؟", category: "future" },
  { id: 83, text: "دوست داری برای سالگرد بعدیمون چه برنامه‌ای بچینیم؟", category: "future" },
  { id: 84, text: "کدوم آرزوی ویش‌لیستمون هست که دوست داری همین امسال تیکش بخوره؟", category: "future" },
  { id: 85, text: "اگه قرار بود یک کافه یا کتابفروشی مشترک داشته باشیم اسمش رو چی می‌ذاشتیم؟", category: "future" },
  { id: 86, text: "چه چیزی هست که دوست داری در آینده با هم تجربه کنیم که تا حالا هیچ‌کدوممون نکرده؟", category: "future" },
  { id: 87, text: "فکر می‌کنی وقتی ۶۰ سالمون بشه هنوزم سر چی با هم کل‌کل می‌کنیم؟", category: "future" },
  { id: 88, text: "رویایی‌ترین دیت ولنتاین یا سالگردی که توی ذهنت می‌سازی چیه؟", category: "future" },
  { id: 89, text: "اگه یک ون کمپر داشتیم، اولین سفری که می‌رفتیم به کدوم جاده بود؟", category: "future" },
  { id: 90, text: "دوست داری تا یک سال آینده چه عادتی رو توی رابطه‌مون پررنگ‌تر کنیم؟", category: "future" },
  { id: 91, text: "اگه بتونیم یک شب زیر آسمون پرستاره کویر چادر بزنیم، چه حرفایی بهم می‌زنیم؟", category: "future" },
  { id: 92, text: "فکر می‌کنی آینده‌مون چقدر روشن‌تر و قشنگ‌تر از امروزه؟", category: "future" },
  { id: 93, text: "دوست داری یک روز کل دنیارو پشت سر بذاریم و فقط به چی فکر کنیم؟", category: "future" },
  { id: 94, text: "کدوم هدف مالی مشترکمون هست که رسیدن بهش بیشترین لذت رو بهت میده؟", category: "future" },
  { id: 95, text: "چه قولی دوست داری به همدیگه بدیم که تا آخر عمر بهش پایبند بمونیم؟", category: "future" },
  { id: 96, text: "اگه قرار بود یک سال بدون اینترنت و تلفن توی یک کلبه چوبی با هم زندگی کنیم پایه‌ای؟", category: "future" },
  { id: 97, text: "شیرین‌ترین فکری که راجع به دوران میان‌سالی‌مون می‌کنی چیه؟", category: "future" },
  { id: 98, text: "دوست داری کدوم فصل از سال تبدیل بشه به فصل اختصاصی سفرهامون؟", category: "future" },
  { id: 99, text: "به نظرت رابطه ما ۱۰ سال بعد شبیه به چی خواهد بود؟", category: "future" },
  { id: 100, text: "یک آرزو کن که همین امشب برای دوتامون برآورده بشه...", category: "future" }
];

export function getTehranDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export function getDailyQuestionForDate(dateStr: string): DailyQuestion {
  // Deterministic hash based on date string (YYYY-MM-DD)
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % DAILY_QUESTIONS_POOL.length;
  const q = DAILY_QUESTIONS_POOL[index];
  return {
    id: q.id,
    text: q.text,
    category: q.category,
    categoryLabel: QUESTION_CATEGORIES[q.category]?.label || "صمیمیت"
  };
}
