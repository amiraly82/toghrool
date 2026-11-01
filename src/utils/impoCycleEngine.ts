import { ImpoPeriodSettings, CycleGoalMode } from "../types";
import { formatPersianDate, toPersianDigits, toGregorianIsoString } from "./jalali";

export type CyclePhaseType = 
  | 'period'
  | 'follicular'
  | 'fertile'
  | 'ovulation'
  | 'luteal'
  | 'pms'
  | 'due'
  | 'delayed';

export interface CycleStatusResult {
  diffDays: number;
  currentCycleDay: number;
  isDelayed: boolean;
  delayedDays: number;
  cycleLength: number;
  periodLength: number;
  ovulationDay: number;
  fertileStartDay: number;
  fertileEndDay: number;
  pmsStartDay: number;
  daysUntilNextPeriod: number;
  phase: CyclePhaseType;
  phaseTitle: string;
  phaseSubtitle: string;
  stageDescription: string;
  stageColor: {
    primary: string;
    light: string;
    border: string;
    gradient: string;
    badgeBg: string;
    text: string;
  };
  chanceOfPregnancy: string;
  progressPercent: number;
  selfCareTip: string;
  partnerTip: string;
  nutritionTip: string;
}

/**
 * Calculates calendar day difference (b - a) normalized to UTC midnight.
 * Guarantees no 1-day off errors during Daylight Saving Time (DST) switches (e.g. March 29 / October 31).
 */
export function daysBetween(a: Date | string, b: Date | string): number {
  const toUtc = (input: Date | string): number => {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return Date.UTC(parts[0], parts[1] - 1, parts[2]);
      }
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const utcA = toUtc(a);
  const utcB = toUtc(b);
  return Math.round((utcB - utcA) / 86400000);
}

export function calculateCycleStatus(settings: ImpoPeriodSettings, today: Date = new Date()): CycleStatusResult {
  const cycleLength = Math.max(20, Math.min(60, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(15, settings.periodLength || 5));
  const goalMode: CycleGoalMode = settings.goalMode || 'track';

  const diffDays = daysBetween(settings.lastPeriodStartDate, today);

  // Ovulation & Fertile window calculations (Clinical Standard: 14 days before next period)
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 5);
  const fertileEndDay = Math.min(cycleLength - 2, ovulationDay + 1);
  const pmsStartDay = Math.max(fertileEndDay + 1, cycleLength - 5);

  let currentCycleDay = 1;
  let isDelayed = false;
  let delayedDays = 0;
  let daysUntilNextPeriod = 0;
  let phase: CyclePhaseType = 'follicular';

  if (diffDays < 0) {
    // lastPeriodStartDate is in the future
    currentCycleDay = 1;
    isDelayed = false;
    delayedDays = 0;
    daysUntilNextPeriod = Math.abs(diffDays);
    phase = 'follicular';
  } else if (diffDays === cycleLength) {
    // 1) Off-by-one fix: Due date (no red warning, no pregnancy test suggestion)
    currentCycleDay = cycleLength + 1;
    isDelayed = false;
    delayedDays = 0;
    daysUntilNextPeriod = 0;
    phase = 'due';
  } else if (diffDays > cycleLength) {
    // 1) Delayed: diffDays > cycleLength with delayedDays = diffDays - cycleLength
    isDelayed = true;
    delayedDays = diffDays - cycleLength;
    currentCycleDay = diffDays + 1;
    daysUntilNextPeriod = 0;
    phase = 'delayed';
  } else {
    // Normal active cycle: 0 <= diffDays < cycleLength
    currentCycleDay = diffDays + 1;
    delayedDays = 0;
    isDelayed = false;
    daysUntilNextPeriod = cycleLength - diffDays;

    if (currentCycleDay <= periodLength) {
      phase = 'period';
    } else if (currentCycleDay === ovulationDay) {
      phase = 'ovulation';
    } else if (currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay) {
      phase = 'fertile';
    } else if (currentCycleDay >= pmsStartDay) {
      phase = 'pms';
    } else if (currentCycleDay > fertileEndDay) {
      phase = 'luteal';
    } else {
      phase = 'follicular';
    }
  }

  // Phase Title, Subtitle, Colors and Descriptions
  let phaseTitle = "";
  let phaseSubtitle = "";
  let stageDescription = "";
  let chanceOfPregnancy = "بسیار کم";
  let selfCareTip = "";
  let partnerTip = "";
  let nutritionTip = "";

  let stageColor = {
    primary: "#FB7185",
    light: "rgba(251, 113, 133, 0.12)",
    border: "rgba(251, 113, 133, 0.35)",
    gradient: "from-rose-500 to-pink-600",
    badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
    text: "text-rose-600"
  };

  switch (phase) {
    case 'due':
      phaseTitle = "امروز زمان مورد انتظار پریود است ⏳";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "روز موعد مورد انتظار قاعدگی"
        : "امروز موعد آغاز پریود شماست";
      stageDescription = "امروز روز موعد و پیش‌بینی‌شده برای آغاز دوره قاعدگی شماست. دیواره رحم در آستانه چرخه جدید قرار دارد. به نشانه‌های بدنتان توجه کنید و آرامش داشته باشید.";
      stageColor = {
        primary: "#F43F5E",
        light: "rgba(244, 63, 94, 0.12)",
        border: "rgba(244, 63, 94, 0.35)",
        gradient: "from-rose-500 to-pink-500",
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        text: "text-rose-600"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "پدهای بهداشتی را در دسترس داشته باشید، لباس‌های راحت بپوشید و نوشیدنی‌های گرم میل کنید.";
      partnerTip = "امروز روز موعد پریود همسرتان است؛ با همدلی و فراهم کردن محیطی آرام در کنار او باشید.";
      nutritionTip = "نوشیدن آب گرم و چای بابونه یا زنجبیل به آرامش عضلات رحم کمک می‌کند.";
      break;

    case 'delayed':
      if (diffDays >= 90) {
        // 2) Ceiling: 90+ days -> only doctor consult message
        phaseTitle = "نیاز به مشورت با پزشک 🩺";
        phaseSubtitle = "بیش از ۳ ماه عدم قاعدگی";
        stageDescription = "اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.";
        chanceOfPregnancy = "نیاز به بررسی تخصصی";
      } else if (diffDays >= 45) {
        // 2) Ceiling: 45-89 days -> new period registration prompt + doctor message
        phaseTitle = "ثبت شروع پریود جدید 🌸";
        phaseSubtitle = "پریودت شروع شده؟ همین حالا ثبتش کن";
        stageDescription = "اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.";
        chanceOfPregnancy = "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود";
      } else {
        phaseTitle = `تاخیر در قاعدگی (${toPersianDigits(delayedDays)} روز تاخیر) ⚠️`;
        if (delayedDays >= 2) {
          // Suggest pregnancy test only from 2 days delay with suggestive tone
          phaseSubtitle = goalMode === 'pregnancy'
            ? "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود"
            : `${toPersianDigits(delayedDays)} روز از موعد گذشته است`;
          stageDescription = "تاریخ سررسید پریود شما سپری شده است. نوسانات هورمونی، تغییرات وزنی یا استرس می‌توانند علت تاخیر باشند. اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود.";
          chanceOfPregnancy = "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود";
        } else {
          // 1 day delay (no pregnancy test suggestion)
          phaseSubtitle = "۱ روز از موعد مورد انتظار گذشته است";
          stageDescription = "یک روز تاخیر در چرخه قاعدگی کاملاً متداول و طبیعی است و اغلب ناشی از استرس روزمره، کم‌خوابی یا تغییرات فصلی است. نیازی به نگرانی نیست.";
          chanceOfPregnancy = "کم";
        }
      }
      stageColor = {
        primary: "#EF4444",
        light: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.35)",
        gradient: "from-red-500 to-rose-600",
        badgeBg: "bg-red-50 text-red-700 border-red-200",
        text: "text-red-600"
      };
      selfCareTip = "آرامش خود را حفظ کنید و استرس را کاهش دهید. خواب منظم و نوشیدن دم‌نوش‌های آرام‌بخش توصیه می‌شود.";
      partnerTip = "با آرامش و بدون استرس در کنار او باشید. احساس اطمینان خاطر بهترین کمک شما در این روزهاست.";
      nutritionTip = "آب فراوان بنوشید و از مصرف بیش از حد قهوه و ادویه‌های تند خودداری کنید.";
      break;

    case 'period':
      phaseTitle = `دوران قاعدگی (پریود) 🩸`;
      phaseSubtitle = `روز ${toPersianDigits(currentCycleDay)} از دوره خونریزی`;
      stageDescription = "سطح هورمون‌های استروژن و پروژسترون در پایین‌ترین حد است. دیواره رحم در حال پاکسازی و بازسازی است و بدن نیاز مبرم به استراحت و مراقبت گرم دارد.";
      stageColor = {
        primary: "#F43F5E",
        light: "rgba(244, 63, 94, 0.12)",
        border: "rgba(244, 63, 94, 0.35)",
        gradient: "from-rose-500 to-pink-600",
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        text: "text-rose-600"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "استفاده از کیسه آب گرم روی شکم و کمر، دوش آب ولرم و استراحت کافی دردهای عضلانی را به شدت کاهش می‌دهد.";
      partnerTip = "یک فنجان دمنوش گرم (بابونه، زنجبیل یا نبات‌داغ) برای او آماده کنید و بگذارید بیشتر استراحت کند.";
      nutritionTip = "غذاهای سرشار از آهن مثل اسفناج، عدس، گوشت کم‌چرب و مایعات گرم برای جبران خونریزی میل کنید.";
      break;

    case 'follicular':
      phaseTitle = "فاز فولیکولار (روزهای پرانرژی) 🌱";
      phaseSubtitle = "افزایش ترشح استروژن و شادابی پوست";
      stageDescription = "با پایان پریود، هورمون استروژن روند صعودی خود را آغاز می‌کند. انرژی جسمی و انگیزه فکری بالا می‌رود و زمان فوق‌العاده‌ای برای ورزش، تفریح و پروژه‌های دونفره است.";
      stageColor = {
        primary: "#10B981",
        light: "rgba(16, 185, 129, 0.12)",
        border: "rgba(16, 185, 129, 0.35)",
        gradient: "from-emerald-500 to-teal-600",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        text: "text-emerald-600"
      };
      chanceOfPregnancy = "کم";
      selfCareTip = "از انگیزه و انرژی بالایتان برای ورزش‌های پرتحرک، یادگیری کارهای جدید و معاشرت‌های لذت‌بخش استفاده کنید.";
      partnerTip = "بهترین فرصت برای قرار دونفره، پیاده‌روی عاشقانه و برنامه‌ریزی سفر است؛ انرژی همسرتان در بالاترین حد است!";
      nutritionTip = "میوه‌ها و سبزیجات تازه، غلات کامل و پروتئین باکیفیت را در سبد غذایی خود جای دهید.";
      break;

    case 'fertile':
      phaseTitle = "پنجره باروری (شانس بالای لقاح) ✨";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "روزهای طلایی برای اقدام به بارداری"
        : (goalMode === 'prevention' ? "روزهای پرخطر - نیاز به مراقبت و پیشگیری" : "افزایش حس جذابیت و شادابی زنانه");
      stageDescription = "تخمدان‌ها در حال آماده‌سازی تخمک نهایی هستند و سطح ترشحات استروژنی شفاف و کشسان می‌شود. اسپرم در این بازه می‌تواند تا ۵ روز در رحم زنده بماند.";
      stageColor = {
        primary: "#8B5CF6",
        light: "rgba(139, 92, 246, 0.12)",
        border: "rgba(139, 92, 246, 0.35)",
        gradient: "from-violet-500 to-purple-600",
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        text: "text-purple-600"
      };
      chanceOfPregnancy = "بالا";
      selfCareTip = "توجه به ترشحات دهانه رحم (شبیه سفیده تخم‌مرغ) بهترین نشانه ورود به بارورترین روزهای ماه است.";
      partnerTip = "عواطف و صمیمیت فیزیکی در اوج پذیرش است؛ کلمات محبت‌آمیز و نگاه‌های پرعشق تاثیر دوچندان دارد.";
      nutritionTip = "مصرف آنتی‌اکسیدان‌ها، ویتامین C، مغزیجات (گردو و بادام) و آووکادو به کیفیت تخمک‌گذاری کمک شایانی می‌کند.";
      break;

    case 'ovulation':
      phaseTitle = "روز تخمک‌گذاری (اوج باروری) 🥚";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "بالاترین شانس بارداری در تمام ماه!"
        : "رهاسازی تخمک و اوج تمایل به صمیمیت";
      stageDescription = "تخمک از فولیکول رها شده و به مدت ۱۲ الی ۲۴ ساعت در لوله فالوپ آماده لقاح است. این روز قله احساسی، فیزیکی و بیولوژیکی چرخه قاعدگی شماست.";
      stageColor = {
        primary: "#D946EF",
        light: "rgba(217, 70, 239, 0.14)",
        border: "rgba(217, 70, 239, 0.4)",
        gradient: "from-fuchsia-500 to-pink-600",
        badgeBg: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
        text: "text-fuchsia-600"
      };
      chanceOfPregnancy = "بسیار بالا (اوج)";
      selfCareTip = "ممکن است تیر کشیدن مختصری در یک سمت زیر شکم حس کنید (میتل‌اشمرتس) که کاملاً طبیعی و نشانه رهاسازی تخمک است.";
      partnerTip = "امروز روز اوج انرژی و صمیمیت عاطفی همسرتان است؛ با گل و محبت بیشتر این روز را خاص کنید.";
      nutritionTip = "آب زیاد، غذاهای ضدالتهاب، اسید فولیک و پرهیز از فست‌فود در این روز حیاتی است.";
      break;

    case 'luteal':
      phaseTitle = "فاز لوتئال (آرامش پس از تخمک‌گذاری) 🌙";
      phaseSubtitle = "تولید هورمون پروژسترون و کاهش آرام انرژی";
      stageDescription = "با تشکیل جسم زرد، پروژسترون بالا می‌رود تا دیواره رحم را تقویت کند. بدن به آرامی ریتم آرام‌تری به خود می‌گیرد و نیاز به خواب باکیفیت بیشتر می‌شود.";
      stageColor = {
        primary: "#6366F1",
        light: "rgba(99, 102, 241, 0.12)",
        border: "rgba(99, 102, 241, 0.35)",
        gradient: "from-indigo-500 to-blue-600",
        badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
        text: "text-indigo-600"
      };
      chanceOfPregnancy = "کم";
      selfCareTip = "از کارهای سنگین و اضافه‌کاری کم کنید. دوش شبانه و زمان‌بندی منظم خواب به تعادل هورمونی شما کمک می‌کند.";
      partnerTip = "شاید همسرتان کمی آرام‌تر یا کم‌حرف‌تر شود؛ نیاز به فضای آرام و درک متقابل در این روزها پررنگ است.";
      nutritionTip = "منیزیم (موز، اسفناج، شکلات تلخ و دانه کدو) از دردهای احتمالی آینده جلوگیری می‌کند.";
      break;

    case 'pms':
      phaseTitle = "سندرم پیش از قاعدگی (PMS) 🍂";
      phaseSubtitle = "نوسانات هورمونی و حساسیت عاطفی طبیعی";
      stageDescription = "افت ناگهانی پروژسترون و استروژن پیش از خونریزی ممکن است باعث حساسیت پستان‌ها، نفخ، خستگی، کم‌حوصلگی یا نوسانات خلقی شود. این وضعیت کاملاً فیزیولوژیک است.";
      stageColor = {
        primary: "#F59E0B",
        light: "rgba(245, 158, 11, 0.14)",
        border: "rgba(245, 158, 11, 0.35)",
        gradient: "from-amber-500 to-orange-600",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        text: "text-amber-600"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "مصرف کافئین و شکر را محدود کنید چون اضطراب و ورم را تشدید می‌کنند. پیاده‌روی سبک و تنفس عمیق معجزه می‌کند.";
      partnerTip = "صبوری، محبت بی‌قید و شرط، بغل گرم و عدم انتقاد، بزرگ‌ترین هدیه شما به پارتنرتان در روزهای PMS است.";
      nutritionTip = "غذاهای کم‌نمک برای پیشگیری از نفخ و آب زیاد و دمنوش اسطوخودوس یا بادرنجبویه مصرف کنید.";
      break;
  }

  const progressPercent = isDelayed 
    ? 100 
    : Math.min(100, Math.max(0, Math.round((currentCycleDay / cycleLength) * 100)));

  return {
    diffDays,
    currentCycleDay,
    isDelayed,
    delayedDays,
    cycleLength,
    periodLength,
    ovulationDay,
    fertileStartDay,
    fertileEndDay,
    pmsStartDay,
    daysUntilNextPeriod,
    phase,
    phaseTitle,
    phaseSubtitle,
    stageDescription,
    stageColor,
    chanceOfPregnancy,
    progressPercent,
    selfCareTip,
    partnerTip,
    nutritionTip
  };
}

export interface PredictedCycle {
  cycleIndex: number;
  startDateIso: string;
  startDatePersian: string;
  daysUntilStart: number;
  isDelayed: boolean;
  delayedDays: number;
  ovulationDateIso: string;
  ovulationDatePersian: string;
  fertileWindowStartPersian: string;
  fertileWindowEndPersian: string;
}

/**
 * Predicts subsequent cycle starts advancing predictably from the base expected period.
 * 3) If delayed, next expected period = lastStart + cycleLength (with label 'X روز تاخیر') and future cycles advance from there.
 */
export function predictFutureCycles(settings: ImpoPeriodSettings, count: number = 3): PredictedCycle[] {
  const cycleLength = Math.max(20, Math.min(60, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(15, settings.periodLength || 5));
  const lastStartIso = settings.lastPeriodStartDate;
  if (!lastStartIso) return [];

  const today = new Date();
  const ovulationOffset = Math.max(periodLength + 2, cycleLength - 14);

  const predictions: PredictedCycle[] = [];
  const [startY, startM, startD] = lastStartIso.split('T')[0].split('-').map(Number);

  for (let i = 0; i < count; i++) {
    // Next expected periods start at:
    // Cycle 1: lastStart + 1 * cycleLength (even if in the past / delayed)
    // Cycle 2: lastStart + 2 * cycleLength
    // Cycle 3: lastStart + 3 * cycleLength
    const cycleStart = new Date(startY, startM - 1, startD + ((i + 1) * cycleLength));
    const startIso = toGregorianIsoString(cycleStart);

    const ovDate = new Date(cycleStart);
    ovDate.setDate(ovDate.getDate() + ovulationOffset - 1);
    const ovIso = toGregorianIsoString(ovDate);

    const fertileStart = new Date(ovDate);
    fertileStart.setDate(fertileStart.getDate() - 5);

    const fertileEnd = new Date(ovDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    const daysUntilStart = daysBetween(today, cycleStart);
    const isDelayed = daysUntilStart < 0;
    const delayedDays = isDelayed ? Math.abs(daysUntilStart) : 0;

    predictions.push({
      cycleIndex: i + 1,
      startDateIso: startIso,
      startDatePersian: formatPersianDate(startIso),
      daysUntilStart,
      isDelayed,
      delayedDays,
      ovulationDateIso: ovIso,
      ovulationDatePersian: formatPersianDate(ovIso),
      fertileWindowStartPersian: formatPersianDate(toGregorianIsoString(fertileStart), false),
      fertileWindowEndPersian: formatPersianDate(toGregorianIsoString(fertileEnd), false)
    });
  }

  return predictions;
}

export interface BiorhythmResult {
  physical: number; // -100 to 100
  emotional: number;
  intellectual: number;
  daysAlive: number;
  summary: string;
}

export function calculateBiorhythm(birthDateStr?: string, targetDate: Date = new Date()): BiorhythmResult | null {
  if (!birthDateStr) return null;
  try {
    const daysAlive = daysBetween(birthDateStr, targetDate);
    if (daysAlive <= 0) return null;

    // Standard biological rhythm formulas (Sine curves)
    const physical = Math.round(Math.sin((2 * Math.PI * daysAlive) / 23) * 100);
    const emotional = Math.round(Math.sin((2 * Math.PI * daysAlive) / 28) * 100);
    const intellectual = Math.round(Math.sin((2 * Math.PI * daysAlive) / 33) * 100);

    let summary = "ریتم‌های زیستی شما در وضعیت متعادل قرار دارند.";
    if (physical > 50 && emotional > 50) {
      summary = "انرژی جسمانی و شادابی عاطفی شما در اوج است! روز عالی برای تحرک و ساختن خاطرات دونفره.";
    } else if (emotional < -40) {
      summary = "ریتم عاطفی در نقطه کف است. استراحت، پذیرش احساسات و معاشرت با آرامش توصیه می‌شود.";
    } else if (intellectual > 60) {
      summary = "تمرکز ذهنی و حل مسئله شما در بالاترین بازدهی است.";
    }

    return {
      physical,
      emotional,
      intellectual,
      daysAlive,
      summary
    };
  } catch {
    return null;
  }
}
