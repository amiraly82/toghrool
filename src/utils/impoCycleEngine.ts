import { ImpoPeriodSettings, CycleGoalMode } from "../types";
import { formatPersianDate, toPersianDigits, toGregorianIsoString } from "./jalali";

export type CyclePhaseType = 
  | 'period'
  | 'follicular'
  | 'fertile'
  | 'ovulation'
  | 'luteal'
  | 'pms'
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

export function calculateCycleStatus(settings: ImpoPeriodSettings, today: Date = new Date()): CycleStatusResult {
  const cycleLength = Math.max(20, Math.min(60, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(15, settings.periodLength || 5));
  const goalMode: CycleGoalMode = settings.goalMode || 'track';

  const lastStart = new Date(settings.lastPeriodStartDate + 'T00:00:00');
  const d1 = new Date(lastStart.getFullYear(), lastStart.getMonth(), lastStart.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Ovulation & Fertile window calculations (Clinical Standard: 14 days before next period)
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 5);
  const fertileEndDay = Math.min(cycleLength - 2, ovulationDay + 1);
  const pmsStartDay = Math.max(fertileEndDay + 1, cycleLength - 5);

  let currentCycleDay = 1;
  let isDelayed = false;
  let delayedDays = 0;
  let daysUntilNextPeriod = 0;

  if (diffDays < 0) {
    currentCycleDay = 1;
    daysUntilNextPeriod = Math.abs(diffDays);
  } else if (diffDays >= cycleLength) {
    isDelayed = true;
    delayedDays = diffDays - cycleLength + 1;
    currentCycleDay = diffDays + 1;
    daysUntilNextPeriod = 0;
  } else {
    currentCycleDay = diffDays + 1;
    daysUntilNextPeriod = cycleLength - diffDays;
  }

  // Determine current phase
  let phase: CyclePhaseType = 'follicular';
  if (isDelayed) {
    phase = 'delayed';
  } else if (currentCycleDay <= periodLength) {
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
    case 'delayed':
      phaseTitle = `تاخیر در قاعدگی (${toPersianDigits(delayedDays)} روز تاخیر) ⚠️`;
      phaseSubtitle = goalMode === 'pregnancy'
        ? "فرصت طلایی برای انجام تست بارداری (بیبی‌چک)"
        : "قاعدگی شما به تاخیر افتاده است";
      stageDescription = "تاریخ سررسید پریود شما سپری شده است. نوسانات هورمونی، تغییرات وزنی، استرس یا بارداری می‌توانند علت این تاخیر باشند. در صورت داشتن رابطه، امروز زمان ایده‌آلی برای تست بیبی‌چک است.";
      stageColor = {
        primary: "#EF4444",
        light: "rgba(239, 68, 68, 0.12)",
        border: "rgba(239, 68, 68, 0.35)",
        gradient: "from-red-500 to-rose-600",
        badgeBg: "bg-red-50 text-red-700 border-red-200",
        text: "text-red-600"
      };
      chanceOfPregnancy = "نیاز به بررسی تست بارداری";
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
  ovulationDateIso: string;
  ovulationDatePersian: string;
  fertileWindowStartPersian: string;
  fertileWindowEndPersian: string;
}

export function predictFutureCycles(settings: ImpoPeriodSettings, count: number = 3): PredictedCycle[] {
  const cycleLength = Math.max(20, Math.min(60, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(15, settings.periodLength || 5));
  const lastStart = new Date(settings.lastPeriodStartDate + 'T00:00:00');
  const today = new Date();
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const ovulationOffset = Math.max(periodLength + 2, cycleLength - 14);

  const predictions: PredictedCycle[] = [];

  // Calculate base next cycle start
  const diffDays = Math.floor((d2.getTime() - lastStart.getTime()) / (1000 * 60 * 60 * 24));
  let baseNextStartDays = 0;
  if (diffDays >= 0) {
    const passedCycles = Math.floor(diffDays / cycleLength) + 1;
    baseNextStartDays = passedCycles * cycleLength;
  } else {
    baseNextStartDays = 0;
  }

  for (let i = 0; i < count; i++) {
    const cycleStart = new Date(lastStart);
    cycleStart.setDate(cycleStart.getDate() + baseNextStartDays + (i * cycleLength));

    const ovDate = new Date(cycleStart);
    ovDate.setDate(ovDate.getDate() + ovulationOffset - 1);

    const fertileStart = new Date(ovDate);
    fertileStart.setDate(fertileStart.getDate() - 5);

    const fertileEnd = new Date(ovDate);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    const daysUntilStart = Math.ceil((cycleStart.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));

    const startIso = toGregorianIsoString(cycleStart);
    const ovIso = toGregorianIsoString(ovDate);

    predictions.push({
      cycleIndex: i + 1,
      startDateIso: startIso,
      startDatePersian: formatPersianDate(startIso),
      daysUntilStart,
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
    const bDate = new Date(birthDateStr + 'T00:00:00');
    const tDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const diffTime = tDate.getTime() - bDate.getTime();
    const daysAlive = Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
