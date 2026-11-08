import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Droplet,
  Calendar as CalendarIcon,
  Heart,
  Sparkles,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Baby,
  Zap,
  HeartPulse,
  Info,
  Settings,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
  BarChart3,
  Eye,
  Coffee,
  HeartHandshake,
  CheckCircle2,
  MessageCircleHeart,
  Send,
  X,
  Download,
  Brain,
  Dna,
  Moon,
  Flower2,
  CircleDot,
  ArrowUpRight
} from "lucide-react";
import confetti from "canvas-confetti";
import { NeoZigZagTrend } from "./NeoBrutalStickers";
import {
  UserProfile,
  ImpoPeriodSettings,
  ImpoDailyLog,
  CycleGoalMode,
  PeriodSharingSettings
} from "../types";
import {
  calculateCycleStatus,
  predictFutureCycles,
  calculateBiorhythm,
  daysBetween,
  extractCycleHistory,
  predictCycle,
  CycleStatusResult,
  PredictedCycle,
  BiorhythmResult,
  CyclePredictionResult
} from "../utils/impoCycleEngine";
import {
  formatPersianDate,
  toPersianDigits,
  gregorianToJalali,
  jalaliToGregorian,
  getDaysInJalaliMonth,
  JALALI_MONTHS,
  JALALI_WEEKDAYS,
  getTehranDate,
  toGregorianIsoString
} from "../utils/jalali";
import { fetchFromPhpApi } from "../apiClient";
import JalaliDatePicker from "./JalaliDatePicker";
import QuickCycleSetupModal from "./QuickCycleSetupModal";

interface ImpoPeriodTrackerProps {
  userProfile: UserProfile;
  onSendPoke?: (message: string, tag: string) => void;
  onUpdateGender?: (gender: "female" | "male") => void;
  openLogTrigger?: number;
}

// Flow Level Options
const FLOW_OPTIONS = [
  { id: "none", label: "بدون خونریزی", icon: "⚪" },
  { id: "spotting", label: "لکه‌بینی", icon: "💧" },
  { id: "light", label: "خفیف", icon: "🩸" },
  { id: "medium", label: "متوسط", icon: "🩸🩸" },
  { id: "heavy", label: "شدید", icon: "🩸🩸🩸" }
];

// Mood Options
const MOOD_OPTIONS = [
  { id: "happy", label: "شاد و پرانرژی", icon: "🥰" },
  { id: "calm", label: "آرام و راضی", icon: "🧘‍♀️" },
  { id: "moody", label: "نوسان خلق", icon: "🎭" },
  { id: "sensitive", label: "حساس و زودرنج", icon: "🥺" },
  { id: "anxious", label: "مضطرب و نگران", icon: "😰" },
  { id: "tired", label: "خسته و بی‌انرژی", icon: "🥱" },
  { id: "angry", label: "کلافه یا عصبی", icon: "😤" }
];

// Physical Symptoms Options
const SYMPTOM_OPTIONS = [
  { id: "cramps", label: "دل‌پیچه و کرامپ", icon: "⚡" },
  { id: "backache", label: "کمردرد", icon: "🦴" },
  { id: "headache", label: "سردرد / میگرن", icon: "🤕" },
  { id: "tender_breasts", label: "حساسیت پستان", icon: "🌸" },
  { id: "bloating", label: "نفخ و ورم شکم", icon: "🎈" },
  { id: "nausea", label: "حالت تهوع", icon: "🤢" },
  { id: "acne", label: "آکنه و جوش پوستی", icon: "✨" },
  { id: "sweet_cravings", label: "هوس شیرینی", icon: "🍫" }
];

// Cervical Discharge Options
const DISCHARGE_OPTIONS = [
  { id: "none", label: "خشک / بدون ترشح" },
  { id: "sticky", label: "چسبناک" },
  { id: "creamy", label: "کرمی و شیری" },
  { id: "watery", label: "آبکی و لغزنده" },
  { id: "clear", label: "شفاف کشسان (سفیده تخم‌مرغ) 🥚" }
];

// Intimacy Options
const SEX_OPTIONS = [
  { id: "none", label: "بدون رابطه", icon: "🚫" },
  { id: "protected", label: "رابطه محافظت‌شده (کاندوم/قرص)", icon: "🛡️" },
  { id: "unprotected", label: "رابطه محافظت‌نشده", icon: "💖" }
];

// Ovulation Test Options
const OVULATION_TEST_OPTIONS = [
  { id: "none", label: "ثبت‌نشده", icon: "⚪" },
  { id: "negative", label: "منفی (خط کم‌رنگ)", icon: "➖" },
  { id: "positive_weak", label: "مثبت ضعیف", icon: "🟡" },
  { id: "positive_peak", label: "مثبت اوج (تخمک‌گذاری)", icon: "🟣" }
];

// Pregnancy Test Options
const PREGNANCY_TEST_OPTIONS = [
  { id: "none", label: "تست نداده‌ام", icon: "⚪" },
  { id: "negative", label: "منفی (یک خط)", icon: "➖" },
  { id: "positive", label: "مثبت (دو خط / باردار)", icon: "👶" }
];

// SVG Polar Helpers (0 deg = 12 o'clock, clockwise)
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export default function ImpoPeriodTracker({
  userProfile,
  onSendPoke,
  onUpdateGender,
  openLogTrigger
}: ImpoPeriodTrackerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "predictions" | "history">("dashboard");
  const [viewMode, setViewMode] = useState<"circular" | "calendar">("circular");

  const storageKey = userProfile.coupleId || userProfile.uid;

  // Period Settings State
  const [settings, setSettings] = useState<ImpoPeriodSettings>(() => {
    const cached =
      localStorage.getItem(`impo_period_settings_${storageKey}`) ||
      localStorage.getItem(`impo_period_settings_${userProfile.uid}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: toGregorianIsoString(new Date()),
      goalMode: "track",
      birthDate: "2000-01-01",
      viewMode: "circular"
    };
  });

  const [hasConfigured, setHasConfigured] = useState<boolean>(() => {
    return !!(
      localStorage.getItem(`impo_period_configured_${storageKey}`) ||
      localStorage.getItem(`impo_period_configured_${userProfile.uid}`)
    );
  });

  // Never auto-hijack the screen with a modal on tab switch; open only when user taps setup banner
  const [showQuickSetupModal, setShowQuickSetupModal] = useState<boolean>(false);

  // Daily Logs State
  const [logs, setLogs] = useState<ImpoDailyLog[]>(() => {
    const cached =
      localStorage.getItem(`impo_period_logs_${storageKey}`) ||
      localStorage.getItem(`impo_period_logs_${userProfile.uid}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  // Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [isPreviewingAsPartner, setIsPreviewingAsPartner] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>(toGregorianIsoString(new Date()));
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [showDeleteAllConfirmModal, setShowDeleteAllConfirmModal] = useState(false);
  const [trackerToast, setTrackerToast] = useState<string | null>(null);
  const [selectedLegendPhase, setSelectedLegendPhase] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setTrackerToast(msg);
    setTimeout(() => setTrackerToast(null), 3500);
  };

  // Period Sharing Settings
  const [sharing, setSharing] = useState<PeriodSharingSettings>(() => {
    const targetId = userProfile.coupleId || userProfile.uid;
    const cached = localStorage.getItem(`impo_period_sharing_${targetId}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
    return {
      sharePhase: true,
      shareNextPeriod: true,
      shareFertileWindow: false,
      shareFlow: false,
      shareMood: false,
      shareSymptoms: false,
      shareSex: false,
      shareTests: false,
      shareNotes: false,
      allowPartnerLogging: false
    };
  });

  // Ownership & Perspective determination
  const isOwner: boolean = useMemo(() => {
    if (settings.trackerOwnerUid) {
      return settings.trackerOwnerUid === userProfile.uid;
    }
    return userProfile.gender !== "male";
  }, [settings.trackerOwnerUid, userProfile.uid, userProfile.gender]);

  const effectiveIsOwner: boolean = isOwner && !isPreviewingAsPartner;
  const partnerRole: "female" | "male" = effectiveIsOwner ? "female" : "male";

  const [showCareModal, setShowCareModal] = useState(false);
  const [customCareMessage, setCustomCareMessage] = useState("");

  // Settings Form State
  const [formCycleLength, setFormCycleLength] = useState<number>(settings.cycleLength || 28);
  const [formPeriodLength, setFormPeriodLength] = useState<number>(settings.periodLength || 5);
  const [formLastPeriodDate, setFormLastPeriodDate] = useState<string>(
    settings.lastPeriodStartDate || toGregorianIsoString(new Date())
  );
  const [formGoalMode, setFormGoalMode] = useState<CycleGoalMode>(settings.goalMode || "track");
  const [formBirthDate, setFormBirthDate] = useState<string>(settings.birthDate || "2000-01-01");
  const [formClaimOwner, setFormClaimOwner] = useState<boolean>(
    settings.trackerOwnerUid ? settings.trackerOwnerUid === userProfile.uid : userProfile.gender !== "male"
  );

  const showSettingsModalRef = useRef(showSettingsModal);
  const isSavingSettingsRef = useRef(false);
  useEffect(() => {
    showSettingsModalRef.current = showSettingsModal;
    if (showSettingsModal) {
      setFormCycleLength(settings.cycleLength || 28);
      setFormPeriodLength(settings.periodLength || 5);
      setFormLastPeriodDate(settings.lastPeriodStartDate || toGregorianIsoString(new Date()));
      setFormGoalMode(settings.goalMode || "track");
      setFormBirthDate(settings.birthDate || "2000-01-01");
    }
  }, [showSettingsModal]);

  // Log Form State
  const [logFormFlow, setLogFormFlow] = useState<any>("none");
  const [logFormIsPeriodStart, setLogFormIsPeriodStart] = useState<boolean>(false);
  const [logFormMoods, setLogFormMoods] = useState<string[]>([]);
  const [logFormSymptoms, setLogFormSymptoms] = useState<string[]>([]);
  const [logFormDischarge, setLogFormDischarge] = useState<any>("none");
  const [logFormSex, setLogFormSex] = useState<any>("none");
  const [logFormOvulationKit, setLogFormOvulationKit] = useState<any>("none");
  const [logFormPregnancyTest, setLogFormPregnancyTest] = useState<any>("none");
  const [logFormSharePregnancyTest, setLogFormSharePregnancyTest] = useState<boolean>(false);
  const [logFormWater, setLogFormWater] = useState<number>(4);
  const [logFormNotes, setLogFormNotes] = useState<string>("");

  // Current Calendar View Month/Year
  const todayTehran = getTehranDate();
  const [todayJy, todayJm] = gregorianToJalali(
    todayTehran.getFullYear(),
    todayTehran.getMonth() + 1,
    todayTehran.getDate()
  );
  const [calendarYear, setCalendarYear] = useState<number>(todayJy);
  const [calendarMonth, setCalendarMonth] = useState<number>(todayJm);

  // Load from Host PHP API (MySQL) & continuous partner synchronization
  useEffect(() => {
    let isMounted = true;
    const targetId = userProfile.coupleId || userProfile.uid;

    const fetchTrackerData = async () => {
      if (isSavingSettingsRef.current) return;
      try {
        const res = await fetchFromPhpApi("getPeriodData", {
          coupleId: userProfile.coupleId || "",
          uid: userProfile.uid
        });

        if (isMounted && !isSavingSettingsRef.current && res && res.status === "success") {
          if (res.settings) {
            const localRaw =
              localStorage.getItem(`impo_period_settings_${targetId}`) ||
              localStorage.getItem(`impo_period_settings_${userProfile.uid}`);
            let localBirthDate: string | undefined;
            if (localRaw) {
              try {
                const parsedLocal = JSON.parse(localRaw);
                if (parsedLocal?.birthDate && parsedLocal.birthDate !== "2000-01-01") {
                  localBirthDate = parsedLocal.birthDate;
                }
              } catch {}
            }

            const effectiveBirthDate =
              res.settings.birthDate && res.settings.birthDate !== "2000-01-01"
                ? res.settings.birthDate
                : localBirthDate || res.settings.birthDate || "2000-01-01";

            const mergedSettings: ImpoPeriodSettings = {
              ...res.settings,
              birthDate: effectiveBirthDate
            };

            setSettings(mergedSettings);
            setHasConfigured(true);
            localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(mergedSettings));
            localStorage.setItem(`impo_period_settings_${userProfile.uid}`, JSON.stringify(mergedSettings));
            localStorage.setItem(`impo_period_configured_${targetId}`, "true");

            if (!showSettingsModalRef.current) {
              setFormCycleLength(mergedSettings.cycleLength || 28);
              setFormPeriodLength(mergedSettings.periodLength || 5);
              setFormLastPeriodDate(mergedSettings.lastPeriodStartDate || toGregorianIsoString(new Date()));
              setFormGoalMode(mergedSettings.goalMode || "track");
              setFormBirthDate(mergedSettings.birthDate || "2000-01-01");
            }

            if (localBirthDate && res.settings.birthDate === "2000-01-01") {
              fetchFromPhpApi("savePeriodSettings", {
                coupleId: userProfile.coupleId || "",
                uid: userProfile.uid,
                settings: mergedSettings
              }).catch(() => {});
            }
          }

          if (res.sharing) {
            setSharing(res.sharing);
            localStorage.setItem(`impo_period_sharing_${targetId}`, JSON.stringify(res.sharing));
          }

          if (Array.isArray(res.logs)) {
            setLogs(res.logs);
            localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(res.logs));
          }
        }
      } catch (err) {
        console.warn("Host period sync notice:", err);
      }
    };

    fetchTrackerData();

    const syncInterval = setInterval(fetchTrackerData, 4000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchTrackerData();
      }
    };
    window.addEventListener("focus", fetchTrackerData);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(syncInterval);
      window.removeEventListener("focus", fetchTrackerData);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userProfile.uid, userProfile.coupleId]);

  const cycleHistory = useMemo(() => {
    return extractCycleHistory(logs, settings);
  }, [logs, settings]);

  const cyclePrediction: CyclePredictionResult = useMemo(() => {
    return predictCycle(cycleHistory, logs, new Date(), settings, 2);
  }, [cycleHistory, logs, settings]);

  const cycleStatus: CycleStatusResult = useMemo(() => {
    return calculateCycleStatus(settings, new Date(), Math.round(cyclePrediction.estimatedCycleLength));
  }, [settings, cyclePrediction.estimatedCycleLength]);

  const predictions: PredictedCycle[] = useMemo(() => {
    return predictFutureCycles(settings, 2, logs);
  }, [settings, logs]);

  const biorhythm: BiorhythmResult | null = useMemo(() => {
    return calculateBiorhythm(settings.birthDate);
  }, [settings.birthDate]);

  // Quick 1-click role selection for first-time visitors (if gender not already set)
  const [roleConfirmed, setRoleConfirmed] = useState<boolean>(() => {
    return !!localStorage.getItem(`impo_partner_role_${userProfile.uid}`) || !!userProfile.gender;
  });

  const handleSelectQuickRole = async (selectedGender: "female" | "male") => {
    localStorage.setItem(`impo_partner_role_${userProfile.uid}`, selectedGender);
    setRoleConfirmed(true);
    if (onUpdateGender) {
      onUpdateGender(selectedGender);
    }
    try {
      await fetchFromPhpApi("updateProfile", {
        uid: userProfile.uid,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL || "",
        gender: selectedGender
      });
    } catch (e) {
      console.warn("Role gender sync notice:", e);
    }
    if (selectedGender === "female" && !settings.trackerOwnerUid) {
      const targetId = userProfile.coupleId || userProfile.uid;
      const updatedSettings: ImpoPeriodSettings = {
        ...settings,
        trackerOwnerUid: userProfile.uid
      };
      setSettings(updatedSettings);
      setFormClaimOwner(true);
      localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(updatedSettings));
      try {
        await fetchFromPhpApi("savePeriodSettings", {
          coupleId: userProfile.coupleId || "",
          uid: userProfile.uid,
          settings: updatedSettings
        });
      } catch (e) {}
      showNotice("نقش شما به عنوان صاحب ترکر سلامت ثبت شد");
    } else if (selectedGender === "male") {
      setFormClaimOwner(false);
      showNotice("حالت همراهی عاطفی و مراقبت از پارتنر فعال شد");
    }
  };

  const handleOpenLogModal = (dateStr: string) => {
    if (!effectiveIsOwner && !sharing.allowPartnerLogging) {
      showNotice("امکان ثبت لاگ توسط صاحب ترکر غیرفعال شده است");
      return;
    }
    setSelectedLogDate(dateStr);
    const existing = logs.find((l) => l.date === dateStr);
    if (existing) {
      setLogFormFlow(existing.flow || "none");
      setLogFormIsPeriodStart(existing.isPeriodStart || false);
      setLogFormMoods(existing.moods || []);
      setLogFormSymptoms(existing.symptoms || []);
      setLogFormDischarge(existing.discharge || "none");
      setLogFormSex(existing.sex || "none");
      setLogFormOvulationKit(existing.ovulationTestResult || "none");
      setLogFormPregnancyTest(existing.pregnancyTestResult || "none");
      setLogFormSharePregnancyTest(existing.sharePregnancyTestWithPartner || false);
      setLogFormWater(existing.waterGlasses || 4);
      setLogFormNotes(existing.notes || "");
    } else {
      setLogFormFlow("none");
      setLogFormIsPeriodStart(false);
      setLogFormMoods([]);
      setLogFormSymptoms([]);
      setLogFormDischarge("none");
      setLogFormSex("none");
      setLogFormOvulationKit("none");
      setLogFormPregnancyTest("none");
      setLogFormSharePregnancyTest(false);
      setLogFormWater(4);
      setLogFormNotes("");
    }
    setShowLogModal(true);
  };

  useEffect(() => {
    if (openLogTrigger && openLogTrigger > 0) {
      if (!effectiveIsOwner && !sharing.allowPartnerLogging) {
        setShowCareModal(true);
      } else {
        handleOpenLogModal(toGregorianIsoString(new Date()));
      }
    }
  }, [openLogTrigger]);

  const handleQuickGotPeriodToday = async () => {
    if (!effectiveIsOwner && !sharing.allowPartnerLogging) {
      showNotice("امکان ثبت لاگ توسط صاحب ترکر غیرفعال شده است");
      return;
    }
    const todayStr = toGregorianIsoString(new Date());
    const targetId = userProfile.coupleId || userProfile.uid;

    confetti({
      particleCount: 45,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
    });

    const updatedSettings: ImpoPeriodSettings = {
      ...settings,
      lastPeriodStartDate: todayStr
    };

    setSettings(updatedSettings);
    localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(updatedSettings));
    localStorage.setItem(`impo_period_settings_${userProfile.uid}`, JSON.stringify(updatedSettings));
    localStorage.setItem(`impo_period_configured_${targetId}`, "true");

    const todayLog: ImpoDailyLog = {
      id: `log_${Date.now()}`,
      date: todayStr,
      isPeriodDay: true,
      isPeriodStart: true,
      flow: "medium",
      moods: ["tired"],
      symptoms: ["cramps"],
      loggedByUid: userProfile.uid,
      loggedByName: userProfile.displayName,
      createdAt: new Date().toISOString()
    };

    const filtered = logs.filter((l) => l.date !== todayStr);
    const updatedLogs = [todayLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    setLogs(updatedLogs);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updatedLogs));

    try {
      await fetchFromPhpApi("savePeriodSettings", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        settings: updatedSettings
      });
      await fetchFromPhpApi("savePeriodLog", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        log: todayLog
      });
    } catch (e) {
      console.warn("Host period log save note:", e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.trackerOwnerUid && !effectiveIsOwner) {
      showNotice("تنها صاحب ترکر مجاز به تغییر تنظیمات است");
      return;
    }
    const targetId = userProfile.coupleId || userProfile.uid;

    if (formCycleLength < 21 || formCycleLength > 35) {
      setWarningMessage(
        `طول چرخه وارد شده (${toPersianDigits(formCycleLength)} روز) در بازه طبیعی ۲۱ الی ۳۵ روز قرار ندارد. پریود شما ممکن است نامنظم باشد و زمان تخمک‌گذاری ممکن است با خطای احتمالی همراه شود.`
      );
      setShowWarningModal(true);
    }

    const updatedSettings: ImpoPeriodSettings = {
      ...settings,
      trackerOwnerUid: settings.trackerOwnerUid || (formClaimOwner ? userProfile.uid : null),
      cycleLength: formCycleLength,
      periodLength: formPeriodLength,
      lastPeriodStartDate: formLastPeriodDate,
      goalMode: formGoalMode,
      birthDate: formBirthDate
    };

    setSettings(updatedSettings);
    setHasConfigured(true);
    setShowSettingsModal(false);
    localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(updatedSettings));
    localStorage.setItem(`impo_period_settings_${userProfile.uid}`, JSON.stringify(updatedSettings));
    localStorage.setItem(`impo_period_configured_${targetId}`, "true");

    isSavingSettingsRef.current = true;
    try {
      await fetchFromPhpApi("savePeriodSettings", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        settings: updatedSettings
      });
    } catch (e) {
      console.warn("Host period settings save error:", e);
    } finally {
      isSavingSettingsRef.current = false;
    }
  };

  const handleSaveSharingSettings = async (newSharing: PeriodSharingSettings) => {
    setSharing(newSharing);
    const targetId = userProfile.coupleId || userProfile.uid;
    localStorage.setItem(`impo_period_sharing_${targetId}`, JSON.stringify(newSharing));
    try {
      await fetchFromPhpApi("savePeriodSharing", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        sharing: newSharing
      });
    } catch (err) {
      console.warn("Save sharing settings error:", err);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetchFromPhpApi("exportMyPeriodData", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid
      });
      if (res && res.status === "success" && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `toghrool_period_data_${toGregorianIsoString(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotice("فایل پشتیبان با موفقیت دانلود شد");
      } else {
        showNotice(res?.message || "خطا در دریافت فایل خروجی.");
      }
    } catch (err) {
      console.error("Export error:", err);
      showNotice("خطا در برقراری ارتباط با سرور جهت دریافت نسخه پشتیبان.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);
    try {
      const res = await fetchFromPhpApi("deleteMyPeriodData", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid
      });
      if (res && res.status === "success") {
        const targetId = userProfile.coupleId || userProfile.uid;
        localStorage.removeItem(`impo_period_settings_${targetId}`);
        localStorage.removeItem(`impo_period_settings_${userProfile.uid}`);
        localStorage.removeItem(`impo_period_logs_${targetId}`);
        localStorage.removeItem(`impo_period_sharing_${targetId}`);
        localStorage.removeItem(`impo_period_configured_${targetId}`);
        setLogs([]);
        setSettings({
          cycleLength: 28,
          periodLength: 5,
          lastPeriodStartDate: toGregorianIsoString(new Date()),
          goalMode: "track",
          birthDate: "2000-01-01",
          viewMode: "circular"
        });
        setHasConfigured(false);
        setShowDeleteAllConfirmModal(false);
        setShowSharingModal(false);
        setShowSettingsModal(false);
        showNotice("تمام اطلاعات ترکر با موفقیت از سرور حذف شد");
      } else {
        showNotice(res?.message || "خطا در حذف اطلاعات.");
      }
    } catch (err) {
      console.error("Delete all error:", err);
      showNotice("خطا در حذف اطلاعات از سرور.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = userProfile.coupleId || userProfile.uid;

    const newLog: ImpoDailyLog = {
      id: `log_${Date.now()}`,
      date: selectedLogDate,
      isPeriodDay: logFormFlow !== "none" || logFormIsPeriodStart,
      isPeriodStart: logFormIsPeriodStart,
      flow: effectiveIsOwner ? logFormFlow : "none",
      moods: effectiveIsOwner ? logFormMoods : [],
      symptoms: effectiveIsOwner ? logFormSymptoms : [],
      discharge: effectiveIsOwner ? logFormDischarge : "none",
      sex: effectiveIsOwner ? logFormSex : "none",
      ovulationTestResult: effectiveIsOwner ? logFormOvulationKit : "none",
      pregnancyTestResult: effectiveIsOwner ? logFormPregnancyTest : "none",
      sharePregnancyTestWithPartner: effectiveIsOwner ? logFormSharePregnancyTest : false,
      waterGlasses: effectiveIsOwner ? logFormWater : 4,
      notes: effectiveIsOwner ? logFormNotes : "",
      loggedByUid: userProfile.uid,
      loggedByName: userProfile.displayName,
      createdAt: new Date().toISOString()
    };

    let updatedSettings = settings;
    if (logFormIsPeriodStart && effectiveIsOwner) {
      updatedSettings = {
        ...settings,
        lastPeriodStartDate: selectedLogDate
      };
      setSettings(updatedSettings);
      localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(updatedSettings));
      localStorage.setItem(`impo_period_settings_${userProfile.uid}`, JSON.stringify(updatedSettings));
    }

    const filtered = logs.filter((l) => l.date !== selectedLogDate);
    const updatedLogs = [newLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    setLogs(updatedLogs);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updatedLogs));

    setShowLogModal(false);

    try {
      if (logFormIsPeriodStart && effectiveIsOwner) {
        await fetchFromPhpApi("savePeriodSettings", {
          coupleId: userProfile.coupleId || "",
          uid: userProfile.uid,
          settings: updatedSettings
        });
      }
      await fetchFromPhpApi("savePeriodLog", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        log: newLog
      });
    } catch (err) {
      console.warn("Host log save notice:", err);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!effectiveIsOwner) {
      showNotice("تنها صاحب ترکر مجاز به حذف لاگ است");
      return;
    }
    const targetId = userProfile.coupleId || userProfile.uid;
    const targetLog = logs.find((l) => l.id === logId);
    const updated = logs.filter((l) => l.id !== logId);
    setLogs(updated);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updated));

    try {
      await fetchFromPhpApi("deletePeriodLog", {
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        id: logId,
        date: targetLog?.date || ""
      });
    } catch (e) {
      console.warn("Host log delete notice:", e);
    }
  };

  const safeCycleLength = cycleStatus.cycleLength;
  const safePeriodLength = cycleStatus.periodLength;
  const safeOvulationDay = cycleStatus.ovulationDay;
  const safeFertileStart = cycleStatus.fertileStartDay;
  const safeFertileEnd = cycleStatus.fertileEndDay;
  const safePmsStart = cycleStatus.pmsStartDay;

  const handlePartnerPoke = (msg: string) => {
    if (onSendPoke) {
      onSendPoke(msg, "impo_period_support");
    }
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
    });
  };

  // Ring geometry (Soft Pastel Minimalist Capsule Ring on Menstrual Cycle Clock)
  const ringCx = 160;
  const ringCy = 160;
  const ringR = 118;
  const ringStrokeWidth = 30;

  // Real biological menstrual cycle timeline geometry
  const cycleGeometry = useMemo(() => {
    const degPerDay = 360 / safeCycleLength;
    const gap = 5.5; // Degree inset for round caps to ensure separated pill capsules

    // 1. Period Phase (Days 1 to periodLength)
    const p1Start = 1;
    const p1End = Math.max(1, Math.min(safePeriodLength, safeCycleLength));
    const p1RawStart = (p1Start - 1) * degPerDay;
    const p1RawEnd = p1End * degPerDay;
    const p1ArcStart = p1RawStart + gap;
    const p1ArcEnd = Math.max(p1ArcStart + 1, p1RawEnd - gap);
    const p1MidAngle = (p1RawStart + p1RawEnd) / 2;
    const p1IconPos = polarToCartesian(ringCx, ringCy, ringR, p1MidAngle);

    // 2. Follicular Phase (Days periodLength + 1 to fertileStart - 1)
    const p2Start = p1End + 1;
    const p2End = Math.max(p2Start - 1, safeFertileStart - 1);
    const hasFollicular = p2End >= p2Start;
    const p2RawStart = (p2Start - 1) * degPerDay;
    const p2RawEnd = p2End * degPerDay;
    const p2ArcStart = p2RawStart + gap;
    const p2ArcEnd = Math.max(p2ArcStart + 1, p2RawEnd - gap);
    const p2MidAngle = (p2RawStart + p2RawEnd) / 2;
    const p2IconPos = polarToCartesian(ringCx, ringCy, ringR, p2MidAngle);

    // 3. Fertile Window & Ovulation (Days fertileStart to fertileEnd)
    const p3Start = Math.min(safeFertileStart, safeCycleLength);
    const p3End = Math.min(safeFertileEnd, safeCycleLength);
    const hasFertile = p3End >= p3Start;
    const p3RawStart = (p3Start - 1) * degPerDay;
    const p3RawEnd = p3End * degPerDay;
    const p3ArcStart = p3RawStart + gap;
    const p3ArcEnd = Math.max(p3ArcStart + 1, p3RawEnd - gap);
    const p3MidAngle = (p3RawStart + p3RawEnd) / 2;
    const p3IconPos = polarToCartesian(ringCx, ringCy, ringR, p3MidAngle);

    // Exact Ovulation Day Node
    const safeOvu = Math.max(1, Math.min(safeOvulationDay, safeCycleLength));
    const ovuAngle = ((safeOvu - 0.5) / safeCycleLength) * 360;
    const ovuPos = polarToCartesian(ringCx, ringCy, ringR, ovuAngle);

    // 4. Normal Days (روزهای عادی: Days fertileEnd + 1 to pmsStart - 1)
    const p4Start = p3End + 1;
    const p4End = Math.max(p4Start - 1, safePmsStart - 1);
    const hasNormal = p4End >= p4Start;
    const p4RawStart = (p4Start - 1) * degPerDay;
    const p4RawEnd = p4End * degPerDay;
    const p4ArcStart = p4RawStart + gap;
    const p4ArcEnd = Math.max(p4ArcStart + 1, p4RawEnd - gap);
    const p4MidAngle = (p4RawStart + p4RawEnd) / 2;
    const p4IconPos = polarToCartesian(ringCx, ringCy, ringR, p4MidAngle);

    // 5. PMS Phase (دوره PMS: Days pmsStart to cycleLength)
    const p5Start = Math.min(safePmsStart, safeCycleLength);
    const p5End = safeCycleLength;
    const hasPms = p5End >= p5Start;
    const p5RawStart = (p5Start - 1) * degPerDay;
    const p5ArcStart = p5RawStart + gap;
    const p5ArcEnd = Math.max(p5ArcStart + 1, 360 - gap);
    const p5MidAngle = (p5RawStart + 360) / 2;
    const p5IconPos = polarToCartesian(ringCx, ringCy, ringR, p5MidAngle);

    // Today pointer & cursor position on the ring track
    const currentDayClamped = Math.max(1, Math.min(cycleStatus.currentCycleDay, safeCycleLength));
    const todayAngle = ((currentDayClamped - 0.5) / safeCycleLength) * 360;
    const todayPos = polarToCartesian(ringCx, ringCy, ringR, todayAngle);

    return {
      period: {
        startDay: p1Start,
        endDay: p1End,
        path: describeArc(ringCx, ringCy, ringR, p1ArcStart, p1ArcEnd),
        iconPos: p1IconPos
      },
      follicular: hasFollicular ? {
        startDay: p2Start,
        endDay: p2End,
        path: describeArc(ringCx, ringCy, ringR, p2ArcStart, p2ArcEnd),
        iconPos: p2IconPos
      } : null,
      fertile: hasFertile ? {
        startDay: p3Start,
        endDay: p3End,
        path: describeArc(ringCx, ringCy, ringR, p3ArcStart, p3ArcEnd),
        iconPos: p3IconPos,
        ovuPos,
        ovuDay: safeOvu
      } : null,
      normal: hasNormal ? {
        startDay: p4Start,
        endDay: p4End,
        path: describeArc(ringCx, ringCy, ringR, p4ArcStart, p4ArcEnd),
        iconPos: p4IconPos
      } : null,
      pms: hasPms ? {
        startDay: p5Start,
        endDay: p5End,
        path: describeArc(ringCx, ringCy, ringR, p5ArcStart, p5ArcEnd),
        iconPos: p5IconPos
      } : null,
      today: {
        day: cycleStatus.currentCycleDay,
        pos: todayPos,
        angle: todayAngle
      }
    };
  }, [safeCycleLength, safePeriodLength, safeFertileStart, safeFertileEnd, safeOvulationDay, safePmsStart, cycleStatus.currentCycleDay]);

  // Active Phase Meta for Badges and Typography
  const currentPhaseMeta = useMemo(() => {
    switch (cycleStatus.phase) {
      case "period":
      case "due":
        return {
          title: "فاز قاعدگی (پریود)",
          subtitle: "روزهای استراحت، آرامش و مراقبت ویژه",
          color: "#EBA2F8",
          bgClass: "bg-[#EBA2F8]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Droplet
        };
      case "follicular":
        return {
          title: "فاز فولیکولار",
          subtitle: "روزهای پرانرژی، نشاط و خلاقیت",
          color: "#FFFF66",
          bgClass: "bg-[#FFFF66]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Sparkles
        };
      case "ovulation":
        return {
          title: "روز تخمک‌گذاری",
          subtitle: "اوج باروری و بیشترین شانس لقاح",
          color: "#5ED46A",
          bgClass: "bg-[#5ED46A]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Flower2
        };
      case "fertile":
        return {
          title: "پنجره باروری",
          subtitle: "آمادگی بدن و شانس بالای بارداری",
          color: "#5ED46A",
          bgClass: "bg-[#5ED46A]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Flower2
        };
      case "delayed":
        return {
          title: "تاخیر در قاعدگی",
          subtitle: `${toPersianDigits(cycleStatus.delayedDays)} روز از موعد گذشته`,
          color: "#F29B47",
          bgClass: "bg-[#F29B47]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: AlertCircle
        };
      case "pms":
        return {
          title: "پیش از قاعدگی (PMS)",
          subtitle: "نیاز به همراهی، همدلی و نوشیدنی‌های گرم",
          color: "#6BCFEA",
          bgClass: "bg-[#6BCFEA]",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Moon
        };
      case "luteal":
      default:
        return {
          title: "روزهای عادی چرخه",
          subtitle: "روزهای آرام، باثبات و تعادل هورمونی",
          color: "#FFFFFF",
          bgClass: "bg-white",
          borderClass: "border-[#1C1C1C]",
          pillText: "text-[#1C1C1C]",
          icon: Coffee
        };
    }
  }, [cycleStatus.phase, cycleStatus.delayedDays]);

  // Normalize biorhythm -100..100 into 0..10 editorial score
  const bioMetrics = useMemo(() => {
    const physPct = biorhythm ? Math.round((biorhythm.physical + 100) / 2) : 78;
    const emoPct = biorhythm ? Math.round((biorhythm.emotional + 100) / 2) : 84;
    const intPct = biorhythm ? Math.round((biorhythm.intellectual + 100) / 2) : 72;
    const cyclePct = cycleStatus.progressPercent;

    return [
      {
        id: "cycle",
        label: "پیشرفت چرخه فعلی",
        pct: cyclePct,
        score: (cyclePct / 10).toFixed(1),
        color: "#EBA2F8",
        bgClass: "bg-[#EBA2F8]",
        Icon: HeartPulse
      },
      {
        id: "physical",
        label: "ریتم انرژی جسمانی",
        pct: physPct,
        score: (physPct / 10).toFixed(1),
        color: "#FFFF66",
        bgClass: "bg-[#FFFF66]",
        Icon: Dna
      },
      {
        id: "emotional",
        label: "تعادل عاطفی و روحی",
        pct: emoPct,
        score: (emoPct / 10).toFixed(1),
        color: "#A7B86C",
        bgClass: "bg-[#A7B86C]",
        Icon: Heart
      },
      {
        id: "intellectual",
        label: "تمرکز و شادابی ذهنی",
        pct: intPct,
        score: (intPct / 10).toFixed(1),
        color: "#A9ABEE",
        bgClass: "bg-[#A9ABEE]",
        Icon: Brain
      }
    ];
  }, [biorhythm, cycleStatus.progressPercent]);

  const formatDayRange = (start: number, end: number) => {
    if (start >= end) return `روز ${toPersianDigits(start)}`;
    return `روز ${toPersianDigits(start)} تا ${toPersianDigits(end)}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {trackerToast && (
        <div className="fixed bottom-24 sm:bottom-6 right-6 bg-[#1C1C1C] text-[#F6F4F0] px-5 py-3 rounded-full flex items-center gap-2.5 z-50">
          <CheckCircle2 className="w-4 h-4 text-[#A7B86C] shrink-0 stroke-[2]" />
          <span className="text-xs font-medium">{trackerToast}</span>
        </div>
      )}

      {/* 1-Click First-Visit Role Selector Card */}
      {!roleConfirmed && !settings.trackerOwnerUid && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFFFF] border border-[#E8E2D4] rounded-[28px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="text-right space-y-1">
            <h3 className="text-sm font-black text-[#1C1C1C] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1C1C1C] stroke-[1.7]" />
              نحوه استفاده شما از تقویم سلامت طغرل چیست؟
            </h3>
            <p className="text-xs text-[#6E6B66] font-medium leading-relaxed">
              با انتخاب نقش خود، ظاهر و ابزارهای این بخش متناسب با شما تنظیم می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSelectQuickRole("female")}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-[#F6F4F0] rounded-full text-xs font-medium cursor-pointer transition-colors"
            >
              چرخه خودم را ثبت می‌کنم
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuickRole("male")}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#E9E7E1] hover:bg-[#E9E7E1] text-[#1C1C1C] rounded-full text-xs font-medium cursor-pointer transition-colors"
            >
              همراه پارتنرم هستم
            </button>
          </div>
        </motion.div>
      )}

      {/* Partner View Preview Banner for Owner */}
      {isPreviewingAsPartner && (
        <div className="bg-[#FFFF66] text-[#1C1C1C] px-5 py-3.5 rounded-[24px] flex items-center justify-between gap-3 text-xs font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 stroke-[1.8] shrink-0" />
            <span>پیش‌نمایش دیدگاه پارتنر فعال است — فیلدهای خصوصی پنهان شده‌اند</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewingAsPartner(false)}
            className="bg-[#1C1C1C] text-[#F6F4F0] px-4 py-1.5 rounded-full hover:bg-[#1C1C1C] transition-colors cursor-pointer font-medium shrink-0"
          >
            خروج از پیش‌نمایش
          </button>
        </div>
      )}

      {/* 1. Single Clean Sub-Tab Rail (Lex style) */}
      <div className="-mx-4 px-4 flex items-center justify-start gap-2 overflow-x-auto no-scrollbar pb-1 mb-2" dir="rtl">
        <button
          type="button"
          onClick={() => setActiveSubTab("dashboard")}
          className={`h-10 px-4 rounded-full text-[14px] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            activeSubTab === "dashboard"
              ? "bg-[#1C1C1C] text-white font-bold"
              : "bg-transparent border-[1.5px] border-[#1C1C1C]/35 text-[#1C1C1C]"
          }`}
        >
          <Activity className="w-4 h-4 stroke-[1.8]" />
          <span>چرخه سلامت</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("predictions")}
          className={`h-10 px-4 rounded-full text-[14px] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            activeSubTab === "predictions"
              ? "bg-[#1C1C1C] text-white font-bold"
              : "bg-transparent border-[1.5px] border-[#1C1C1C]/35 text-[#1C1C1C]"
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[1.8]" />
          <span>پیش‌بینی دوره‌ها</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("history")}
          className={`h-10 px-4 rounded-full text-[14px] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap ${
            activeSubTab === "history"
              ? "bg-[#1C1C1C] text-white font-bold"
              : "bg-transparent border-[1.5px] border-[#1C1C1C]/35 text-[#1C1C1C]"
          }`}
        >
          <BarChart3 className="w-4 h-4 stroke-[1.8]" />
          <span>تاریخچه ({toPersianDigits(logs.length)})</span>
        </button>
      </div>

      {/* Compact Quick Setup Prompt if female user hasn't configured cycle yet */}
      {!hasConfigured && partnerRole !== "male" && (
        <div className="bg-[#FFEAF3] border border-[#1C1C1C]/20 rounded-[18px] px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#1C1C1C] truncate">شخصی‌سازی چرخه سلامت</p>
            <p className="text-[11px] text-[#6E6B66] font-medium truncate">تنظیم تاریخ آخرین پریود در ۳۰ ثانیه</p>
          </div>
          <button
            type="button"
            onClick={() => setShowQuickSetupModal(true)}
            className="px-3.5 py-1.5 bg-[#1C1C1C] text-white rounded-full text-xs font-bold shrink-0 cursor-pointer hover:bg-[#1C1C1C]/90"
          >
            تنظیم
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 1: MAIN CYCLE DASHBOARD (LEX CLEAN CARD)                  */}
      {/* ================================================================= */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-4">
          {/* HERO VISUAL: Clean white Lex card */}
          <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-5 sm:p-6 flex flex-col items-center">
            {/* Stage Card Header (Screen 2 Reference: Status Title on Right, 2 Circular Action Buttons on Left) */}
            <div className="w-full flex items-center justify-between pb-3 sm:pb-4 border-b-[1.5px] border-[#1C1C1C]/15 mb-3" dir="rtl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#1C1C1C] flex items-center justify-center">
                  <Activity className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-[#1C1C1C]/75 block leading-tight">وضعیت چرخه سلامت</span>
                  <h3 className="text-sm sm:text-base font-black text-[#1C1C1C] leading-tight">
                    {partnerRole === "male"
                      ? `چرخه پارتنر (${toPersianDigits(safeCycleLength)} روز)`
                      : `چرخه من (${toPersianDigits(safeCycleLength)} روز)`}
                  </h3>
                </div>
              </div>

              {/* Two Circular Neobrutalist Action Buttons (Exact Screen 2 Reference) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode((v) => (v === "circular" ? "calendar" : "circular"))}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center transition-all cursor-pointer text-[#1C1C1C] active:translate-y-0.5"
                  title={viewMode === "circular" ? "نمای تقویم ماهانه" : "نمای حلقه چرخشی"}
                >
                  {viewMode === "circular" ? (
                    <CalendarIcon className="w-4 h-4 stroke-[1.9]" />
                  ) : (
                    <CircleDot className="w-4 h-4 stroke-[1.9]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white hover:bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center transition-all cursor-pointer text-[#1C1C1C] active:translate-y-0.5"
                  title="تنظیمات چرخه"
                >
                  <Settings className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>
            </div>

            {viewMode === "circular" ? (
              <div className="flex flex-col items-center w-full">
                <div className="relative w-[272px] h-[272px] sm:w-[320px] sm:h-[320px] flex items-center justify-center select-none">
                  <svg className="w-full h-full" viewBox="0 0 320 320">
                    {/* Outer Neobrutalist Black Border Frame */}
                    <circle
                      cx={ringCx}
                      cy={ringCy}
                      r={ringR + ringStrokeWidth / 2 + 1}
                      fill="none"
                      stroke="#1C1C1C"
                      strokeWidth="2.5"
                    />

                    {/* Background Track Circle */}
                    <circle
                      cx={ringCx}
                      cy={ringCy}
                      r={ringR}
                      fill="none"
                      stroke="#E9E7E1"
                      strokeWidth={ringStrokeWidth}
                    />

                    {/* Inner Neobrutalist Black Border & Clean White Center Dial */}
                    <circle
                      cx={ringCx}
                      cy={ringCy}
                      r={ringR - ringStrokeWidth / 2 - 1}
                      fill="#FFFFFF"
                      stroke="#1C1C1C"
                      strokeWidth="2.5"
                    />

                    {/* 1. Bubblegum Pink Capsule: Period Phase (Days 1 to periodLength) */}
                    {cycleGeometry.period && (
                      <g>
                        <path
                          d={cycleGeometry.period.path}
                          fill="none"
                          stroke="#EBA2F8"
                          strokeWidth={ringStrokeWidth - 4}
                          strokeLinecap="round"
                        />
                        {/* Droplet Icon */}
                        <g transform={`translate(${cycleGeometry.period.iconPos.x - 7.5}, ${cycleGeometry.period.iconPos.y - 7.5})`}>
                          <path
                            d="M7.5 2C7.5 2 3 6.8 3 9.6a4.5 4.5 0 009 0C12 6.8 7.5 2 7.5 2z"
                            fill="#1C1C1C"
                            stroke="#1C1C1C"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </g>
                      </g>
                    )}

                    {/* 2. Lemon Yellow Capsule: Follicular Phase */}
                    {cycleGeometry.follicular && (
                      <g>
                        <path
                          d={cycleGeometry.follicular.path}
                          fill="none"
                          stroke="#FFFF66"
                          strokeWidth={ringStrokeWidth - 4}
                          strokeLinecap="round"
                        />
                        {/* Sparkles / Energy Icon */}
                        <g transform={`translate(${cycleGeometry.follicular.iconPos.x - 7.5}, ${cycleGeometry.follicular.iconPos.y - 7.5})`}>
                          <path
                            d="M7.5 2l1.4 3.4 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4L7.5 2z"
                            fill="#1C1C1C"
                            stroke="#1C1C1C"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                          />
                        </g>
                      </g>
                    )}

                    {/* 3. Lime Green Capsule: Fertile Window & Ovulation */}
                    {cycleGeometry.fertile && (
                      <g>
                        <path
                          d={cycleGeometry.fertile.path}
                          fill="none"
                          stroke="#5ED46A"
                          strokeWidth={ringStrokeWidth - 4}
                          strokeLinecap="round"
                        />
                        {/* Blossom / Flower Icon */}
                        <g transform={`translate(${cycleGeometry.fertile.iconPos.x - 7.5}, ${cycleGeometry.fertile.iconPos.y - 7.5})`}>
                          <circle cx="7.5" cy="7.5" r="2.2" fill="#1C1C1C" stroke="#1C1C1C" strokeWidth="1.2" />
                          <path
                            d="M7.5 2.2a2.3 2.3 0 010 4.6M7.5 8.2a2.3 2.3 0 010 4.6M2.2 7.5a2.3 2.3 0 014.6 0M8.2 7.5a2.3 2.3 0 014.6 0"
                            fill="none"
                            stroke="#1C1C1C"
                            strokeWidth="1.3"
                          />
                        </g>

                        {/* Ovulation Day Node */}
                        <g transform={`translate(${cycleGeometry.fertile.ovuPos.x}, ${cycleGeometry.fertile.ovuPos.y})`}>
                          <circle cx="0" cy="0" r="8" fill="#1C1C1C" />
                          <circle cx="0" cy="0" r="3.5" fill="#5ED46A" />
                        </g>
                      </g>
                    )}

                    {/* 4. Crisp White Capsule: Normal Days */}
                    {cycleGeometry.normal && (
                      <g>
                        <path
                          d={cycleGeometry.normal.path}
                          fill="none"
                          stroke="#FFFFFF"
                          strokeWidth={ringStrokeWidth - 4}
                          strokeLinecap="round"
                        />
                        {/* Coffee / Balanced Normal Days Icon */}
                        <g transform={`translate(${cycleGeometry.normal.iconPos.x - 7.5}, ${cycleGeometry.normal.iconPos.y - 7.5})`}>
                          <path
                            d="M10 2v2M6 2v2M2 6h9a2 2 0 012 2v2a3 3 0 01-3 3H4a3 3 0 01-3-3V8a2 2 0 012-2z"
                            fill="none"
                            stroke="#1C1C1C"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M13 7h1a2 2 0 010 4h-1"
                            fill="none"
                            stroke="#1C1C1C"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </g>
                      </g>
                    )}

                    {/* 5. Sky Blue Capsule: PMS Phase */}
                    {cycleGeometry.pms && (
                      <g>
                        <path
                          d={cycleGeometry.pms.path}
                          fill="none"
                          stroke="#6BCFEA"
                          strokeWidth={ringStrokeWidth - 4}
                          strokeLinecap="round"
                        />
                        {/* Moon / Calm & PMS Care Icon */}
                        <g transform={`translate(${cycleGeometry.pms.iconPos.x - 7.5}, ${cycleGeometry.pms.iconPos.y - 7.5})`}>
                          <path
                            d="M11.5 8.5a4.5 4.5 0 11-5.5-5.5 5.2 5.2 0 005.5 5.5z"
                            fill="#1C1C1C"
                            stroke="#1C1C1C"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      </g>
                    )}

                    {/* TODAY (امروز) CURSOR & POINTER */}
                    <g>
                      {/* Outer dashed beacon ring */}
                      <circle
                        cx={cycleGeometry.today.pos.x}
                        cy={cycleGeometry.today.pos.y}
                        r="18"
                        fill="none"
                        stroke="#1C1C1C"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                        opacity="0.7"
                      />
                      {/* Bold Coral / Black Neo Target */}
                      <circle
                        cx={cycleGeometry.today.pos.x}
                        cy={cycleGeometry.today.pos.y}
                        r="13"
                        fill="#F29B47"
                        stroke="#1C1C1C"
                        strokeWidth="2.5"
                      />
                      {/* White Center Core */}
                      <circle
                        cx={cycleGeometry.today.pos.x}
                        cy={cycleGeometry.today.pos.y}
                        r="4.5"
                        fill="#FFFFFF"
                        stroke="#1C1C1C"
                        strokeWidth="1.5"
                      />
                    </g>
                  </svg>

                  {/* Center Editorial Hero Typography */}
                  <div className="absolute flex flex-col items-center justify-center text-center px-5 pt-1 z-10 select-none max-w-[200px]">
                    {/* Active Phase Pill Badge */}
                    <div
                      className="mb-1 px-3 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 border-[1.5px] border-[#1C1C1C] whitespace-nowrap"
                      style={{ backgroundColor: currentPhaseMeta.color, color: "#1C1C1C" }}
                    >
                      <currentPhaseMeta.icon className="w-3 h-3 stroke-[1.9] shrink-0" />
                      <span>{currentPhaseMeta.title}</span>
                    </div>

                    {cycleStatus.diffDays >= 90 ? (
                      <>
                        <span className="text-lg font-bold text-[#1C1C1C]">مشورت با پزشک</span>
                        <span className="text-[11px] text-[#1C1C1C]/80 font-medium mt-1">بیش از ۹۰ روز توقف چرخه</span>
                      </>
                    ) : cycleStatus.diffDays >= 45 ? (
                      <>
                        <span className="text-[46px] sm:text-[52px] font-bold leading-none text-[#1C1C1C]">
                          {toPersianDigits(cycleStatus.diffDays)}
                        </span>
                        <span className="text-[11px] text-[#1C1C1C]/80 font-medium mt-1.5">روز از شروع دوره قبلی</span>
                      </>
                    ) : cycleStatus.isDelayed ? (
                      <>
                        <span className="text-[50px] sm:text-[64px] font-bold leading-none text-[#FF6B6B]">
                          {toPersianDigits(cycleStatus.delayedDays)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSettingsModal(true)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1C] cursor-pointer"
                        >
                          <span>{partnerRole === "male" ? "روز تاخیر پارتنر" : "روز تاخیر قاعدگی"}</span>
                          <Info className="w-3.5 h-3.5 stroke-[2]" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-[56px] sm:text-[68px] font-bold leading-none tracking-tight text-[#1C1C1C] my-0.5">
                          {toPersianDigits(cycleStatus.currentCycleDay)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowSettingsModal(true)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#1C1C1C] cursor-pointer"
                          title="مشاهده و ویرایش تنظیمات چرخه"
                        >
                          <span>
                            {partnerRole === "male"
                              ? `روز چرخه پارتنر از ${toPersianDigits(safeCycleLength)}`
                              : `روز چرخه از ${toPersianDigits(safeCycleLength)} روز`}
                          </span>
                          <Info className="w-3.5 h-3.5 stroke-[2]" />
                        </button>
                      </>
                    )}

                    {(effectiveIsOwner || sharing.sharePhase) && (
                      <span className="mt-2 px-3 py-1 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold">
                        {cycleStatus.phase === "due"
                          ? "موعد مورد انتظار امروز"
                          : cycleStatus.daysUntilNextPeriod > 0
                          ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز تا موعد بعدی`
                          : cycleStatus.phaseTitle}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5-PHASE VISUAL TIMELINE LEGEND (Neobrutalist Chips with formatDayRange) */}
                <div className="w-full max-w-xl mt-4 flex sm:grid sm:grid-cols-5 gap-2 overflow-x-auto no-scrollbar pb-1 px-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLegendPhase((prev) => (prev === "period" ? null : "period"))
                    }
                    className={`min-w-[104px] sm:min-w-0 shrink-0 p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                      cycleStatus.phase === "period" || cycleStatus.phase === "due"
                        ? "bg-[#EBA2F8] ring-2 ring-[#1C1C1C]"
                        : "bg-white hover:bg-[#F6F4F0]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1C1C1C] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EBA2F8] border border-[#1C1C1C] shrink-0" />
                      <span>پریود</span>
                    </div>
                    <div className="text-[10px] text-[#1C1C1C]/75 mt-0.5 font-medium whitespace-nowrap">
                      {formatDayRange(1, safePeriodLength)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLegendPhase((prev) => (prev === "follicular" ? null : "follicular"))
                    }
                    className={`min-w-[104px] sm:min-w-0 shrink-0 p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                      cycleStatus.phase === "follicular"
                        ? "bg-[#FFFF66] ring-2 ring-[#1C1C1C]"
                        : "bg-white hover:bg-[#F6F4F0]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1C1C1C] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFFF66] border border-[#1C1C1C] shrink-0" />
                      <span>فولیکولار</span>
                    </div>
                    <div className="text-[10px] text-[#1C1C1C]/75 mt-0.5 font-medium whitespace-nowrap">
                      {formatDayRange(safePeriodLength + 1, safeFertileStart - 1)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLegendPhase((prev) => (prev === "fertile" ? null : "fertile"))
                    }
                    className={`min-w-[104px] sm:min-w-0 shrink-0 p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                      cycleStatus.phase === "fertile" || cycleStatus.phase === "ovulation"
                        ? "bg-[#5ED46A] ring-2 ring-[#1C1C1C]"
                        : "bg-white hover:bg-[#F6F4F0]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1C1C1C] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#5ED46A] border border-[#1C1C1C] shrink-0" />
                      <span>باروری</span>
                    </div>
                    <div className="text-[10px] text-[#1C1C1C]/75 mt-0.5 font-medium whitespace-nowrap">
                      {formatDayRange(safeFertileStart, safeFertileEnd)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLegendPhase((prev) => (prev === "normal" ? null : "normal"))
                    }
                    className={`min-w-[104px] sm:min-w-0 shrink-0 p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                      cycleStatus.phase === "luteal"
                        ? "bg-white ring-2 ring-[#1C1C1C]"
                        : "bg-white hover:bg-[#F6F4F0]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1C1C1C] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-white border border-[#1C1C1C] shrink-0" />
                      <span>روزهای عادی</span>
                    </div>
                    <div className="text-[10px] text-[#1C1C1C]/75 mt-0.5 font-medium whitespace-nowrap">
                      {formatDayRange(safeFertileEnd + 1, safePmsStart - 1)}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLegendPhase((prev) => (prev === "pms" ? null : "pms"))
                    }
                    className={`min-w-[104px] sm:min-w-0 shrink-0 p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                      cycleStatus.phase === "pms"
                        ? "bg-[#6BCFEA] ring-2 ring-[#1C1C1C]"
                        : "bg-white hover:bg-[#F6F4F0]"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#1C1C1C] whitespace-nowrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6BCFEA] border border-[#1C1C1C] shrink-0" />
                      <span>دوره PMS</span>
                    </div>
                    <div className="text-[10px] text-[#1C1C1C]/75 mt-0.5 font-medium whitespace-nowrap">
                      {formatDayRange(safePmsStart, safeCycleLength)}
                    </div>
                  </button>
                </div>

                {/* Optional Expandable Phase Tip Note on Click */}
                {selectedLegendPhase && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[340px] sm:max-w-xl mt-2 p-3.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs text-[#1C1C1C] font-medium space-y-1"
                  >
                    {selectedLegendPhase === "period" && (
                      <div className="leading-relaxed">
                        <strong className="text-[#1C1C1C] font-bold">🌸 فاز قاعدگی (پریود):</strong> روزهای پاکسازی و بازسازی دیواره رحم. نیاز به استراحت کافی، گرم نگه داشتن بدن، نوشیدن آب و دمنوش‌های تسکین‌بخش.
                      </div>
                    )}
                    {selectedLegendPhase === "follicular" && (
                      <div className="leading-relaxed">
                        <strong className="text-[#1C1C1C] font-bold">⚡ فاز فولیکولار:</strong> افزایش طبیعی استروژن، بالا رفتن انرژی جسمی و انگیزه. بهترین زمان برای پروژه‌های جدید، ورزش و فعالیت‌های پرنشاط.
                      </div>
                    )}
                    {selectedLegendPhase === "fertile" && (
                      <div className="leading-relaxed">
                        <strong className="text-[#1C1C1C] font-bold">🌿 پنجره باروری و تخمک‌گذاری:</strong> روزهای اوج شانس بارداری با ترشحات شفاف رحمی. نقطه مشکی روی حلقه نشان‌دهنده روز دقیق تخمک‌گذاری است (روز {toPersianDigits(safeOvulationDay)}).
                      </div>
                    )}
                    {selectedLegendPhase === "normal" && (
                      <div className="leading-relaxed">
                        <strong className="text-[#1C1C1C] font-bold">☕ روزهای عادی چرخه:</strong> روزهای آرام، پایدار و تعادل هورمونی پس از تخمک‌گذاری و قبل از شروع PMS. سطح هورمون‌ها در تعادل است و بدن بدون علائم خاصی فعالیت‌های معمول خود را دنبال می‌کند.
                      </div>
                    )}
                    {selectedLegendPhase === "pms" && (
                      <div className="leading-relaxed">
                        <strong className="text-[#1C1C1C] font-bold">🌙 دوره PMS (سندرم پیش از قاعدگی):</strong> روزهای افت هورمونی پیش از آغاز قاعدگی بعدی. ممکن است با خستگی، حساسیت عاطفی یا نوسانات خلقی همراه باشد؛ نیاز به درک متقابل، آرامش و همراهی عاطفی بیشتر.
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              /* ----------------- SQUIRCLE MONTHLY CALENDAR VIEW ----------------- */
              <div className="w-full max-w-xl bg-white rounded-[28px] p-5 sm:p-6 border-[1.5px] border-[#1C1C1C] space-y-5" dir="rtl">
                {/* Top Navigation Header: < Month Year > */}
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
                    className="w-10 h-10 rounded-full bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center transition-all cursor-pointer text-[#1C1C1C]"
                    title="ماه قبل"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[1.9]" />
                  </button>

                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">
                      {JALALI_MONTHS[calendarMonth - 1]} {toPersianDigits(calendarYear)}
                    </h3>
                    {(calendarYear !== todayJy || calendarMonth !== todayJm) && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        type="button"
                        onClick={() => {
                          setCalendarYear(todayJy);
                          setCalendarMonth(todayJm);
                        }}
                        className="px-3 py-1 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                        title="بازگشت به تاریخ امروز"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 stroke-[1.9]" />
                        <span>برو به امروز</span>
                      </motion.button>
                    )}
                  </div>

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
                    className="w-10 h-10 rounded-full bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center transition-all cursor-pointer text-[#1C1C1C]"
                    title="ماه بعد"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[1.9]" />
                  </button>
                </div>

                {/* Weekday Names Header */}
                <div className="grid grid-cols-7 gap-2 sm:gap-2.5 text-center text-xs font-bold text-[#1C1C1C]/70">
                  {JALALI_WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                {/* Calendar Days Grid (Neobrutalist Tiles) */}
                {(() => {
                  const daysInMonth = getDaysInJalaliMonth(calendarYear, calendarMonth);
                  const [firstGy, firstGm, firstGd] = jalaliToGregorian(calendarYear, calendarMonth, 1);
                  const firstDateGregorian = new Date(firstGy, firstGm - 1, firstGd);
                  const jsDay = firstDateGregorian.getDay();
                  const firstDayOfWeekOffset = (jsDay + 1) % 7;

                  const daysArray = [];
                  for (let i = 0; i < firstDayOfWeekOffset; i++) {
                    daysArray.push(null);
                  }
                  for (let d = 1; d <= daysInMonth; d++) {
                    daysArray.push(d);
                  }

                  return (
                    <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
                      {daysArray.map((day, idx) => {
                        if (day === null) {
                          return <div key={`empty_${idx}`} className="aspect-square" />;
                        }

                        const [gy, gm, gd] = jalaliToGregorian(calendarYear, calendarMonth, day);
                        const cellDate = new Date(gy, gm - 1, gd);
                        const cellIso = toGregorianIsoString(cellDate);
                        const isToday = cellIso === toGregorianIsoString(new Date());

                        const diffFromStart = daysBetween(settings.lastPeriodStartDate, cellDate);
                        let cellCycleDay = 0;
                        if (diffFromStart >= 0) {
                          cellCycleDay = (diffFromStart % safeCycleLength) + 1;
                        }

                        const isPeriodDay = cellCycleDay >= 1 && cellCycleDay <= safePeriodLength;
                        const isOvulationDay = cellCycleDay === safeOvulationDay;
                        const isFertileDay = cellCycleDay >= safeFertileStart && cellCycleDay <= safeFertileEnd;
                        const isPmsDay = cellCycleDay >= safePmsStart && cellCycleDay <= safeCycleLength;

                        const hasLog = logs.some((l) => l.date === cellIso);

                        let tileColorClass = "bg-white text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]/25 hover:border-[#1C1C1C]";
                        if (isPeriodDay) {
                          tileColorClass = "bg-[#EBA2F8] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                        } else if (isOvulationDay) {
                          tileColorClass = "bg-[#5ED46A] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                        } else if (isFertileDay) {
                          tileColorClass = "bg-[#FFFF66] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                        } else if (isPmsDay) {
                          tileColorClass = "bg-[#6BCFEA] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                        }

                        return (
                          <motion.button
                            type="button"
                            key={day}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleOpenLogModal(cellIso)}
                            className={`aspect-square rounded-[15px] sm:rounded-[18px] flex flex-col items-center justify-center transition-all cursor-pointer relative select-none ${tileColorClass} ${
                              isToday ? "ring-2 ring-[#1C1C1C] border-[1.5px] border-[#1C1C1C]" : ""
                            }`}
                          >
                            <span className="text-sm font-bold leading-none">
                              {toPersianDigits(day)}
                            </span>
                            {isToday && (
                              <span className="text-[9px] sm:text-[10px] font-bold leading-none mt-1">
                                امروز
                              </span>
                            )}
                            {hasLog && (
                              <span
                                className="w-2 h-2 rounded-full absolute top-1.5 left-1.5 bg-[#F29B47] border border-[#1C1C1C]"
                                title="گزارش ثبت‌شده"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Bottom 5-Dot Horizontal Legend */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs font-bold text-[#1C1C1C]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#EBA2F8] border border-[#1C1C1C] inline-block" />
                    <span>دوره پریود</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FFFF66] border border-[#1C1C1C] inline-block" />
                    <span>دوره باروری</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#5ED46A] border border-[#1C1C1C] inline-block" />
                    <span>روز تخمک گذاری</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-white border border-[#1C1C1C] inline-block" />
                    <span>روزهای عادی</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#6BCFEA] border border-[#1C1C1C] inline-block" />
                    <span>دوره PMS</span>
                  </span>
                </div>
              </div>
            )}

            {/* NEOBRUTALIST 1-PRIMARY / 1-SECONDARY HIERARCHY ACTION BAR */}
            <div className="mt-4 w-full max-w-md mx-auto space-y-2">
              {partnerRole === "male" ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCareModal(true)}
                      className="py-3 px-4 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 transition-all"
                    >
                      <Heart className="w-3.5 h-3.5 text-[#EBA2F8] fill-current" />
                      <span>ارسال محبت ویژه</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("عزیزم همیشه کنارت هستم و به فکرتم 💕")}
                      className="py-3 px-4 bg-[#EBA2F8] hover:bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[1.9]" />
                      <span>تلنگر سریع عشق</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSharingModal(true)}
                      className="px-3.5 py-1 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileText className="w-3 h-3 stroke-[2]" />
                      <span>تنظیمات حریم خصوصی</span>
                    </button>
                    {sharing.allowPartnerLogging && (
                      <button
                        type="button"
                        onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                        className="px-3.5 py-1 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        <HeartPulse className="w-3 h-3 stroke-[2]" />
                        <span>ثبت برای پارتنر</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleQuickGotPeriodToday}
                      className="py-3 px-4 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 transition-all"
                    >
                      <Droplet className="w-3.5 h-3.5 text-[#EBA2F8] fill-current" />
                      <span>امروز پریود شدم</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                      className="py-3 px-4 bg-[#EBA2F8] hover:bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-full text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:translate-y-0.5 transition-all"
                    >
                      <HeartPulse className="w-3.5 h-3.5 stroke-[1.9]" />
                      <span>ثبت حال و علائم</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowSharingModal(true)}
                      className="px-3.5 py-1 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileText className="w-3 h-3 stroke-[2]" />
                      <span>حریم خصوصی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomCareMessage("");
                        setShowCareModal(true);
                      }}
                      className="px-3.5 py-1 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Send className="w-3 h-3 stroke-[2]" />
                      <span>پیام به پارتنر</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* TWO NEOBRUTALIST BENTO CARDS (Exact Screen 2 Reference: Apricot & Pink Side-by-Side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bento Card 1: Apricot (#F6F4F0) - Daily Guidance */}
            <div className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-white border-[1.5px] border-[#1C1C1C] flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C] stroke-[1.9]" />
                    </span>
                    <span>راهنمای امروز طغرل</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <NeoZigZagTrend color="#1C1C1C" className="w-6 h-3 opacity-70" />
                    <ArrowUpRight className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                  </div>
                </div>

                <p className="text-xs font-medium text-[#1C1C1C] leading-relaxed line-clamp-3">
                  {cycleStatus.diffDays >= 90
                    ? "بیش از ۳ ماه از آخرین قاعدگی گذشته؛ در صورت رد بارداری با پزشک مشورت کنید."
                    : partnerRole === "male"
                    ? (sharing.sharePhase
                        ? `${userProfile.displayName} عزیز، پارتنر شما در ${cycleStatus.phaseTitle} است. ${cycleStatus.partnerTip}`
                        : "با آرامش و ابراز محبت بی‌قید و شرط در کنار پارتنرتان باشید.")
                    : `${userProfile.displayName} عزیز، امروز در روز ${toPersianDigits(cycleStatus.currentCycleDay)} چرخه هستی. ${cycleStatus.selfCareTip}`}
                </p>
              </div>

              <div className="pt-3 relative z-10">
                {partnerRole === "male" ? (
                  <button
                    type="button"
                    onClick={() => setShowCareModal(true)}
                    className="w-full py-2 px-3 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[11px] font-bold text-[#1C1C1C] flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <span>ارسال پیام همدلی</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                    className="w-full py-2 px-3 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[11px] font-bold text-[#1C1C1C] flex items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <span>ثبت احوالات روز</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bento Card 2: Bubblegum Pink (#EBA2F8) - Cycle Rhythm & Countdown */}
            <div className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-white border-[1.5px] border-[#1C1C1C] flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-[#1C1C1C] stroke-[1.9]" />
                    </span>
                    <span>ریتم و موعد چرخه</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <NeoZigZagTrend color="#1C1C1C" className="w-6 h-3 opacity-70" />
                    <ArrowUpRight className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-bold text-[#1C1C1C]">
                    {cycleStatus.phase === "due"
                      ? "موعد امروز"
                      : cycleStatus.isDelayed
                      ? `${toPersianDigits(cycleStatus.delayedDays)} روز تأخیر`
                      : `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز مانده`}
                  </div>
                  <p className="text-[11px] font-medium text-[#1C1C1C]/80 leading-relaxed">
                    {cycleStatus.isDelayed
                      ? "دوره قاعدگی از موعد پیش‌بینی شده فراتر رفته است."
                      : `طول متوسط چرخه: ${toPersianDigits(safeCycleLength)} روز`}
                  </p>
                </div>
              </div>

              <div className="pt-3 relative z-10">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("predictions")}
                  className="w-full py-2 px-3 rounded-full bg-white hover:bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] text-[11px] font-bold text-[#1C1C1C] flex items-center justify-center gap-1 cursor-pointer transition-all"
                >
                  <span>مشاهده پیش‌بینی آینده</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* NEOBRUTALIST BIOMETRICS & CYCLE DETAILS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">شاخص‌های سلامت و بیوریتم</h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="px-3.5 py-1.5 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer"
                >
                  تنظیمات
                </button>
              </div>

              <div className="space-y-4">
                {bioMetrics.map((m) => {
                  const MetricIcon = m.Icon;
                  return (
                    <div key={m.id} className="flex items-center gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-full ${m.bgClass} border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center shrink-0`}
                      >
                        <MetricIcon className="w-5 h-5 stroke-[1.9]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#1C1C1C] block mb-1.5">
                          {m.label}
                        </span>
                        <div className="w-full h-3.5 bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(12, m.pct)}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </div>

                      <div className="text-left shrink-0 min-w-[64px]">
                        <span className="text-base sm:text-lg font-bold text-[#1C1C1C]">
                          {toPersianDigits(m.score)}
                        </span>
                        <span className="text-[11px] text-[#1C1C1C]/70 mr-1 font-medium">از ۱۰</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right/End: Clinical Summary & Quick Partner Care */}
            <div className="lg:col-span-5 space-y-4">
              {partnerRole === "male" ? (
                <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#1C1C1C]">مراقبت سریع یک‌کلیکی</h4>
                    <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center">
                      <HeartHandshake className="w-4 h-4 stroke-[1.9]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#F6F4F0] p-3 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                      <span className="text-[11px] font-medium text-[#1C1C1C]/75 block mb-1">شانس باروری:</span>
                      <span className="font-bold text-[#1C1C1C]">
                        {sharing.shareFertileWindow ? cycleStatus.chanceOfPregnancy : "محرمانه"}
                      </span>
                    </div>
                    <div className="bg-[#FFFF66] p-3 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                      <span className="text-[11px] font-medium text-[#1C1C1C]/75 block mb-1">موعد بعدی:</span>
                      <span className="font-bold text-[#1C1C1C]">
                        {sharing.shareNextPeriod
                          ? cycleStatus.daysUntilNextPeriod > 0
                            ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز دیگر`
                            : "در موعد"
                          : "محرمانه"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("برات یک فنجان دمنوش گرم و نبات آماده کنم عزیزم؟ ☕")}
                      className="p-3 bg-[#FFFFFF] hover:bg-[#F6F4F0]/40 border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span>پیشنهاد دمنوش گرم</span>
                      <Coffee className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("کیسه آب گرم و جای استراحتت آماده‌ست قشنگم، بیا دراز بکش 🛋️")}
                      className="p-3 bg-[#FFFFFF] hover:bg-[#F6F4F0]/40 border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span>کیسه آب گرم و استراحت</span>
                      <Moon className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("شکلات و خوراکی‌های مورد علاقه‌ت رو برات خریدم نوش جونت 🍫")}
                      className="p-3 bg-[#FFFFFF] hover:bg-[#F6F4F0]/40 border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] flex items-center justify-between transition-all cursor-pointer"
                    >
                      <span>شکلات و تنقلات محبوب</span>
                      <Heart className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#1C1C1C]">راهنمای بیولوژیکی امروز</h4>
                    <span className="text-[11px] font-bold text-[#1C1C1C] bg-[#FFFF66] px-2.5 py-0.5 rounded-full border border-[#1C1C1C]">
                      {formatPersianDate(toGregorianIsoString(new Date()))}
                    </span>
                  </div>

                  <p className="text-xs text-[#1C1C1C]/85 leading-relaxed font-medium">
                    {cycleStatus.stageDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#F6F4F0] p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                      <span className="text-[11px] font-medium text-[#1C1C1C]/75 block mb-1">احتمال بارداری:</span>
                      <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                        <Baby className="w-3.5 h-3.5 stroke-[1.9]" />
                        {cycleStatus.chanceOfPregnancy}
                      </span>
                    </div>

                    <div className="bg-[#5ED46A] p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                      <span className="text-[11px] font-medium text-[#1C1C1C]/75 block mb-1">روز تخمک‌گذاری:</span>
                      <span className="text-xs font-bold text-[#1C1C1C]">
                        روز {toPersianDigits(safeOvulationDay)} چرخه
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#EBA2F8] p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] space-y-1">
                    <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 stroke-[1.9] text-[#1C1C1C]" />
                      تغذیه پیشنهادی امروز
                    </span>
                    <p className="text-[11px] text-[#1C1C1C] leading-relaxed font-medium">
                      {cycleStatus.nutritionTip}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomCareMessage("");
                      setShowCareModal(true);
                    }}
                    className="w-full py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5"
                  >
                    <MessageCircleHeart className="w-4 h-4 stroke-[1.9] text-[#EBA2F8]" />
                    <span>ارسال پیام و احساس به پارتنر</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 2: FUTURE CYCLE PREDICTIONS                               */}
      {/* ================================================================= */}
      {activeSubTab === "predictions" && (
        <div className="bg-white rounded-[28px] p-6 border-[1.5px] border-[#1C1C1C] space-y-6 text-right">
          {cyclePrediction.isPregnant ? (
            <div className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[24px] p-6 text-right space-y-2.5">
              <div className="flex items-center gap-2 text-[#1C1C1C] font-bold text-base">
                <span>🌸🤰</span>
                <span>تبریک! تست بارداری مثبت ثبت شده است</span>
              </div>
              <p className="text-xs text-[#1C1C1C] leading-relaxed font-medium">
                {cyclePrediction.pregnancyMessage ||
                  "پیش‌بینی دوره‌های قاعدگی بعدی متوقف شد. جهت مراقبت‌های بارداری با پزشک متخصص مشورت نمایید."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F6F4F0] p-4 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
                <div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    پیش‌بینی دوره‌های آتی قاعدگی و باروری
                  </h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/80 mt-1">
                    {cyclePrediction.confidence === "low"
                      ? "برآورد اولیه؛ پس از ثبت چند چرخه دیگر دقیق‌تر خواهد شد."
                      : cyclePrediction.confidence === "medium"
                      ? "برآورد با دقت متوسط بر اساس تاریخچه چرخه‌های قبلی."
                      : "برآورد با دقت بالا بر اساس نظم چرخه‌های ثبت‌شده شما."}
                  </p>
                </div>
                <span
                  className={`self-start sm:self-center text-xs font-bold px-4 py-1.5 rounded-full border-[1.5px] border-[#1C1C1C] ${
                    cyclePrediction.confidence === "high"
                      ? "bg-[#5ED46A] text-[#1C1C1C]"
                      : cyclePrediction.confidence === "medium"
                      ? "bg-[#6BCFEA] text-[#1C1C1C]"
                      : "bg-[#FFFF66] text-[#1C1C1C]"
                  }`}
                >
                  {cyclePrediction.confidence === "high"
                    ? "دقت بالا"
                    : cyclePrediction.confidence === "medium"
                    ? "دقت متوسط"
                    : "برآورد اولیه"}
                </span>
              </div>

              {cyclePrediction.hasOvulationPeakSignal && (
                <div className="bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] p-4 rounded-2xl text-xs font-bold">
                  کیت تخمک‌گذاری با نتیجه پیک ثبت شده است؛ بازه‌های تخمک‌گذاری و پریود بعدی دقیق‌سازی شدند.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((p) => (
                  <div
                    key={p.cycleIndex}
                    className="bg-[#FFFFFF] p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1C1C1C] bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] px-3.5 py-1 rounded-full">
                        {p.cycleIndex === 1 && p.isDelayed
                          ? "دوره جاری (دارای تاخیر)"
                          : `دوره ${toPersianDigits(p.cycleIndex)} آینده`}
                      </span>
                      <span className="text-xs font-bold text-[#1C1C1C]">
                        {p.isDelayed
                          ? `${toPersianDigits(p.delayedDays)} روز تاخیر`
                          : p.daysUntilStart === 0
                          ? "امروز"
                          : p.daysUntilStart > 0
                          ? `${toPersianDigits(p.daysUntilStart)} روز دیگر`
                          : "نزدیک"}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1C1C1C]/75 font-medium">بازه شروع پریود:</span>
                        <span className="font-bold text-[#1C1C1C] bg-white px-3 py-1 rounded-full border-[1.5px] border-[#1C1C1C]">
                          {p.startDateRangePersian || p.startDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#1C1C1C]/75 font-medium">بازه تخمک‌گذاری:</span>
                        <span className="font-bold text-[#1C1C1C] bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] px-3 py-1 rounded-full">
                          {p.ovulationDateRangePersian || p.ovulationDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#1C1C1C]/75 font-medium">پنجره باروری:</span>
                        <span className="font-bold text-[#1C1C1C] bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] px-3 py-1 rounded-full">
                          {p.fertileWindowStartPersian} الی {p.fertileWindowEndPersian}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-TAB 3: SYMPTOMS & LOGS HISTORY                                */}
      {/* ================================================================= */}
      {activeSubTab === "history" && (
        <div className="bg-white rounded-[28px] p-6 border-[1.5px] border-[#1C1C1C] space-y-6 text-right">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#1C1C1C]">تاریخچه علائم و گزارش‌ها</h3>
              <p className="text-xs font-medium text-[#1C1C1C]/70 mt-0.5">سوابق خونریزی و احوالات ثبت‌شده</p>
            </div>
            <button
              onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
              className="px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
            >
              ثبت گزارش جدید
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-14 text-[#1C1C1C]/70 font-bold text-xs bg-[#F6F4F0]/30 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
              هنوز هیچ وضعیتی ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#FFFFFF] p-4 rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-3 relative text-right"
                >
                  {effectiveIsOwner && (
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-white border-[1.5px] border-[#1C1C1C] hover:bg-[#F29B47] text-[#1C1C1C] flex items-center justify-center transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.9]" />
                    </button>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <span className="text-xs font-bold text-[#1C1C1C]">
                      {formatPersianDate(log.date)}
                    </span>
                    {log.isPeriodStart && (
                      <span className="text-[10px] font-bold bg-[#EBA2F8] border border-[#1C1C1C] text-[#1C1C1C] px-2.5 py-0.5 rounded-full">
                        روز اول پریود
                      </span>
                    )}
                    {(effectiveIsOwner || sharing.shareFlow) && log.flow && log.flow !== "none" && (
                      <span className="text-[10px] font-bold text-[#1C1C1C] bg-[#F6F4F0] border border-[#1C1C1C] px-2.5 py-0.5 rounded-full">
                        خونریزی: {FLOW_OPTIONS.find((f) => f.id === log.flow)?.label || log.flow}
                      </span>
                    )}
                  </div>

                  {(effectiveIsOwner || sharing.shareMood) && log.moods && log.moods.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {log.moods.map((m) => {
                        const opt = MOOD_OPTIONS.find((x) => x.id === m);
                        return (
                          <span
                            key={m}
                            className="text-[10px] font-bold bg-[#FFFF66] border border-[#1C1C1C] text-[#1C1C1C] px-2.5 py-1 rounded-full"
                          >
                            {opt?.icon} {opt?.label || m}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareSymptoms) && log.symptoms && log.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {log.symptoms.map((s) => {
                        const opt = SYMPTOM_OPTIONS.find((x) => x.id === s);
                        return (
                          <span
                            key={s}
                            className="text-[10px] font-bold bg-white border border-[#1C1C1C] text-[#1C1C1C] px-2.5 py-1 rounded-full"
                          >
                            {opt?.icon} {opt?.label || s}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareSex) && log.sex && log.sex !== "none" && (
                    <div>
                      <span className="text-[10px] font-bold text-[#1C1C1C] bg-[#6BCFEA] border border-[#1C1C1C] px-3 py-1 rounded-full inline-block">
                        رابطه: {SEX_OPTIONS.find((s) => s.id === log.sex)?.label || log.sex}
                      </span>
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareTests) &&
                    log.ovulationTestResult &&
                    log.ovulationTestResult !== "none" && (
                      <div>
                        <span className="text-[10px] font-bold text-[#1C1C1C] bg-[#5ED46A] border border-[#1C1C1C] px-3 py-1 rounded-full inline-block">
                          کیت تخمک‌گذاری:{" "}
                          {OVULATION_TEST_OPTIONS.find((o) => o.id === log.ovulationTestResult)?.label ||
                            log.ovulationTestResult}
                        </span>
                      </div>
                    )}

                  {(effectiveIsOwner || (sharing.shareTests && log.sharePregnancyTestWithPartner)) &&
                    log.pregnancyTestResult &&
                    log.pregnancyTestResult !== "none" && (
                      <div>
                        <span className="text-[10px] font-bold text-[#1C1C1C] bg-[#EBA2F8] border border-[#1C1C1C] px-3 py-1 rounded-full inline-block">
                          بی‌بی‌چک:{" "}
                          {PREGNANCY_TEST_OPTIONS.find((p) => p.id === log.pregnancyTestResult)?.label ||
                            log.pregnancyTestResult}
                        </span>
                      </div>
                    )}

                  {(effectiveIsOwner || sharing.shareNotes) && log.notes && (
                    <p className="text-xs font-medium text-[#1C1C1C] bg-white p-3 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                      {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: SETTINGS & ONBOARDING DIALOG                             */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] rounded-[28px] p-6 max-w-lg w-full border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] space-y-5 text-right overflow-y-auto max-h-[90vh] text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between border-b-[1.5px] border-[#1C1C1C]/15 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center">
                    <Settings className="w-5 h-5 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">
                    تنظیمات چرخه و محاسبات طغرل
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] cursor-pointer transition-all active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* Ownership Card */}
                <div className="p-4 bg-white rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 stroke-[1.9]" />
                      مالکیت ترکر سلامت
                    </span>
                    {isOwner ? (
                      <span className="text-[10px] font-bold bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] px-3 py-0.5 rounded-full">
                        شما صاحب ترکر هستید
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] px-3 py-0.5 rounded-full">
                        حالت همراه
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#1C1C1C]/75 leading-relaxed font-medium">
                    {isOwner
                      ? "این ترکر به عنوان ترکر سلامت شخصی شما تنظیم شده است و کلیه دسترسی‌های اشتراک با پارتنر تحت کنترل شماست."
                      : "این ترکر تحت مالکیت پارتنر شماست و شما به عنوان همراه داده‌های مجاز را مشاهده می‌کنید."}
                  </p>

                  {!settings.trackerOwnerUid && (
                    <div className="pt-2.5 border-t-[1.5px] border-[#1C1C1C]/15 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#1C1C1C] block">
                          این ترکر برای من است
                        </span>
                        <span className="text-[10px] text-[#1C1C1C]/70 font-medium">
                          مدیریت کامل دسترسی‌ها با من خواهد بود.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formClaimOwner}
                        onChange={(e) => setFormClaimOwner(e.target.checked)}
                        className="w-5 h-5 accent-[#1C1C1C] rounded cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>

                {/* Goal Mode */}
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-2">هدف شما از استفاده:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("track")}
                      className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] transition-all text-center cursor-pointer ${
                        formGoalMode === "track"
                          ? "bg-[#5ED46A] text-[#1C1C1C]"
                          : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      ردیابی سلامت
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("pregnancy")}
                      className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] transition-all text-center cursor-pointer ${
                        formGoalMode === "pregnancy"
                          ? "bg-[#5ED46A] text-[#1C1C1C]"
                          : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      اقدام به بارداری
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("prevention")}
                      className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] transition-all text-center cursor-pointer ${
                        formGoalMode === "prevention"
                          ? "bg-[#5ED46A] text-[#1C1C1C]"
                          : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      پیشگیری طبیعی
                    </button>
                  </div>
                </div>

                {/* Last Period Start Date */}
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                    تاریخ اولین روز آخرین پریود (شمسی):
                  </label>
                  <JalaliDatePicker
                    value={formLastPeriodDate}
                    onChange={(val) => setFormLastPeriodDate(val)}
                    placeholder="انتخاب اولین روز آخرین پریود..."
                  />
                  <span className="text-[11px] text-[#1C1C1C]/80 font-medium mt-1 block">
                    تاریخ انتخابی: {formatPersianDate(formLastPeriodDate)}
                  </span>
                </div>

                {/* Cycle and Period Lengths */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                      طول دوره (فاصله دو شروع):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      required
                      value={formCycleLength}
                      onChange={(e) => setFormCycleLength(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] outline-none transition-colors"
                    />
                    <span className="text-[10px] font-medium text-[#1C1C1C]/70 mt-1 block">نرمال: ۲۱ تا ۳۵ روز</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                      طول خونریزی پریود:
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      required
                      value={formPeriodLength}
                      onChange={(e) => setFormPeriodLength(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] outline-none transition-colors"
                    />
                    <span className="text-[10px] font-medium text-[#1C1C1C]/70 mt-1 block">معمولاً: ۳ تا ۷ روز</span>
                  </div>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                    تاریخ تولد (برای نمودار بیوریتم طغرل):
                  </label>
                  <JalaliDatePicker
                    value={formBirthDate}
                    onChange={(val) => setFormBirthDate(val || "2000-01-01")}
                    placeholder="انتخاب تاریخ تولد به شمسی..."
                  />
                </div>

                {/* Onboarding Health Profile Card */}
                {userProfile.onboardingHealthData && (
                  <div className="p-4 bg-white rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1C]">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                        اطلاعات سلامت و تناسب اندام
                      </span>
                      {userProfile.onboardingHealthData.bmi && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C]">
                          BMI: {toPersianDigits(userProfile.onboardingHealthData.bmi)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#1C1C1C]/80 pt-1 font-medium">
                      <div>قد: {toPersianDigits(userProfile.onboardingHealthData.heightCm)} سانتی‌متر</div>
                      <div>وزن: {toPersianDigits(userProfile.onboardingHealthData.weightKg)} کیلوگرم</div>
                      <div>
                        نظم پریود: {
                          userProfile.onboardingHealthData.cycleRegularity === 'regular' 
                            ? 'منظم' 
                            : userProfile.onboardingHealthData.cycleRegularity === 'irregular'
                            ? 'نامنظم'
                            : 'نامشخص'
                        }
                      </div>
                      <div>
                        پیشگیری: {
                          userProfile.onboardingHealthData.contraceptionMethod === 'condom' ? 'کاندوم' :
                          userProfile.onboardingHealthData.contraceptionMethod === 'pills' ? 'قرص' :
                          userProfile.onboardingHealthData.contraceptionMethod === 'natural' ? 'طبیعی' :
                          userProfile.onboardingHealthData.contraceptionMethod === 'iud' ? 'IUD' :
                          userProfile.onboardingHealthData.contraceptionMethod === 'emergency' ? 'اورژانسی' : 'سایر'
                        }
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    ذخیره تنظیمات چرخه
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-5 py-3.5 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL 2: COMPREHENSIVE DAILY LOG MODAL                            */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] rounded-[28px] p-6 max-w-lg w-full border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] space-y-5 text-right overflow-y-auto max-h-[90vh] text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between border-b-[1.5px] border-[#1C1C1C]/15 pb-3.5">
                <div>
                  <h3 className="text-base font-black text-[#1C1C1C]">ثبت علائم و احوالات روزانه</h3>
                  <p className="text-xs font-medium text-[#1C1C1C]/75 mt-0.5">
                    تاریخ: {formatPersianDate(selectedLogDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] cursor-pointer transition-all active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleSaveDailyLog} className="space-y-4">
                {!effectiveIsOwner && (
                  <div className="p-3.5 bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs text-[#1C1C1C] font-medium leading-relaxed">
                    شما در حال ثبت لاگ به عنوان همراه هستید. برای حفظ حریم خصوصی پارتنرتان، تنها امکان اعلام شروع پریود جدید فعال است.
                  </div>
                )}

                {/* Period Start Checkbox */}
                <div className="p-4 bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[24px] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1C1C1C] block">امروز شروع پریود جدید است؟</span>
                    <span className="text-[11px] text-[#1C1C1C]/80 font-medium">
                      چرخه جدید از این تاریخ آغاز می‌شود.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={logFormIsPeriodStart}
                    onChange={(e) => setLogFormIsPeriodStart(e.target.checked)}
                    className="w-5 h-5 accent-[#1C1C1C] rounded cursor-pointer"
                  />
                </div>

                {effectiveIsOwner && (
                  <>
                    {/* Bleeding Flow */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">شدت خونریزی:</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        {FLOW_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormFlow(opt.id)}
                            className={`p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                              logFormFlow === opt.id
                                ? "bg-[#5ED46A] text-[#1C1C1C]"
                                : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Moods */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">احوالات روحی امروز:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {MOOD_OPTIONS.map((opt) => {
                          const isSelected = logFormMoods.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setLogFormMoods(logFormMoods.filter((m) => m !== opt.id));
                                } else {
                                  setLogFormMoods([...logFormMoods, opt.id]);
                                }
                              }}
                              className={`px-3.5 py-2 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#5ED46A] text-[#1C1C1C]"
                                  : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                              }`}
                            >
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Symptoms */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">نشانه‌ها و دردهای فیزیکی:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SYMPTOM_OPTIONS.map((opt) => {
                          const isSelected = logFormSymptoms.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setLogFormSymptoms(logFormSymptoms.filter((s) => s !== opt.id));
                                } else {
                                  setLogFormSymptoms([...logFormSymptoms, opt.id]);
                                }
                              }}
                              className={`px-3.5 py-2 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#5ED46A] text-[#1C1C1C]"
                                  : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                              }`}
                            >
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cervical Discharge */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">وضعیت ترشحات:</label>
                      <select
                        value={logFormDischarge}
                        onChange={(e) => setLogFormDischarge(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-bold text-[#1C1C1C] outline-none"
                      >
                        {DISCHARGE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sex Intimacy */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">رابطه زناشویی امروز:</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                        {SEX_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormSex(opt.id)}
                            className={`p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                              logFormSex === opt.id
                                ? "bg-[#5ED46A] text-[#1C1C1C]"
                                : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ovulation Test Kit */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">کیت تخمک‌گذاری (LH):</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                        {OVULATION_TEST_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormOvulationKit(opt.id)}
                            className={`p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                              logFormOvulationKit === opt.id
                                ? "bg-[#5ED46A] text-[#1C1C1C]"
                                : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pregnancy Test */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-2">تست بارداری (بی‌بی‌چک):</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                        {PREGNANCY_TEST_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormPregnancyTest(opt.id)}
                            className={`p-2.5 rounded-2xl border-[1.5px] border-[#1C1C1C] text-center transition-all cursor-pointer ${
                              logFormPregnancyTest === opt.id
                                ? "bg-[#5ED46A] text-[#1C1C1C]"
                                : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {logFormPregnancyTest !== "none" && (
                        <div className="p-3.5 bg-white rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-center justify-between mt-2.5">
                          <div className="pl-2">
                            <span className="text-xs font-bold text-[#1C1C1C] block">
                              این نتیجه را برای پارتنرم نمایش بده
                            </span>
                            <span className="text-[10px] text-[#1C1C1C]/70 font-medium">
                              نتایج تست بارداری بدون تایید شما کاملاً محرمانه می‌مانند.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={logFormSharePregnancyTest}
                            onChange={(e) => setLogFormSharePregnancyTest(e.target.checked)}
                            className="w-5 h-5 accent-[#1C1C1C] rounded cursor-pointer shrink-0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">یادداشت شخصی:</label>
                      <textarea
                        rows={2}
                        value={logFormNotes}
                        onChange={(e) => setLogFormNotes(e.target.value)}
                        placeholder="هر احساس، تجربه یا نکته‌ای از این روز..."
                        className="w-full px-4 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] outline-none resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="pt-3 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    ذخیره علائم امروز
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-5 py-3.5 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* COMPANION CARE & PARTNER MESSAGE MODAL (FOR BOTH ROLES)           */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showCareModal && (
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-[#F6F4F0] rounded-[28px] w-full max-w-lg p-6 border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] text-right space-y-4 text-[#1C1C1C]"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center">
                    <MessageCircleHeart className="w-5 h-5 stroke-[1.9]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C1C1C]">
                      {partnerRole === "female" ? "ارسال پیام و احساس به پارتنر" : "ارسال محبت و مراقبت"}
                    </h3>
                    <p className="text-xs text-[#1C1C1C]/75 font-medium">
                      {partnerRole === "female"
                        ? "پیام شما فوراً همراه با اعلان برای پارتنرتان ارسال می‌شود"
                        : "پیام شما فوراً روی صفحه پارتنرتان نمایش داده می‌شود"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCareModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              {/* Ready-made message cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1C1C1C] block">
                  {partnerRole === "female"
                    ? "پیام‌های آماده وضعیت و احساسات:"
                    : "پیام‌های آماده دلگرم‌کننده:"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(partnerRole === "female"
                    ? [
                        "عزیزم، امروز حالم کمی حساس‌تره و به توجه بیشتری نیاز دارم 💕",
                        `امروز در ${cycleStatus.phaseTitle} هستم، لطفاً هوامو داشته باش 🌸`,
                        "می‌شه برام یک دمنوش گرم یا خوراکی خوشمزه بیاری عزیزم؟ ☕🍫",
                        "کمی دل‌درد و خستگی دارم؛ ممنون می‌شم کارهای خونه با تو باشه 🛋️",
                        "امروز پر از انرژی و خوشحالم! یک برنامه دونفره قشنگ بچینیم؟ ✨",
                        "فقط می‌خواستم بهت بگم چقدر دوستت دارم و بودنت بهم آرامش میده 🥰"
                      ]
                    : [
                        "عزیزم برات یک دمنوش گرم و نبات آماده کنم؟ ☕",
                        "کیسه آب گرم و جای استراحتت حاضره، بیا دراز بکش 🛋️",
                        "شکلات و خوراکی مورد علاقه‌ت رو برات خریدم نوش جونت 🍫",
                        "فقط می‌خواستم بگم چقدر دوستت دارم و کنارت هستم 🌸",
                        "امروز هر کاری داشتی بسپر به من، فقط استراحت کن 💖",
                        "یک لیوان آب خنک برات آوردم، مراقب سلامتیت باش 💧"
                      ]
                  ).map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomCareMessage(tmpl)}
                      className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] text-xs font-bold text-right transition-all cursor-pointer leading-relaxed ${
                        customCareMessage === tmpl
                          ? "bg-[#5ED46A] text-[#1C1C1C]"
                          : "bg-white text-[#1C1C1C] hover:bg-[#FFFFFF]"
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C1C1C] block">یا متن دلخواه خودت را بنویس:</label>
                <textarea
                  value={customCareMessage}
                  onChange={(e) => setCustomCareMessage(e.target.value)}
                  placeholder={
                    partnerRole === "female"
                      ? "هر چیزی که در دلت هست یا دوست داری پارتنرت بدونه رو بنویس..."
                      : "کلمات محبت‌آمیز خودت را بنویس..."
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs text-[#1C1C1C] text-right outline-none resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Modal footer actions */}
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCareModal(false)}
                  className="px-5 py-3 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const fallback =
                      partnerRole === "female"
                        ? "عزیزم، فقط می‌خواستم بهت یادآوری کنم که چقدر برام عزیزی 💕"
                        : "عزیزم، همیشه به فکرتم و کنارت هستم 💕";
                    const msg = customCareMessage.trim() || fallback;
                    handlePartnerPoke(msg);
                    setShowCareModal(false);
                    setCustomCareMessage("");
                  }}
                  className="flex-1 py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 stroke-[1.9]" />
                  <span>
                    {partnerRole === "female" ? "ارسال پیام به پارتنر" : "ارسال پیام محبت‌آمیز"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL 3: IRREGULAR CYCLE WARNING DIALOG                           */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] rounded-[28px] p-6 max-w-md w-full border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] space-y-4 text-right text-[#1C1C1C]"
            >
              <div className="w-14 h-14 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 stroke-[1.9]" />
              </div>

              <h4 className="text-base font-bold text-[#1C1C1C] text-center">توجه درباره چرخه نامنظم</h4>

              <p className="text-xs text-[#1C1C1C] bg-white p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C] leading-relaxed font-medium text-center">
                {warningMessage}
              </p>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
              >
                متوجه شدم
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL 4: PERIOD SHARING & PRIVACY CONTROLS                        */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showSharingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] rounded-[28px] p-6 max-w-lg w-full border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] space-y-4 text-right overflow-y-auto max-h-[90vh] text-[#1C1C1C]"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b-[1.5px] border-[#1C1C1C]/15 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 stroke-[1.9]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C1C1C]">اشتراک‌گذاری با پارتنر</h3>
                    <p className="text-xs text-[#1C1C1C]/75 font-medium">کنترل اختصاصی حریم خصوصی داده‌های سلامت</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] cursor-pointer transition-all active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <div className="p-3.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs text-[#1C1C1C] leading-relaxed font-medium">
                داده‌های سلامت شما کاملاً خصوصی هستند. با کلیدهای زیر تعیین کنید چه مواردی در حساب پارتنرتان نمایش داده شود.
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: "sharePhase",
                    label: "فاز فعلی چرخه قاعدگی",
                    desc: "نمایش فازهای پریود، باروری، PMS و فولیکولار به پارتنر"
                  },
                  {
                    key: "shareNextPeriod",
                    label: "موعد پریود بعدی و روزشمار",
                    desc: "نمایش تاریخ تقریبی و تعداد روزهای مانده به پریود بعدی"
                  },
                  {
                    key: "shareFertileWindow",
                    label: "پنجره باروری و شانس بارداری",
                    desc: "نمایش روزهای تخمک‌گذاری و میزان شانس بارداری امروز"
                  },
                  {
                    key: "shareFlow",
                    label: "شدت خونریزی روزانه",
                    desc: "نمایش لکه‌بینی، خونریزی کم، متوسط یا شدید در تاریخچه"
                  },
                  {
                    key: "shareMood",
                    label: "احوالات روحی و خلقیات",
                    desc: "نمایش احساسات ثبت‌شده در تاریخچه"
                  },
                  {
                    key: "shareSymptoms",
                    label: "علائم جسمی و دردهای فیزیکی",
                    desc: "نمایش دردهای پریود مثل دل‌درد، کمردرد، سردرد و نفخ"
                  },
                  {
                    key: "shareSex",
                    label: "ثبت رابطه زناشویی",
                    desc: "نمایش روزهای رابطه صمیمانه ثبت‌شده در تاریخچه"
                  },
                  {
                    key: "shareTests",
                    label: "کیت تخمک‌گذاری و تست بارداری",
                    desc: "نمایش نتایج تست‌ها به پارتنر"
                  },
                  {
                    key: "shareNotes",
                    label: "یادداشت‌های شخصی روزانه",
                    desc: "نمایش متن یادداشت‌های خصوصی در لاگ‌های روزانه"
                  },
                  {
                    key: "allowPartnerLogging",
                    label: "اجازه ثبت لاگ به پارتنر",
                    desc: "اجازه ثبت شروع پریود به نیابت از شما"
                  }
                ].map((item) => (
                  <div key={item.key} className="p-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1C1C]">{item.label}</h4>
                      <p className="text-[11px] text-[#1C1C1C]/70 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentVal = !!(sharing as any)[item.key];
                        const updated: PeriodSharingSettings = {
                          ...sharing,
                          [item.key]: !currentVal
                        };
                        handleSaveSharingSettings(updated);
                      }}
                      className={`w-12 h-7 flex items-center rounded-full border-[1.5px] border-[#1C1C1C] p-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${
                        (sharing as any)[item.key]
                          ? "bg-[#5ED46A] justify-start"
                          : "bg-[#E9E7E1] justify-end"
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-5 h-5 rounded-full bg-[#1C1C1C]"
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t-[1.5px] border-[#1C1C1C]/15 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewingAsPartner(true);
                    setShowSharingModal(false);
                  }}
                  className="w-full py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4 stroke-[1.9]" />
                  <span>پیش‌نمایش آنچه پارتنرم می‌بیند</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportData}
                    className="py-2.5 px-3 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] font-bold text-[11px] rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[1.9]" />
                    <span>{isExporting ? "در حال دریافت..." : "دانلود پشتیبان (JSON)"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingAll}
                    onClick={() => setShowDeleteAllConfirmModal(true)}
                    className="py-2.5 px-3 bg-[#F29B47] hover:brightness-95 text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] font-bold text-[11px] rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.9]" />
                    <span>{isDeletingAll ? "در حال حذف..." : "حذف کامل داده‌ها"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================================================================= */}
      {/* MODAL 5: DELETE ALL PERIOD DATA CONFIRMATION                      */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showDeleteAllConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/60 backdrop-blur-[2px]">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] rounded-[28px] p-6 max-w-sm w-full border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] space-y-4 text-center text-[#1C1C1C]"
              dir="rtl"
            >
              <div className="w-14 h-14 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[1.9]" />
              </div>
              <h4 className="text-base font-bold text-[#1C1C1C]">حذف کامل اطلاعات سلامت</h4>
              <p className="text-xs text-[#1C1C1C] bg-white p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C] leading-relaxed font-medium">
                آیا از حذف کامل تمام اطلاعات، لاگ‌های روزانه و تنظیمات چرخه خود اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirmModal(false)}
                  className="flex-1 py-3 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleDeleteAllData}
                  className="flex-1 py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all"
                >
                  {isDeletingAll ? "در حال حذف..." : "بله، کامل حذف شود"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- QUICK 30-SECOND CYCLE SETUP MODAL (PHASE 3) --- */}
      <QuickCycleSetupModal
        isOpen={showQuickSetupModal}
        onClose={() => setShowQuickSetupModal(false)}
        onSave={(lastPeriodStartDate, cycleLength, periodLength) => {
          const newSettings: ImpoPeriodSettings = {
            ...settings,
            lastPeriodStartDate,
            cycleLength,
            periodLength
          };
          setSettings(newSettings);
          localStorage.setItem(`impo_period_settings_${storageKey}`, JSON.stringify(newSettings));
          localStorage.setItem(`impo_period_settings_${userProfile.uid}`, JSON.stringify(newSettings));
          localStorage.setItem(`impo_period_configured_${storageKey}`, "true");
          localStorage.setItem(`impo_period_configured_${userProfile.uid}`, "true");
          setHasConfigured(true);
          setShowQuickSetupModal(false);
          setTrackerToast("چرخه سلامت شما با موفقیت فعال و پیش‌بینی‌ها محاسبه شد! 🩸💖");
          setTimeout(() => setTrackerToast(null), 3500);

          fetchFromPhpApi("savePeriodSettings", {
            coupleId: userProfile.coupleId,
            settings: {
              cycleLengthTypical: cycleLength,
              periodLength,
              lastPeriodStartDate
            }
          }, "POST").catch(() => {});
        }}
      />
    </div>
  );
}
