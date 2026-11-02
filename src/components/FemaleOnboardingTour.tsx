import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowRight, 
  Sparkles, 
  Heart, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  ShieldCheck, 
  HelpCircle, 
  Activity, 
  Info,
  Calendar as CalendarIcon,
  Flame,
  Shield,
  Smile,
  AlertCircle
} from "lucide-react";
import { UserProfile, FemaleOnboardingHealthData } from "../types";
import { 
  JALALI_MONTHS, 
  JALALI_WEEKDAYS, 
  toPersianDigits, 
  gregorianToJalali, 
  jalaliToGregorian, 
  getDaysInJalaliMonth, 
  getTehranDate, 
  formatPersianDate 
} from "../utils/jalali";

interface FemaleOnboardingTourProps {
  userProfile: UserProfile;
  onComplete: (data: FemaleOnboardingHealthData) => Promise<void> | void;
  onSkip?: () => void;
}

// -------------------------------------------------------------
// VERTICAL WHEEL PICKER (Tactile, snap-to-center, soft gradient fade)
// -------------------------------------------------------------
interface VerticalWheelPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  unit: string;
  step?: number;
}

function VerticalWheelPicker({
  min,
  max,
  value,
  onChange,
  unit,
  step = 1
}: VerticalWheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 46;
  const isInternalScroll = useRef(false);

  // Generate range of items
  const items = useMemo(() => {
    const list: number[] = [];
    for (let i = min; i <= max; i += step) {
      list.push(i);
    }
    return list;
  }, [min, max, step]);

  // Synchronize scroll position on mount and value changes
  useEffect(() => {
    if (isInternalScroll.current) return;
    const container = containerRef.current;
    if (!container) return;
    const index = items.indexOf(value);
    if (index !== -1) {
      container.scrollTop = index * ITEM_HEIGHT;
    }
  }, [value, items]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    isInternalScroll.current = true;
    const top = e.currentTarget.scrollTop;
    const index = Math.round(top / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
    const selectedItem = items[clampedIndex];
    if (selectedItem !== undefined && selectedItem !== value) {
      onChange(selectedItem);
    }
    // Release internal scroll lock after momentum scroll finishes
    setTimeout(() => {
      isInternalScroll.current = false;
    }, 120);
  };

  const handleItemClick = (item: number, index: number) => {
    onChange(item);
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="relative w-full max-w-[260px] mx-auto h-[230px] select-none flex items-center justify-center">
      {/* Center Highlight Slot with delicate borders and warm tone */}
      <div 
        className="absolute inset-x-0 top-[92px] h-[46px] rounded-2xl bg-[#FFFDF8] border border-[#F6C3E5] shadow-sm pointer-events-none flex items-center justify-between px-5 z-0"
      >
        <span className="text-xs font-bold text-[#EC407A] tracking-wider">{unit}</span>
        <div className="w-2 h-2 rounded-full bg-[#EC407A]" />
      </div>

      {/* Top and Bottom Gradient Masks for optical 3D roll effect */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#FFFDF8] via-[#FFFDF8]/80 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#FFFDF8] via-[#FFFDF8]/80 to-transparent pointer-events-none z-10" />

      {/* Scrollable Container with native CSS snapping */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth py-[92px] no-scrollbar z-1 relative text-center"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item, index) => {
          const distance = Math.abs(item - value);
          const isSelected = distance === 0;

          return (
            <div
              key={item}
              onClick={() => handleItemClick(item, index)}
              className={`h-[46px] snap-center flex items-center justify-center cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "text-2xl font-black text-[#1B1B1A] scale-110"
                  : distance === 1
                  ? "text-lg font-bold text-[#78746B] opacity-65 scale-95"
                  : "text-sm font-semibold text-[#A6A297] opacity-35 scale-85"
              }`}
            >
              <span className="tabular-nums font-mono">
                {toPersianDigits(item)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN FEMALE ONBOARDING TOUR
// -------------------------------------------------------------
export default function FemaleOnboardingTour({
  userProfile,
  onComplete,
  onSkip
}: FemaleOnboardingTourProps) {
  const userName = userProfile.displayName?.trim() || "زیبا";

  // State across all steps
  const [cycleRegularity, setCycleRegularity] = useState<"regular" | "irregular" | "unknown">("regular");
  const [contraceptionIntent, setContraceptionIntent] = useState<"not_in_relationship" | "preventing">("preventing");
  const [contraceptionMethod, setContraceptionMethod] = useState<"condom" | "natural" | "pills" | "iud" | "emergency" | "other">("condom");
  const [fertilityAwareness, setFertilityAwareness] = useState<"yes_less_stress" | "unaware_active" | "dont_know_safe_days">("dont_know_safe_days");
  const [healthConditions, setHealthConditions] = useState<string[]>(["none"]);
  const [heightCm, setHeightCm] = useState<number>(170);
  const [weightKg, setWeightKg] = useState<number>(70);
  const [periodLength, setPeriodLength] = useState<number>(7);
  const [cycleLength, setCycleLength] = useState<number>(28);

  // Calendar State for Step 10 (Last Period Start Date)
  const todayTehran = getTehranDate();
  const [todayJy, todayJm, todayJd] = gregorianToJalali(
    todayTehran.getFullYear(),
    todayTehran.getMonth() + 1,
    todayTehran.getDate()
  );

  const [calendarYear, setCalendarYear] = useState<number>(todayJy);
  const [calendarMonth, setCalendarMonth] = useState<number>(todayJm);

  // Default selected start date: 7 days ago in Gregorian converted to Jalali
  const [selectedStartDate, setSelectedStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const mStr = String(jm).padStart(2, "0");
    const dStr = String(jd).padStart(2, "0");
    return `${jy}-${mStr}-${dStr}`;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Active steps based on branching:
  // If contraceptionIntent === 'not_in_relationship', skip Steps 3 & 4
  const activeSteps = useMemo(() => {
    if (contraceptionIntent === "not_in_relationship") {
      return [1, 2, 5, 6, 7, 8, 9, 10];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  }, [contraceptionIntent]);

  const currentStepNumber = activeSteps[stepIndex] || 1;
  const totalSteps = activeSteps.length;
  // Progress along the arc (from 0 to 1)
  const progressFraction = (stepIndex + 1) / totalSteps;

  // Real-time BMI calculation
  const calculatedBmi = useMemo(() => {
    if (heightCm > 0 && weightKg > 0) {
      const hM = heightCm / 100.0;
      return Number((weightKg / (hM * hM)).toFixed(1));
    }
    return 22.0;
  }, [heightCm, weightKg]);

  const bmiCategory = useMemo(() => {
    if (calculatedBmi < 18.5) return { text: "کم‌وزن", color: "#B8CEF4" };
    if (calculatedBmi < 25) return { text: "وزن نرمال و ایده‌آل ✨", color: "#A7B86C" };
    if (calculatedBmi < 30) return { text: "اضافه وزن ملایم", color: "#F6DC6B" };
    return { text: "نیاز به توجه بیشتر", color: "#F6C3E5" };
  }, [calculatedBmi]);

  // Set of consecutive period days for Jalali calendar highlight in Step 10
  const consecutivePeriodDaysSet = useMemo(() => {
    const set = new Set<string>();
    if (!selectedStartDate) return set;
    const parts = selectedStartDate.split("-").map(Number);
    if (parts.length !== 3) return set;
    const [sJy, sJm, sJd] = parts;
    const [gy, gm, gd] = jalaliToGregorian(sJy, sJm, sJd);

    for (let offset = 0; offset < periodLength; offset++) {
      const targetDate = new Date(gy, gm - 1, gd + offset);
      const [jy, jm, jd] = gregorianToJalali(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        targetDate.getDate()
      );
      set.add(`${jy}-${jm}-${jd}`);
    }
    return set;
  }, [selectedStartDate, periodLength]);

  // Navigation handlers
  const handleNext = async () => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      // Final submission (Step 10)
      setIsSubmitting(true);
      try {
        // Convert Jalali start date to Gregorian ISO date string (YYYY-MM-DD)
        const parts = selectedStartDate.split("-").map(Number);
        const [gy, gm, gd] = jalaliToGregorian(parts[0], parts[1], parts[2]);
        const gregDateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;

        const payload: FemaleOnboardingHealthData = {
          cycleRegularity,
          contraceptionIntent,
          contraceptionMethod: contraceptionIntent === "preventing" ? contraceptionMethod : undefined,
          fertilityAwareness: contraceptionIntent === "preventing" ? fertilityAwareness : undefined,
          healthConditions,
          heightCm,
          weightKg,
          periodLength,
          cycleLength,
          lastPeriodStartDate: gregDateStr,
          bmi: calculatedBmi,
          completedAt: new Date().toISOString()
        };

        await onComplete(payload);
      } catch (err) {
        console.error("Onboarding submission error:", err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    } else if (onSkip) {
      onSkip();
    }
  };

  // Multi-select toggle for Step 5
  const toggleHealthCondition = (key: string) => {
    if (key === "none" || key === "dont_know") {
      setHealthConditions([key]);
      return;
    }
    setHealthConditions((prev) => {
      const filtered = prev.filter((k) => k !== "none" && k !== "dont_know");
      if (filtered.includes(key)) {
        const next = filtered.filter((k) => k !== key);
        return next.length === 0 ? ["none"] : next;
      } else {
        return [...filtered, key];
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#1B1B1A] flex flex-col justify-between" dir="rtl">
      {/* ----------------- TOP CURVED HEADER & ARC PROGRESS ----------------- */}
      <header className="relative bg-gradient-to-b from-[#FFF0F5] via-[#FFF7FA] to-[#FFFDF8] pt-6 pb-2 overflow-hidden border-b border-[#F0EBE0]/60 shadow-sm">
        {/* Subtle Background Geometric Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#EC407A 1px, transparent 1px)`,
            backgroundSize: `16px 16px`
          }}
        />

        {/* Top Control Bar: Back button, Logo Badge, Step Indicator */}
        <div className="relative max-w-lg mx-auto px-5 flex items-center justify-between z-10">
          {/* Circular Back Button */}
          <button
            type="button"
            onClick={handlePrev}
            className="w-10 h-10 rounded-full bg-white/90 border border-[#F2DEE9] shadow-sm flex items-center justify-center text-[#1B1B1A] hover:bg-white active:scale-90 transition-all cursor-pointer"
            title="مرحله قبل"
          >
            <ArrowRight className="w-4 h-4 stroke-[2]" />
          </button>

          {/* Center Brand Emblem */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#F6C3E5] to-[#EC407A] flex items-center justify-center text-white shadow-md shadow-pink-500/20">
              <Sparkles className="w-5 h-5 stroke-[2] animate-pulse" />
            </div>
            <span className="text-[11px] font-bold text-[#EC407A] mt-1 tracking-wide">
              تور سلامت و چرخه طغرل
            </span>
          </div>

          {/* Step Counter Pill */}
          <div className="px-3 py-1 bg-white/90 border border-[#F2DEE9] rounded-full text-xs font-bold text-[#78746B] shadow-sm">
            <span>مرحله {toPersianDigits(stepIndex + 1)}</span>
            <span className="text-[#A6A297] mx-1">/</span>
            <span>{toPersianDigits(totalSteps)}</span>
          </div>
        </div>

        {/* SVG Curved Header Separator & Animated Arc Progress Bar */}
        <div className="relative w-full mt-3">
          <svg
            viewBox="0 0 400 45"
            preserveAspectRatio="none"
            className="w-full h-10 sm:h-12 overflow-visible"
          >
            {/* White card fill underneath curve */}
            <path
              d="M 0,0 C 130,42 270,42 400,0 L 400,45 L 0,45 Z"
              fill="#FFFDF8"
            />
            {/* Background Arc Track (Light Pink) */}
            <path
              d="M 380,8 C 270,38 130,38 20,8"
              fill="none"
              stroke="#FCE4EC"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Animated Dynamic Arc Progress (Vibrant Pink/Magenta) */}
            <motion.path
              d="M 380,8 C 270,38 130,38 20,8"
              fill="none"
              stroke="#EC407A"
              strokeWidth="5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progressFraction }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        </div>
      </header>

      {/* ----------------- STEP CONTENT CONTAINER ----------------- */}
      <main className="flex-1 w-full max-w-lg mx-auto px-5 py-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ==================== STEP 1: CYCLE REGULARITY ==================== */}
          {currentStepNumber === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#EC407A]">قدم اول: شناخت بدن شما</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  حالا بهمون بگو که معمولا پریودت منظمه یا نامنظم؟
                </h2>
                <p className="text-xs text-[#78746B]">
                  این سوال به پیش‌بینی دقیق‌تر فازهای باروری و دوره‌های بعدی کمک می‌کنه
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "regular",
                    label: "تاریخ پریودهام رو یادداشت کردم و میدونم پریودم منظمه 😎",
                    subtext: null
                  },
                  {
                    key: "irregular",
                    label: "پریودم نامنظمه و تحت نظر پزشک هستم 😑",
                    subtext: null
                  },
                  {
                    key: "unknown",
                    label: "نمیدونم پریودم منظمه یا نامنظم 🤔",
                    subtext: "اشکالی نداره. ما در گزارش قاعدگی بعد از سه دوره بهت میگیم که پریودت منظمه یا نه و بهت در منظم شدن پریود کمک میکنیم."
                  }
                ].map((opt) => {
                  const isSelected = cycleRegularity === opt.key;
                  return (
                    <motion.div
                      layout
                      key={opt.key}
                      onClick={() => setCycleRegularity(opt.key as any)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFF0F7] border-[#EC407A] shadow-sm"
                          : "bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#FAF6EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#1B1B1A] leading-relaxed">
                          {opt.label}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#EC407A] text-white"
                              : "border border-[#D1CCC0] bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {opt.subtext && isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-[#F2DEE9] text-xs font-medium text-[#78746B] leading-relaxed flex items-start gap-2"
                        >
                          <Info className="w-4 h-4 text-[#EC407A] shrink-0 mt-0.5" />
                          <span>{opt.subtext}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 2: CONTRACEPTION INTENT ==================== */}
          {currentStepNumber === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#EC407A]">هدف شما از ترکر</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  {userName} جان، آیا قصد پیشگیری از بارداری داری؟
                </h2>
                <p className="text-xs text-[#78746B]">
                  تنظیمات روزهای امن و یادآوری‌ها متناسب با این انتخاب سفارشی می‌شود
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "not_in_relationship",
                    label: "نه در رابطه نیستم",
                    sub: "صرفاً پیگیری منظم سلامت چرخه و علائم پریود"
                  },
                  {
                    key: "preventing",
                    label: "بله، قصد بچه‌دار شدن ندارم",
                    sub: "محاسبه روزهای با احتمال بارداری نزدیک به صفر و روزهای پرریسک"
                  }
                ].map((opt) => {
                  const isSelected = contraceptionIntent === opt.key;
                  return (
                    <div
                      key={opt.key}
                      onClick={() => setContraceptionIntent(opt.key as any)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFF0F7] border-[#EC407A] shadow-sm"
                          : "bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#FAF6EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-[#1B1B1A]">{opt.label}</div>
                          <div className="text-xs text-[#78746B] mt-0.5">{opt.sub}</div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#EC407A] text-white"
                              : "border border-[#D1CCC0] bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 3: CONTRACEPTION METHOD ==================== */}
          {currentStepNumber === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-5">
                <span className="text-xs font-semibold text-[#EC407A]">روش‌های محافظتی</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  {userName} جان از چه روش پیشگیری از بارداری استفاده میکنی؟
                </h2>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {[
                  {
                    key: "condom",
                    label: "کاندوم",
                    subtext: "کاندوم یکی از روش‌های امن و در عین حال راحت پیشگیری از بارداریه که از بروز بیماری‌های مقاربتی هم جلوگیری میکنه و درصد موفقیتش ۹۰ درصده اما نیاز به همکاری پارتنرت داره"
                  },
                  {
                    key: "natural",
                    label: "پیشگیری طبیعی",
                    subtext: "روش طبیعی نیازمند شناخت دقیق روزهای تخمک‌گذاریه و درصد خطای بالاتری داره، اما با ترکر ما روزهای پرریسک رو دقیق متوجه میشی."
                  },
                  {
                    key: "pills",
                    label: "قرص پیشگیری از بارداری",
                    subtext: "قرص‌های خوراکی اثربخشی بالایی دارن اما نیاز به مصرف منظم در ساعت مشخص روزانه دارن تا بالاترین محافظت رو ایجاد کنن."
                  },
                  {
                    key: "iud",
                    label: "آی یو دی",
                    subtext: "یکی از موثرترین و مطمئن‌ترین روش‌های بلندمدت و بدون نیاز به یادآوری روزانه با اثربخشی بالای ۹۹ درصد."
                  },
                  {
                    key: "emergency",
                    label: "قرص اورژانسی",
                    subtext: "قرص اورژانسی صرفاً برای شرایط پیش‌بینی‌نشده است و نباید به عنوان روش دائمی استفاده بشه چون چرخه هورمونی رو تغییر میده."
                  },
                  {
                    key: "other",
                    label: "سایر روش‌های پیشگیری",
                    subtext: "مثل آمپول‌های هورمونی، پچ یا ایمپلنت که بر اساس توصیه پزشک استفاده میشن."
                  }
                ].map((opt) => {
                  const isSelected = contraceptionMethod === opt.key;
                  return (
                    <motion.div
                      layout
                      key={opt.key}
                      onClick={() => setContraceptionMethod(opt.key as any)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFF0F7] border-[#EC407A] shadow-sm"
                          : "bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#FAF6EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#1B1B1A]">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#EC407A] text-white"
                              : "border border-[#D1CCC0] bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2.5 pt-2.5 border-t border-[#F2DEE9] text-xs font-medium text-[#78746B] leading-relaxed flex items-start gap-2"
                        >
                          <Info className="w-3.5 h-3.5 text-[#EC407A] shrink-0 mt-0.5" />
                          <span>{opt.subtext}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 4: FERTILITY AWARENESS ==================== */}
          {currentStepNumber === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#EC407A]">آگاهی از روزهای امن</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  آیا تا به حال تو روزهایی که احتمال بارداری در اون نزدیک به صفره رابطه جنسی داشتی؟
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "yes_less_stress",
                    label: "آره با این کار استرسم برای باردار شدن کمتره",
                    subtext: null
                  },
                  {
                    key: "unaware_active",
                    label: "بدون توجه به این موضوع رابطه جنسی رو انجام میدیم",
                    subtext: null
                  },
                  {
                    key: "dont_know_safe_days",
                    label: "نمیدونم احتمال باردارشدن در چه روزهایی کمتره",
                    subtext: "احتمال بارداری در روزهایی به جز روزهای باروری مخصوصا در روزهای پایانی قبل از شروع پریود کم و نزدیک به صفره که ما این روزها رو برات محاسبه و بهت یادآوری میکنیم."
                  }
                ].map((opt) => {
                  const isSelected = fertilityAwareness === opt.key;
                  return (
                    <motion.div
                      layout
                      key={opt.key}
                      onClick={() => setFertilityAwareness(opt.key as any)}
                      className={`p-4 rounded-3xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFF0F7] border-[#EC407A] shadow-sm"
                          : "bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#FAF6EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#1B1B1A] leading-relaxed">
                          {opt.label}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#EC407A] text-white"
                              : "border border-[#D1CCC0] bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      {opt.subtext && isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 pt-3 border-t border-[#F2DEE9] text-xs font-medium text-[#78746B] leading-relaxed flex items-start gap-2"
                        >
                          <Info className="w-4 h-4 text-[#EC407A] shrink-0 mt-0.5" />
                          <span>{opt.subtext}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 5: HEALTH CONDITIONS ==================== */}
          {currentStepNumber === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-5">
                <span className="text-xs font-semibold text-[#EC407A]">سوابق و وضعیت سلامت</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  کدوم مشکل یا بیماری رو داری که احتمالا روی چرخه قاعدگیت تاثیرگذار باشه؟
                </h2>
                <p className="text-xs text-[#78746B]">امکان انتخاب چند گزینه وجود دارد</p>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {[
                  { key: "pcos", label: "تنبلی تخمدان یا کیست تخمدان", subtext: null },
                  { key: "fibroids", label: "فیبروم رحم", subtext: null },
                  { key: "thyroid", label: "مشکلات تیروئید", subtext: null },
                  { key: "endometriosis", label: "آندومتریوز", subtext: null },
                  { key: "overweight", label: "اضافه وزن", subtext: null },
                  {
                    key: "dont_know",
                    label: "نمیدونم",
                    subtext: "انجام یک چکاپ کامل برای آگاهی از بیماری‌های احتمالی میتونه بهت این اطمینان رو بده که سالم هستی و هیچ مشکلی نداری."
                  },
                  { key: "none", label: "هیچ مشکلی ندارم", subtext: null }
                ].map((opt) => {
                  const isSelected = healthConditions.includes(opt.key);
                  return (
                    <motion.div
                      layout
                      key={opt.key}
                      onClick={() => toggleHealthCondition(opt.key)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#FFF0F7] border-[#EC407A] shadow-sm"
                          : "bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#FAF6EC]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-[#1B1B1A]">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#EC407A] text-white"
                              : "border border-[#D1CCC0] bg-transparent"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      {opt.subtext && isSelected && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2.5 pt-2.5 border-t border-[#F2DEE9] text-xs font-medium text-[#78746B] leading-relaxed flex items-start gap-2"
                        >
                          <Info className="w-3.5 h-3.5 text-[#EC407A] shrink-0 mt-0.5" />
                          <span>{opt.subtext}</span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 6: HEIGHT ==================== */}
          {currentStepNumber === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#78746B]">
                  برای اینکه برنامه تخصصی مناسبت رو بهت بدیم لازمه بدونیم:
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  در حال حاضر قدت چقدره؟
                </h2>
              </div>

              {/* Vertical Wheel Picker for Height (120 - 210 cm) */}
              <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-3xl p-6 shadow-sm">
                <VerticalWheelPicker
                  min={120}
                  max={210}
                  value={heightCm}
                  onChange={setHeightCm}
                  unit="سانتی‌متر"
                />
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 7: WEIGHT ==================== */}
          {currentStepNumber === 7 && (
            <motion.div
              key="step-7"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#78746B]">
                  برای اینکه برنامه تخصصی مناسبت رو بهت بدیم لازمه بدونیم:
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  در حال حاضر وزنت چقدره؟
                </h2>
              </div>

              {/* Vertical Wheel Picker for Weight (35 - 150 kg) */}
              <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-3xl p-6 shadow-sm space-y-4">
                <VerticalWheelPicker
                  min={35}
                  max={150}
                  value={weightKg}
                  onChange={setWeightKg}
                  unit="کیلوگرم"
                />

                {/* Real-time Dynamic BMI calculation preview badge */}
                <div className="pt-3 border-t border-[#F0EBE0] flex items-center justify-between text-xs font-bold px-2">
                  <span className="text-[#78746B]">شاخص توده بدنی (BMI):</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm text-[#1B1B1A]">
                      {toPersianDigits(calculatedBmi)}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#FAF6EC] border border-[#E8E2D4]">
                      {bmiCategory.text}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 8: PERIOD LENGTH ==================== */}
          {currentStepNumber === 8 && (
            <motion.div
              key="step-8"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-6">
                <span className="text-xs font-semibold text-[#78746B]">برای پیش‌بینی دقیق‌تر بهمون بگو</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  معمولا پریودت چند روز طول میکشه؟
                </h2>
                <p className="text-xs text-[#78746B]">مدت خونریزی در هر چرخه (معمولاً بین ۳ تا ۷ روز)</p>
              </div>

              {/* Vertical Wheel Picker for Period Length (2 - 10 days) */}
              <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-3xl p-6 shadow-sm">
                <VerticalWheelPicker
                  min={2}
                  max={10}
                  value={periodLength}
                  onChange={setPeriodLength}
                  unit="روز"
                />
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 9: CYCLE LENGTH ==================== */}
          {currentStepNumber === 9 && (
            <motion.div
              key="step-9"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1.5 mb-5">
                <span className="text-xs font-semibold text-[#EC407A]">محاسبه فاصله شروع دوره‌ها</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  فاصله بین شروع دو پریودت چقدره؟
                </h2>
                <p className="text-xs text-[#78746B] leading-relaxed max-w-sm mx-auto bg-[#FAF6EC] p-2.5 rounded-2xl border border-[#E8E2D4]">
                  (یه مثال ساده: فرض کن ۱ مهر پریود شدی. اگه پریود بعدیت ۲۹ مهر شروع بشه، یعنی طول دوره تو ۲۸ روز هست.)
                </p>
              </div>

              {/* Vertical Wheel Picker for Cycle Length (21 - 45 days) */}
              <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-3xl p-6 shadow-sm">
                <VerticalWheelPicker
                  min={21}
                  max={45}
                  value={cycleLength}
                  onChange={setCycleLength}
                  unit="روز"
                />
              </div>
            </motion.div>
          )}

          {/* ==================== STEP 10: JALALI CALENDAR LAST PERIOD ==================== */}
          {currentStepNumber === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1 mb-4">
                <span className="text-xs font-semibold text-[#EC407A]">مرحله نهایی</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#1B1B1A] leading-snug">
                  تاریخ شروع آخرین باری که پریود شدی رو بهمون بگو
                </h2>
                <p className="text-xs text-[#78746B]">
                  برای محاسبه و پیش‌بینی تاریخ پریودهای بعدیت لازمه که تاریخ شروع آخرین پریودت رو بدونیم
                </p>
              </div>

              {/* Jalali Calendar View */}
              <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                {/* Calendar Header with Navigation */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 1) {
                        setCalendarMonth(12);
                        setCalendarYear((y) => y - 1);
                      } else {
                        setCalendarMonth((m) => m - 1);
                      }
                    }}
                    className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A] cursor-pointer"
                    title="ماه قبل"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2]" />
                  </button>

                  <h3 className="text-base font-bold text-[#1B1B1A]">
                    {JALALI_MONTHS[calendarMonth - 1]} {toPersianDigits(calendarYear)}
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      if (calendarMonth === 12) {
                        setCalendarMonth(1);
                        setCalendarYear((y) => y + 1);
                      } else {
                        setCalendarMonth((m) => m + 1);
                      }
                    }}
                    className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A] cursor-pointer"
                    title="ماه بعد"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>

                {/* Weekday Names Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#78746B]">
                  {JALALI_WEEKDAYS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                {(() => {
                  const daysInMonth = getDaysInJalaliMonth(calendarYear, calendarMonth);
                  const [firstGy, firstGm, firstGd] = jalaliToGregorian(calendarYear, calendarMonth, 1);
                  const firstDateGregorian = new Date(firstGy, firstGm - 1, firstGd);
                  const jsDay = firstDateGregorian.getDay();
                  const firstDayOfWeekOffset = (jsDay + 1) % 7;

                  const emptySlots = Array.from({ length: firstDayOfWeekOffset });
                  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                  return (
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                      {emptySlots.map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-10 sm:h-11" />
                      ))}

                      {monthDays.map((dayNum) => {
                        const dayKey = `${calendarYear}-${calendarMonth}-${dayNum}`;
                        const formattedSelected = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                        const isStartDay = selectedStartDate === formattedSelected;
                        const isConsecutivePeriod = consecutivePeriodDaysSet.has(dayKey);
                        const isToday =
                          calendarYear === todayJy &&
                          calendarMonth === todayJm &&
                          dayNum === todayJd;

                        return (
                          <button
                            key={dayNum}
                            type="button"
                            onClick={() => setSelectedStartDate(formattedSelected)}
                            className={`h-10 sm:h-11 rounded-2xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                              isStartDay
                                ? "bg-[#EC407A] text-white shadow-md shadow-pink-500/25 scale-105 font-black z-1"
                                : isConsecutivePeriod
                                ? "bg-[#F6C3E5] text-[#1B1B1A] font-bold"
                                : isToday
                                ? "bg-[#FAF6EC] border border-dashed border-[#1B1B1A] text-[#1B1B1A] font-bold"
                                : "hover:bg-[#FAF6EC] text-[#1B1B1A] font-medium"
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-mono">
                              {toPersianDigits(dayNum)}
                            </span>

                            {/* Indicator underneath number: Checkmark for period days */}
                            {isStartDay ? (
                              <span className="text-[9px] leading-none mt-0.5">شروع</span>
                            ) : isConsecutivePeriod ? (
                              <Check className="w-3 h-3 stroke-[3] text-[#EC407A]" />
                            ) : isToday ? (
                              <span className="text-[8px] text-[#78746B] leading-none">امروز</span>
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#E5E0D2] mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Jump to Today circular button & period summary notice */}
                <div className="pt-2 border-t border-[#F0EBE0] flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setCalendarYear(todayJy);
                      setCalendarMonth(todayJm);
                    }}
                    className="p-2 rounded-full bg-[#FAF6EC] hover:bg-[#EFECE2] border border-[#E8E2D4] text-[#1B1B1A] flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="بازگشت به ماه جاری"
                  >
                    <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                    <span className="font-bold text-[11px]">امروز</span>
                  </button>

                  <div className="text-[11px] font-bold text-[#EC407A]">
                    <span>طول پریود انتخابی: {toPersianDigits(periodLength)} روز متوالی</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ----------------- BOTTOM CTA BUTTON BAR ----------------- */}
      <footer className="w-full max-w-lg mx-auto px-5 py-4 bg-[#FAF6EC]">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleNext}
          className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-[#EC407A] to-[#E91E63] hover:from-[#E91E63] hover:to-[#D81B60] text-white font-bold text-sm sm:text-base shadow-lg shadow-pink-500/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>در حال ذخیره‌سازی و راه‌اندازی ترکر...</span>
            </div>
          ) : currentStepNumber === 10 ? (
            <div className="flex items-center gap-2">
              <span>ثبت نام و ورود به داشبورد</span>
              <Sparkles className="w-4 h-4 stroke-[2]" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>ادامه</span>
              <ChevronLeft className="w-4 h-4 stroke-[2]" />
            </div>
          )}
        </button>
      </footer>
    </div>
  );
}
