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
  Dna
} from "lucide-react";
import confetti from "canvas-confetti";
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

  const [, setHasConfigured] = useState<boolean>(() => {
    return !!(
      localStorage.getItem(`impo_period_configured_${storageKey}`) ||
      localStorage.getItem(`impo_period_configured_${userProfile.uid}`)
    );
  });

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

  // Quick 1-click role selection for first-time visitors
  const [roleConfirmed, setRoleConfirmed] = useState<boolean>(() => {
    return !!localStorage.getItem(`impo_partner_role_${userProfile.uid}`);
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
      colors: ["#F6C3E5", "#F6DC6B", "#A7B86C", "#B8CEF4"]
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
      colors: ["#F6C3E5", "#F6DC6B", "#A7B86C", "#B8CEF4"]
    });
  };

  // Ring geometry (exact Soft Pastel Minimalist Capsule Ring + Circular Nodes)
  const ringCx = 160;
  const ringCy = 160;
  const ringR = 116;

  const yellowIconPos = polarToCartesian(ringCx, ringCy, ringR, 15);
  const sageIconPos = polarToCartesian(ringCx, ringCy, ringR, 89);
  const pinkIconPos = polarToCartesian(ringCx, ringCy, ringR, 143);
  const blueIconPos = polarToCartesian(ringCx, ringCy, ringR, 247);
  const sageNodePos = polarToCartesian(ringCx, ringCy, ringR, 271);
  const yellowMiniIconPos = polarToCartesian(ringCx, ringCy, ringR, 294);
  const blueNodePos = polarToCartesian(ringCx, ringCy, ringR, 329);
  const pinkNodePos = polarToCartesian(ringCx, ringCy, ringR, 350);

  // Active phase angle highlight
  const activePhaseMarkerAngle = useMemo(() => {
    switch (cycleStatus.phase) {
      case "period":
      case "due":
      case "delayed":
        return 166;
      case "follicular":
        return 102;
      case "fertile":
        return 232;
      case "ovulation":
        return 271;
      case "pms":
      case "luteal":
      default:
        return 38;
    }
  }, [cycleStatus.phase]);
  const activeMarkerPos = polarToCartesian(ringCx, ringCy, ringR - 29, activePhaseMarkerAngle);

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
        color: "#F6C3E5",
        bgClass: "bg-[#F6C3E5]",
        Icon: HeartPulse
      },
      {
        id: "physical",
        label: "ریتم انرژی جسمانی",
        pct: physPct,
        score: (physPct / 10).toFixed(1),
        color: "#F6DC6B",
        bgClass: "bg-[#F6DC6B]",
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
        color: "#B8CEF4",
        bgClass: "bg-[#B8CEF4]",
        Icon: Brain
      }
    ];
  }, [biorhythm, cycleStatus.progressPercent]);

  return (
    <div className="space-y-6" dir="rtl">
      {trackerToast && (
        <div className="fixed bottom-24 sm:bottom-6 right-6 bg-[#1B1B1A] text-[#FAF6EC] px-5 py-3 rounded-full flex items-center gap-2.5 z-50">
          <CheckCircle2 className="w-4 h-4 text-[#A7B86C] shrink-0 stroke-[2]" />
          <span className="text-xs font-bold">{trackerToast}</span>
        </div>
      )}

      {/* 1-Click First-Visit Role Selector Card */}
      {!roleConfirmed && !settings.trackerOwnerUid && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="text-right space-y-1">
            <h3 className="text-sm font-bold text-[#1B1B1A] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1B1B1A] stroke-[1.7]" />
              نحوه استفاده شما از تقویم سلامت طغرل چیست؟
            </h3>
            <p className="text-xs text-[#78746B] font-medium leading-relaxed">
              با انتخاب نقش خود، ظاهر و ابزارهای این بخش متناسب با شما تنظیم می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleSelectQuickRole("female")}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
            >
              چرخه خودم را ثبت می‌کنم
            </button>
            <button
              type="button"
              onClick={() => handleSelectQuickRole("male")}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] rounded-full text-xs font-bold cursor-pointer transition-colors"
            >
              همراه پارتنرم هستم
            </button>
          </div>
        </motion.div>
      )}

      {/* Partner View Preview Banner for Owner */}
      {isPreviewingAsPartner && (
        <div className="bg-[#F6DC6B] text-[#1B1B1A] px-5 py-3.5 rounded-[24px] flex items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 stroke-[1.8] shrink-0" />
            <span>پیش‌نمایش دیدگاه پارتنر فعال است — فیلدهای خصوصی پنهان شده‌اند</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewingAsPartner(false)}
            className="bg-[#1B1B1A] text-[#FAF6EC] px-4 py-1.5 rounded-full hover:bg-[#2F2E2C] transition-colors cursor-pointer font-bold shrink-0"
          >
            خروج از پیش‌نمایش
          </button>
        </div>
      )}

      {/* Minimalist Top Bar: Sub-Tabs + View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Sub-Tabs Pill Bar */}
        <div className="flex items-center gap-1.5 bg-[#EFECE2] p-1.5 rounded-full overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab("dashboard")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === "dashboard"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "text-[#78746B] hover:text-[#1B1B1A]"
            }`}
          >
            <Activity className="w-3.5 h-3.5 stroke-[1.8]" />
            چرخه سلامت
          </button>

          <button
            onClick={() => setActiveSubTab("predictions")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === "predictions"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "text-[#78746B] hover:text-[#1B1B1A]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[1.8]" />
            پیش‌بینی دوره‌ها
          </button>

          <button
            onClick={() => setActiveSubTab("history")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === "history"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "text-[#78746B] hover:text-[#1B1B1A]"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 stroke-[1.8]" />
            تاریخچه ({toPersianDigits(logs.length)})
          </button>
        </div>

        {/* Circular vs Calendar Toggle (Only on Dashboard sub-tab) */}
        {activeSubTab === "dashboard" && (
          <div className="flex items-center bg-[#EFECE2] p-1.5 rounded-full text-xs font-bold">
            <button
              onClick={() => setViewMode("circular")}
              className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === "circular"
                  ? "bg-[#1B1B1A] text-[#FAF6EC]"
                  : "text-[#78746B] hover:text-[#1B1B1A]"
              }`}
            >
              چرخه دایره‌ای
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-4 py-1.5 rounded-full transition-colors cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-[#1B1B1A] text-[#FAF6EC]"
                  : "text-[#78746B] hover:text-[#1B1B1A]"
              }`}
            >
              نمای تقویمی
            </button>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* SUB-TAB 1: MAIN CYCLE DASHBOARD (EXACT EDITORIAL WELLNESS LAYOUT) */}
      {/* ================================================================= */}
      {activeSubTab === "dashboard" && (
        <div className="space-y-6">
          {/* HERO VISUAL: Segmented Pastel Capsule Ring OR Squircle Monthly Calendar */}
          <div className="flex flex-col items-center">
            {viewMode === "circular" ? (
              <div className="relative w-[310px] h-[310px] sm:w-[340px] sm:h-[340px] flex items-center justify-center select-none">
                <svg className="w-full h-full" viewBox="0 0 320 320">
                  {/* 1. Butter Yellow Capsule (PMS & Luteal Care: 14° -> 64°) */}
                  <path
                    d={describeArc(ringCx, ringCy, ringR, 14, 64)}
                    fill="none"
                    stroke="#F6DC6B"
                    strokeWidth="33"
                    strokeLinecap="round"
                  />
                  {/* Monoline Shield Icon inside Yellow Capsule */}
                  <g transform={`translate(${yellowIconPos.x - 9}, ${yellowIconPos.y - 9})`}>
                    <path
                      d="M9 1.8L3 4.3v4.4c0 4.1 2.6 7.8 6 9.1 3.4-1.3 6-5 6-9.1V4.3L9 1.8z"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.7 9.3l1.6 1.6 3.2-3.2"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* 2. Sage Olive Capsule (Follicular Energy: 86° -> 118°) */}
                  <path
                    d={describeArc(ringCx, ringCy, ringR, 86, 118)}
                    fill="none"
                    stroke="#A7B86C"
                    strokeWidth="33"
                    strokeLinecap="round"
                  />
                  {/* Monoline Organic Vitality Icon inside Sage Capsule */}
                  <g transform={`translate(${sageIconPos.x - 9}, ${sageIconPos.y - 9})`}>
                    <path
                      d="M9 3c3.5 0 6 2.5 6 6 0 4.2-6 7.5-6 7.5S3 13.2 3 9c0-3.5 2.5-6 6-6z"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 6.5v5"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* 3. Pastel Pink Capsule (Period Phase: 140° -> 192°) */}
                  <path
                    d={describeArc(ringCx, ringCy, ringR, 140, 192)}
                    fill="none"
                    stroke="#F6C3E5"
                    strokeWidth="33"
                    strokeLinecap="round"
                  />
                  {/* Monoline Heart + Coral Dot (Exact Reference Detail) */}
                  <g transform={`translate(${pinkIconPos.x - 9}, ${pinkIconPos.y - 9})`}>
                    <path
                      d="M9 15.6s-6.2-3.9-6.2-8c0-2.1 1.6-3.6 3.5-3.6 1.2 0 2.2.6 2.7 1.5.5-.9 1.5-1.5 2.7-1.5 1.9 0 3.5 1.5 3.5 3.6 0 4.1-6.2 8-6.2 8z"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="15.2" cy="3.8" r="1.8" fill="#D94E4E" />
                  </g>

                  {/* 4. Powder Blue Capsule (Fertile Window: 214° -> 250°) */}
                  <path
                    d={describeArc(ringCx, ringCy, ringR, 214, 250)}
                    fill="none"
                    stroke="#B8CEF4"
                    strokeWidth="33"
                    strokeLinecap="round"
                  />
                  {/* Monoline Brain/Calm Icon inside Blue Capsule */}
                  <g transform={`translate(${blueIconPos.x - 9}, ${blueIconPos.y - 9})`}>
                    <circle
                      cx="6.8"
                      cy="9"
                      r="3.6"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                    />
                    <circle
                      cx="11.2"
                      cy="9"
                      r="3.6"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                    />
                  </g>

                  {/* 5. Sage Circular Node (Ovulation Peak at 271°) */}
                  <circle cx={sageNodePos.x} cy={sageNodePos.y} r="16.5" fill="#A7B86C" />
                  <g transform={`translate(${sageNodePos.x - 8}, ${sageNodePos.y - 8})`}>
                    <path
                      d="M8 2.2l1.6 3.6L13.2 7l-3.6 1.6L8 12.2 6.4 8.6 2.8 7l3.6-1.2L8 2.2z"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* 6. Butter Yellow Mini-Capsule (Biorhythm / Endocrine at 292° -> 308°) */}
                  <path
                    d={describeArc(ringCx, ringCy, ringR, 292, 308)}
                    fill="none"
                    stroke="#F6DC6B"
                    strokeWidth="33"
                    strokeLinecap="round"
                  />
                  <g transform={`translate(${yellowMiniIconPos.x - 8}, ${yellowMiniIconPos.y - 8})`}>
                    <path
                      d="M5 2.5c0 3.5 6 3.5 6 7s-6 3.5-6 7M11 2.5c0 3.5-6 3.5-6 7s6 3.5 6 7"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* 7. Powder Blue Circular Node (329°) */}
                  <circle cx={blueNodePos.x} cy={blueNodePos.y} r="16.5" fill="#B8CEF4" />
                  <g transform={`translate(${blueNodePos.x - 8}, ${blueNodePos.y - 8})`}>
                    <path
                      d="M4.5 11.5l7-7M3.5 9.5a2 2 0 112 2M10.5 4.5a2 2 0 112 2"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* 8. Pastel Pink Circular Node (350°) */}
                  <circle cx={pinkNodePos.x} cy={pinkNodePos.y} r="16.5" fill="#F6C3E5" />
                  <g transform={`translate(${pinkNodePos.x - 8}, ${pinkNodePos.y - 8})`}>
                    <path
                      d="M8 2.8C8 2.8 3.5 7.5 3.5 10.3a4.5 4.5 0 009 0C12.5 7.5 8 2.8 8 2.8z"
                      fill="none"
                      stroke="#1B1B1A"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </g>

                  {/* Subtle Active Phase Indicator Dot inside the Ring */}
                  <circle
                    cx={activeMarkerPos.x}
                    cy={activeMarkerPos.y}
                    r="4"
                    fill="#1B1B1A"
                  />
                </svg>

                {/* Center Editorial Hero Typography (Exact Match to "8.8 / your health score (i)") */}
                <div className="absolute flex flex-col items-center justify-center text-center px-6 z-10">
                  {cycleStatus.diffDays >= 90 ? (
                    <>
                      <span className="text-xl font-bold text-[#1B1B1A]">مشورت با پزشک</span>
                      <span className="text-xs text-[#78746B] mt-1">بیش از ۹۰ روز توقف چرخه</span>
                    </>
                  ) : cycleStatus.diffDays >= 45 ? (
                    <>
                      <span className="text-[52px] font-bold leading-none text-[#1B1B1A]">
                        {toPersianDigits(cycleStatus.diffDays)}
                      </span>
                      <span className="text-xs text-[#78746B] mt-2">روز از شروع دوره قبلی</span>
                    </>
                  ) : cycleStatus.isDelayed ? (
                    <>
                      <span className="text-[60px] font-bold leading-none text-[#D94E4E]">
                        {toPersianDigits(cycleStatus.delayedDays)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#78746B] hover:text-[#1B1B1A] cursor-pointer"
                      >
                        <span>
                          {partnerRole === "male" ? "روز تاخیر پارتنر" : "روز تاخیر قاعدگی"}
                        </span>
                        <Info className="w-3.5 h-3.5 stroke-[1.6]" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-[64px] sm:text-[72px] font-bold leading-none tracking-tight text-[#1B1B1A]">
                        {toPersianDigits(cycleStatus.currentCycleDay)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSettingsModal(true)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#78746B] hover:text-[#1B1B1A] cursor-pointer"
                        title="مشاهده و ویرایش تنظیمات چرخه"
                      >
                        <span>
                          {partnerRole === "male"
                            ? `روز چرخه پارتنر از ${toPersianDigits(safeCycleLength)}`
                            : `روز چرخه از ${toPersianDigits(safeCycleLength)} روز`}
                        </span>
                        <Info className="w-3.5 h-3.5 stroke-[1.6]" />
                      </button>
                    </>
                  )}

                  {(effectiveIsOwner || sharing.sharePhase) && (
                    <span className="mt-2.5 px-3 py-1 rounded-full bg-[#EFECE2] text-[#1B1B1A] text-[11px] font-bold">
                      {cycleStatus.phase === "due"
                        ? "موعد مورد انتظار امروز"
                        : cycleStatus.daysUntilNextPeriod > 0
                        ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز تا موعد بعدی`
                        : cycleStatus.phaseTitle}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* ----------------- SQUIRCLE MONTHLY CALENDAR VIEW ----------------- */
              <div className="w-full max-w-xl bg-[#FFFDF8] rounded-[30px] p-5 sm:p-6 border border-[#E8E2D4] space-y-5" dir="rtl">
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
                    className="w-10 h-10 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center transition-colors cursor-pointer text-[#1B1B1A]"
                    title="ماه قبل"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[1.8]" />
                  </button>

                  <h3 className="text-base sm:text-lg font-bold text-[#1B1B1A]">
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
                    className="w-10 h-10 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center transition-colors cursor-pointer text-[#1B1B1A]"
                    title="ماه بعد"
                  >
                    <ChevronLeft className="w-4 h-4 stroke-[1.8]" />
                  </button>
                </div>

                {/* Weekday Names Header */}
                <div className="grid grid-cols-7 gap-2 sm:gap-2.5 text-center text-xs font-medium text-[#78746B]">
                  {JALALI_WEEKDAYS.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>

                {/* Calendar Days Grid (Squircle Tiles in Warm Pastel Palette) */}
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

                        let tileColorClass = "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]";
                        if (isPeriodDay) {
                          tileColorClass = "bg-[#F6C3E5] text-[#1B1B1A]";
                        } else if (isOvulationDay) {
                          tileColorClass = "bg-[#A7B86C] text-[#1B1B1A]";
                        } else if (isFertileDay) {
                          tileColorClass = "bg-[#DCE6B5] text-[#1B1B1A]";
                        } else if (isPmsDay) {
                          tileColorClass = "bg-[#B8CEF4] text-[#1B1B1A]";
                        }

                        return (
                          <motion.button
                            type="button"
                            key={day}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleOpenLogModal(cellIso)}
                            className={`aspect-square rounded-[15px] sm:rounded-[18px] flex flex-col items-center justify-center transition-colors cursor-pointer relative select-none ${tileColorClass} ${
                              isToday ? "border-[1.8px] border-dashed border-[#1B1B1A]" : ""
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
                                className="w-1.5 h-1.5 rounded-full absolute top-1.5 left-1.5 bg-[#1B1B1A]"
                                title="گزارش ثبت‌شده"
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Bottom 4-Dot Horizontal Legend */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-4 text-[11px] sm:text-xs font-bold text-[#1B1B1A]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#F6C3E5] inline-block" />
                    <span>دوره پریود</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#B8CEF4] inline-block" />
                    <span>دوره PMS</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#DCE6B5] inline-block" />
                    <span>دوره باروری</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#A7B86C] inline-block" />
                    <span>روز تخمک گذاری</span>
                  </span>
                </div>
              </div>
            )}

            {/* ACTION ROW DIRECTLY UNDER HERO (Exact Match: [ Black Pill CTA ] + Circular Sand Buttons) */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              {partnerRole === "male" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowCareModal(true)}
                    className="px-6 py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    ارسال محبت ویژه
                  </button>

                  {sharing.allowPartnerLogging && (
                    <button
                      type="button"
                      onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                      className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                      title="ثبت شروع پریود به درخواست پارتنر"
                    >
                      <HeartPulse className="w-4 h-4 stroke-[1.7]" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handlePartnerPoke("عزیزم همیشه کنارت هستم و به فکرتم 💕")}
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="ارسال تلنگر سریع محبت"
                  >
                    <Send className="w-4 h-4 stroke-[1.7]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="تنظیمات چرخه"
                  >
                    <Settings className="w-4 h-4 stroke-[1.7]" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleQuickGotPeriodToday}
                    className="px-6 py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    امروز پریود شدم
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="ثبت علائم و احوالات امروز"
                  >
                    <HeartPulse className="w-4 h-4 stroke-[1.7]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSharingModal(true)}
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="حریم خصوصی و اشتراک با پارتنر"
                  >
                    <FileText className="w-4 h-4 stroke-[1.7]" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePartnerPoke(`عزیزم، امروز در ${cycleStatus.phaseTitle} هستم؛ کنارم باش 🌸`)
                    }
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="ارسال پیام وضعیت به پارتنر"
                  >
                    <Send className="w-4 h-4 stroke-[1.7]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="w-11 h-11 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] flex items-center justify-center cursor-pointer transition-colors"
                    title="تنظیمات چرخه و تاریخ تولد"
                  >
                    <Settings className="w-4 h-4 stroke-[1.7]" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* PASTEL PINK ASSISTANT CARD (Exact Match to "Intelly assistant" Banner) */}
          <div className="bg-[#F6C3E5] rounded-[28px] p-5 sm:p-6 relative overflow-hidden">
            {/* Subtle Tilted Heart Watermark */}
            <svg
              viewBox="0 0 100 100"
              className="w-32 h-32 absolute -bottom-7 left-4 text-[#E5ADD2] fill-current pointer-events-none rotate-[-12deg]"
            >
              <path d="M50 88C50 88 12 63 12 36C12 21 24 12 36 12C44 12 50 18 50 23C50 18 56 12 64 12C76 12 88 21 88 36C88 63 50 88 50 88Z" />
            </svg>

            <div className="relative z-10 space-y-2.5 max-w-2xl">
              <span className="text-xs font-medium text-[#6B5364] block">
                دستیار هوشمند طغرل
              </span>

              {cycleStatus.diffDays >= 90 ? (
                <p className="text-sm sm:text-base font-bold text-[#1B1B1A] leading-relaxed">
                  بیش از <span className="text-[#D94E4E]">۳ ماه</span> از آخرین قاعدگی گذشته است؛ لطفاً در صورت رد بارداری با متخصص زنان مشورت کنید.
                </p>
              ) : partnerRole === "male" ? (
                <p className="text-sm sm:text-base font-bold text-[#1B1B1A] leading-relaxed">
                  {userProfile.displayName} عزیز،{" "}
                  {sharing.sharePhase ? (
                    <>
                      پارتنرتان امروز در{" "}
                      <span className="text-[#D94E4E]">{cycleStatus.phaseTitle}</span> است.{" "}
                      {cycleStatus.partnerTip}
                    </>
                  ) : (
                    "با آرامش، توجه و ابراز محبت بی‌قید و شرط در کنار پارتنرتان باشید."
                  )}
                </p>
              ) : (
                <p className="text-sm sm:text-base font-bold text-[#1B1B1A] leading-relaxed">
                  {userProfile.displayName} عزیز، امروز در{" "}
                  <span className="text-[#D94E4E]">
                    روز {toPersianDigits(cycleStatus.currentCycleDay)} چرخه
                  </span>{" "}
                  ({cycleStatus.phaseTitle}) هستی. {cycleStatus.selfCareTip}
                </p>
              )}

              <div className="pt-1">
                {partnerRole === "male" ? (
                  <button
                    type="button"
                    onClick={() => setShowCareModal(true)}
                    className="px-5 py-2.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    ارسال پیام همدلی
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                    className="px-5 py-2.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    ثبت احوالات امروز
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* EDITORIAL BIOMETRICS & CYCLE DETAILS ("Health systems" Style List + Care Cards) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Start: "Health systems" Progress List */}
            <div className="lg:col-span-7 bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#1B1B1A]">شاخص‌های سلامت و بیوریتم</h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-1.5 bg-[#1B1B1A] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer hover:bg-[#2F2E2C] transition-colors"
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
                        className={`w-12 h-12 rounded-full ${m.bgClass} text-[#1B1B1A] flex items-center justify-center shrink-0`}
                      >
                        <MetricIcon className="w-5 h-5 stroke-[1.6]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#1B1B1A] block mb-2">
                          {m.label}
                        </span>
                        <div className="w-full h-3.5 bg-[#EFECE2] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(10, m.pct)}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </div>

                      <div className="text-left shrink-0 min-w-[68px]">
                        <span className="text-lg font-bold text-[#1B1B1A]">
                          {toPersianDigits(m.score)}
                        </span>
                        <span className="text-[11px] text-[#78746B] mr-1 font-medium">از ۱۰</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right/End: Clinical Summary & Quick Partner Care */}
            <div className="lg:col-span-5 space-y-4">
              {partnerRole === "male" ? (
                <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#1B1B1A]">مراقبت سریع یک‌کلیکی</h4>
                    <div className="w-9 h-9 rounded-full bg-[#F6C3E5] text-[#1B1B1A] flex items-center justify-center">
                      <HeartHandshake className="w-4 h-4 stroke-[1.7]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-[#FAF6EC] p-3 rounded-2xl border border-[#E8E2D4]">
                      <span className="text-[11px] text-[#78746B] block mb-1">شانس باروری:</span>
                      <span className="font-bold text-[#1B1B1A]">
                        {sharing.shareFertileWindow ? cycleStatus.chanceOfPregnancy : "محرمانه"}
                      </span>
                    </div>
                    <div className="bg-[#FAF6EC] p-3 rounded-2xl border border-[#E8E2D4]">
                      <span className="text-[11px] text-[#78746B] block mb-1">موعد بعدی:</span>
                      <span className="font-bold text-[#1B1B1A]">
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
                      className="p-3 bg-[#EFECE2] hover:bg-[#F6DC6B]/60 rounded-2xl text-xs font-bold text-[#1B1B1A] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>پیشنهاد دمنوش گرم</span>
                      <span>☕</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("کیسه آب گرم و جای استراحتت آماده‌ست قشنگم، بیا دراز بکش 🛋️")}
                      className="p-3 bg-[#EFECE2] hover:bg-[#B8CEF4]/60 rounded-2xl text-xs font-bold text-[#1B1B1A] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>کیسه آب گرم و استراحت</span>
                      <span>🛋️</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePartnerPoke("شکلات و خوراکی‌های مورد علاقه‌ت رو برات خریدم نوش جونت 🍫")}
                      className="p-3 bg-[#EFECE2] hover:bg-[#F6C3E5]/60 rounded-2xl text-xs font-bold text-[#1B1B1A] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span>شکلات و تنقلات محبوب</span>
                      <span>🍫</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold text-[#1B1B1A]">راهنمای بیولوژیکی امروز</h4>
                    <span className="text-[11px] font-medium text-[#78746B]">
                      {formatPersianDate(toGregorianIsoString(new Date()))}
                    </span>
                  </div>

                  <p className="text-xs text-[#5C584F] leading-relaxed font-medium">
                    {cycleStatus.stageDescription}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#E8E2D4]">
                      <span className="text-[11px] text-[#78746B] block mb-1">احتمال بارداری:</span>
                      <span className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
                        <Baby className="w-3.5 h-3.5 stroke-[1.7]" />
                        {cycleStatus.chanceOfPregnancy}
                      </span>
                    </div>

                    <div className="bg-[#FAF6EC] p-3.5 rounded-2xl border border-[#E8E2D4]">
                      <span className="text-[11px] text-[#78746B] block mb-1">روز تخمک‌گذاری:</span>
                      <span className="text-xs font-bold text-[#1B1B1A]">
                        روز {toPersianDigits(safeOvulationDay)} چرخه
                      </span>
                    </div>
                  </div>

                  <div className="bg-[#F6DC6B]/45 p-4 rounded-2xl border border-[#E6CC5A] space-y-1">
                    <span className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 stroke-[1.7]" />
                      تغذیه پیشنهادی امروز
                    </span>
                    <p className="text-[11px] text-[#4A473E] leading-relaxed font-medium">
                      {cycleStatus.nutritionTip}
                    </p>
                  </div>
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
        <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#E8E2D4] space-y-6 text-right">
          {cyclePrediction.isPregnant ? (
            <div className="bg-[#F6C3E5] rounded-[26px] p-6 text-right space-y-2.5">
              <div className="flex items-center gap-2 text-[#1B1B1A] font-bold text-base">
                <span>🌸🤰</span>
                <span>تبریک! تست بارداری مثبت ثبت شده است</span>
              </div>
              <p className="text-xs text-[#4A3A45] leading-relaxed font-medium">
                {cyclePrediction.pregnancyMessage ||
                  "پیش‌بینی دوره‌های قاعدگی بعدی متوقف شد. جهت مراقبت‌های بارداری با پزشک متخصص مشورت نمایید."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF6EC] p-4 rounded-[22px] border border-[#E8E2D4]">
                <div>
                  <h3 className="text-base font-bold text-[#1B1B1A]">
                    پیش‌بینی دوره‌های آتی قاعدگی و باروری
                  </h3>
                  <p className="text-xs text-[#78746B] mt-1">
                    {cyclePrediction.confidence === "low"
                      ? "برآورد اولیه؛ پس از ثبت چند چرخه دیگر دقیق‌تر خواهد شد."
                      : cyclePrediction.confidence === "medium"
                      ? "برآورد با دقت متوسط بر اساس تاریخچه چرخه‌های قبلی."
                      : "برآورد با دقت بالا بر اساس نظم چرخه‌های ثبت‌شده شما."}
                  </p>
                </div>
                <span
                  className={`self-start sm:self-center text-xs font-bold px-4 py-1.5 rounded-full ${
                    cyclePrediction.confidence === "high"
                      ? "bg-[#A7B86C] text-[#1B1B1A]"
                      : cyclePrediction.confidence === "medium"
                      ? "bg-[#B8CEF4] text-[#1B1B1A]"
                      : "bg-[#F6DC6B] text-[#1B1B1A]"
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
                <div className="bg-[#DCE6B5] text-[#1B1B1A] p-4 rounded-2xl text-xs font-bold">
                  کیت تخمک‌گذاری با نتیجه پیک ثبت شده است؛ بازه‌های تخمک‌گذاری و پریود بعدی دقیق‌سازی شدند.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((p) => (
                  <div
                    key={p.cycleIndex}
                    className="bg-[#FAF6EC] p-5 rounded-[24px] border border-[#E8E2D4] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1B1B1A] bg-[#F6C3E5] px-3.5 py-1 rounded-full">
                        {p.cycleIndex === 1 && p.isDelayed
                          ? "دوره جاری (دارای تاخیر)"
                          : `دوره ${toPersianDigits(p.cycleIndex)} آینده`}
                      </span>
                      <span className="text-xs font-bold text-[#78746B]">
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
                        <span className="text-[#78746B] font-medium">بازه شروع پریود:</span>
                        <span className="font-bold text-[#1B1B1A] bg-[#FFFDF8] px-3 py-1 rounded-full border border-[#E8E2D4]">
                          {p.startDateRangePersian || p.startDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#78746B] font-medium">بازه تخمک‌گذاری:</span>
                        <span className="font-bold text-[#1B1B1A] bg-[#A7B86C]/45 px-3 py-1 rounded-full">
                          {p.ovulationDateRangePersian || p.ovulationDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#78746B] font-medium">پنجره باروری:</span>
                        <span className="font-bold text-[#1B1B1A] bg-[#B8CEF4]/55 px-3 py-1 rounded-full">
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
        <div className="bg-[#FFFDF8] rounded-[28px] p-6 border border-[#E8E2D4] space-y-6 text-right">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1B1B1A]">تاریخچه علائم و گزارش‌ها</h3>
              <p className="text-xs text-[#78746B] mt-0.5">سوابق خونریزی و احوالات ثبت‌شده</p>
            </div>
            <button
              onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
              className="px-5 py-2.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
            >
              ثبت گزارش جدید
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-14 text-[#78746B] text-xs bg-[#FAF6EC] rounded-[24px] border border-[#E8E2D4]">
              هنوز هیچ وضعیتی ثبت نشده است.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#FAF6EC] p-4 rounded-[22px] border border-[#E8E2D4] space-y-3 relative text-right"
                >
                  {effectiveIsOwner && (
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="absolute top-3.5 left-3.5 w-8 h-8 rounded-full bg-[#EFECE2] hover:bg-[#F6C3E5] text-[#1B1B1A] flex items-center justify-center transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[1.7]" />
                    </button>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pl-8">
                    <span className="text-xs font-bold text-[#1B1B1A]">
                      {formatPersianDate(log.date)}
                    </span>
                    {log.isPeriodStart && (
                      <span className="text-[10px] font-bold bg-[#F6C3E5] text-[#1B1B1A] px-2.5 py-0.5 rounded-full">
                        روز اول پریود
                      </span>
                    )}
                    {(effectiveIsOwner || sharing.shareFlow) && log.flow && log.flow !== "none" && (
                      <span className="text-[10px] font-bold text-[#1B1B1A] bg-[#EFECE2] px-2.5 py-0.5 rounded-full">
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
                            className="text-[10px] font-bold bg-[#F6DC6B]/60 text-[#1B1B1A] px-2.5 py-1 rounded-full"
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
                            className="text-[10px] font-bold bg-[#EFECE2] text-[#1B1B1A] px-2.5 py-1 rounded-full"
                          >
                            {opt?.icon} {opt?.label || s}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareSex) && log.sex && log.sex !== "none" && (
                    <div>
                      <span className="text-[10px] font-bold text-[#1B1B1A] bg-[#B8CEF4]/60 px-3 py-1 rounded-full inline-block">
                        رابطه: {SEX_OPTIONS.find((s) => s.id === log.sex)?.label || log.sex}
                      </span>
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareTests) &&
                    log.ovulationTestResult &&
                    log.ovulationTestResult !== "none" && (
                      <div>
                        <span className="text-[10px] font-bold text-[#1B1B1A] bg-[#DCE6B5] px-3 py-1 rounded-full inline-block">
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
                        <span className="text-[10px] font-bold text-[#1B1B1A] bg-[#F6C3E5] px-3 py-1 rounded-full inline-block">
                          بی‌بی‌چک:{" "}
                          {PREGNANCY_TEST_OPTIONS.find((p) => p.id === log.pregnancyTestResult)?.label ||
                            log.pregnancyTestResult}
                        </span>
                      </div>
                    )}

                  {(effectiveIsOwner || sharing.shareNotes) && log.notes && (
                    <p className="text-xs text-[#5C584F] bg-[#FFFDF8] p-3 rounded-2xl border border-[#E8E2D4]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] rounded-[32px] p-6 max-w-lg w-full border border-[#E8E2D4] space-y-5 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-[#E8E2D4] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#F6C3E5] text-[#1B1B1A] flex items-center justify-center">
                    <Settings className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <h3 className="text-base font-bold text-[#1B1B1A]">
                    تنظیمات چرخه و محاسبات طغرل
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* Ownership Card */}
                <div className="p-4 bg-[#FFFDF8] rounded-[24px] border border-[#E8E2D4] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 stroke-[1.8]" />
                      مالکیت ترکر سلامت
                    </span>
                    {isOwner ? (
                      <span className="text-[10px] font-bold bg-[#DCE6B5] text-[#1B1B1A] px-3 py-1 rounded-full">
                        شما صاحب ترکر هستید
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-[#B8CEF4] text-[#1B1B1A] px-3 py-1 rounded-full">
                        حالت همراه
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#78746B] leading-relaxed font-medium">
                    {isOwner
                      ? "این ترکر به عنوان ترکر سلامت شخصی شما تنظیم شده است و کلیه دسترسی‌های اشتراک با پارتنر تحت کنترل شماست."
                      : "این ترکر تحت مالکیت پارتنر شماست و شما به عنوان همراه داده‌های مجاز را مشاهده می‌کنید."}
                  </p>

                  {!settings.trackerOwnerUid && (
                    <div className="pt-2.5 border-t border-[#E8E2D4] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#1B1B1A] block">
                          این ترکر برای من است
                        </span>
                        <span className="text-[10px] text-[#78746B] font-medium">
                          مدیریت کامل دسترسی‌ها با من خواهد بود.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formClaimOwner}
                        onChange={(e) => setFormClaimOwner(e.target.checked)}
                        className="w-5 h-5 accent-[#1B1B1A] rounded cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>

                {/* Goal Mode */}
                <div>
                  <label className="block text-xs font-bold text-[#1B1B1A] mb-2">هدف شما از استفاده:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("track")}
                      className={`p-3 rounded-2xl transition-colors text-center cursor-pointer ${
                        formGoalMode === "track"
                          ? "bg-[#1B1B1A] text-[#FAF6EC]"
                          : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
                      }`}
                    >
                      ردیابی سلامت
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("pregnancy")}
                      className={`p-3 rounded-2xl transition-colors text-center cursor-pointer ${
                        formGoalMode === "pregnancy"
                          ? "bg-[#1B1B1A] text-[#FAF6EC]"
                          : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
                      }`}
                    >
                      اقدام به بارداری
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode("prevention")}
                      className={`p-3 rounded-2xl transition-colors text-center cursor-pointer ${
                        formGoalMode === "prevention"
                          ? "bg-[#1B1B1A] text-[#FAF6EC]"
                          : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
                      }`}
                    >
                      پیشگیری طبیعی
                    </button>
                  </div>
                </div>

                {/* Last Period Start Date */}
                <div>
                  <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">
                    تاریخ اولین روز آخرین پریود (شمسی):
                  </label>
                  <JalaliDatePicker
                    value={formLastPeriodDate}
                    onChange={(val) => setFormLastPeriodDate(val)}
                    placeholder="انتخاب اولین روز آخرین پریود..."
                  />
                  <span className="text-[11px] text-[#78746B] font-medium mt-1 block">
                    تاریخ انتخابی: {formatPersianDate(formLastPeriodDate)}
                  </span>
                </div>

                {/* Cycle and Period Lengths */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">
                      طول دوره (فاصله دو شروع):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      required
                      value={formCycleLength}
                      onChange={(e) => setFormCycleLength(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-xs font-bold text-[#1B1B1A] outline-none transition-colors"
                    />
                    <span className="text-[10px] text-[#78746B] mt-1 block">نرمال: ۲۱ تا ۳۵ روز</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">
                      طول خونریزی پریود:
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      required
                      value={formPeriodLength}
                      onChange={(e) => setFormPeriodLength(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-xs font-bold text-[#1B1B1A] outline-none transition-colors"
                    />
                    <span className="text-[10px] text-[#78746B] mt-1 block">معمولاً: ۳ تا ۷ روز</span>
                  </div>
                </div>

                {/* Birth Date */}
                <div>
                  <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">
                    تاریخ تولد (برای نمودار بیوریتم طغرل):
                  </label>
                  <JalaliDatePicker
                    value={formBirthDate}
                    onChange={(val) => setFormBirthDate(val || "2000-01-01")}
                    placeholder="انتخاب تاریخ تولد به شمسی..."
                  />
                </div>

                <div className="pt-3 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    ذخیره تنظیمات چرخه
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-5 py-3.5 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] rounded-full text-xs font-bold cursor-pointer transition-colors"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] rounded-[32px] p-6 max-w-lg w-full border border-[#E8E2D4] space-y-5 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-[#E8E2D4] pb-3.5">
                <div>
                  <h3 className="text-base font-bold text-[#1B1B1A]">ثبت علائم و احوالات روزانه</h3>
                  <p className="text-xs text-[#78746B] mt-0.5">
                    تاریخ: {formatPersianDate(selectedLogDate)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              <form onSubmit={handleSaveDailyLog} className="space-y-4">
                {!effectiveIsOwner && (
                  <div className="p-3.5 bg-[#B8CEF4]/50 rounded-2xl text-xs text-[#1B1B1A] font-medium leading-relaxed">
                    شما در حال ثبت لاگ به عنوان همراه هستید. برای حفظ حریم خصوصی پارتنرتان، تنها امکان اعلام شروع پریود جدید فعال است.
                  </div>
                )}

                {/* Period Start Checkbox */}
                <div className="p-4 bg-[#F6C3E5] rounded-[22px] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1B1B1A] block">امروز شروع پریود جدید است؟</span>
                    <span className="text-[11px] text-[#4A3A45] font-medium">
                      چرخه جدید از این تاریخ آغاز می‌شود.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={logFormIsPeriodStart}
                    onChange={(e) => setLogFormIsPeriodStart(e.target.checked)}
                    className="w-5 h-5 accent-[#1B1B1A] rounded cursor-pointer"
                  />
                </div>

                {effectiveIsOwner && (
                  <>
                    {/* Bleeding Flow */}
                    <div>
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">شدت خونریزی:</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        {FLOW_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormFlow(opt.id)}
                            className={`p-2.5 rounded-2xl text-center transition-colors cursor-pointer ${
                              logFormFlow === opt.id
                                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">احوالات روحی امروز:</label>
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
                              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                  : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">نشانه‌ها و دردهای فیزیکی:</label>
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
                              className={`px-3.5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                  : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">وضعیت ترشحات:</label>
                      <select
                        value={logFormDischarge}
                        onChange={(e) => setLogFormDischarge(e.target.value)}
                        className="w-full px-4 py-3 bg-[#EFECE2] rounded-2xl text-xs font-bold text-[#1B1B1A] outline-none"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">رابطه زناشویی امروز:</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                        {SEX_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormSex(opt.id)}
                            className={`p-2.5 rounded-2xl text-center transition-colors cursor-pointer ${
                              logFormSex === opt.id
                                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">کیت تخمک‌گذاری (LH):</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                        {OVULATION_TEST_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormOvulationKit(opt.id)}
                            className={`p-2.5 rounded-2xl text-center transition-colors cursor-pointer ${
                              logFormOvulationKit === opt.id
                                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
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
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-2">تست بارداری (بی‌بی‌چک):</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                        {PREGNANCY_TEST_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormPregnancyTest(opt.id)}
                            className={`p-2.5 rounded-2xl text-center transition-colors cursor-pointer ${
                              logFormPregnancyTest === opt.id
                                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                                : "bg-[#EFECE2] text-[#1B1B1A] hover:bg-[#E5E0D2]"
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {logFormPregnancyTest !== "none" && (
                        <div className="p-3.5 bg-[#FFFDF8] rounded-2xl border border-[#E8E2D4] flex items-center justify-between mt-2.5">
                          <div className="pl-2">
                            <span className="text-xs font-bold text-[#1B1B1A] block">
                              این نتیجه را برای پارتنرم نمایش بده
                            </span>
                            <span className="text-[10px] text-[#78746B] font-medium">
                              نتایج تست بارداری بدون تایید شما کاملاً محرمانه می‌مانند.
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={logFormSharePregnancyTest}
                            onChange={(e) => setLogFormSharePregnancyTest(e.target.checked)}
                            className="w-5 h-5 accent-[#1B1B1A] rounded cursor-pointer shrink-0"
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5">یادداشت شخصی:</label>
                      <textarea
                        rows={2}
                        value={logFormNotes}
                        onChange={(e) => setLogFormNotes(e.target.value)}
                        placeholder="هر احساس، تجربه یا نکته‌ای از این روز..."
                        className="w-full px-4 py-2.5 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-xs text-[#1B1B1A] outline-none resize-none"
                      />
                    </div>
                  </>
                )}

                <div className="pt-3 flex gap-2.5">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                  >
                    ذخیره علائم امروز
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-5 py-3.5 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] rounded-full text-xs font-bold cursor-pointer transition-colors"
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
      {/* COMPANION CARE MODAL (FOR MALE PARTNER)                           */}
      {/* ================================================================= */}
      <AnimatePresence>
        {showCareModal && (
          <div className="fixed inset-0 bg-[#1B1B1A]/40 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-[#FAF6EC] rounded-[32px] w-full max-w-lg p-6 border border-[#E8E2D4] text-right space-y-4"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#F6C3E5] text-[#1B1B1A] flex items-center justify-center">
                    <MessageCircleHeart className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1B1B1A]">ارسال محبت و مراقبت</h3>
                    <p className="text-xs text-[#78746B] font-medium">
                      پیام شما فوراً روی صفحه پارتنرتان نمایش داده می‌شود
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCareModal(false)}
                  className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1B1B1A] block">پیام‌های آماده دلگرم‌کننده:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "عزیزم برات یک دمنوش گرم و نبات آماده کنم؟ ☕",
                    "کیسه آب گرم و جای استراحتت حاضره، بیا دراز بکش 🛋️",
                    "شکلات و خوراکی مورد علاقه‌ت رو برات خریدم نوش جونت 🍫",
                    "فقط می‌خواستم بگم چقدر دوستت دارم و کنارت هستم 🌸",
                    "امروز هر کاری داشتی بسپر به من، فقط استراحت کن 💖",
                    "یک لیوان آب خنک برات آوردم، مراقب سلامتیت باش 💧"
                  ].map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomCareMessage(tmpl)}
                      className={`p-3 rounded-2xl text-xs font-bold text-right transition-colors cursor-pointer ${
                        customCareMessage === tmpl
                          ? "bg-[#1B1B1A] text-[#FAF6EC]"
                          : "bg-[#FFFDF8] border border-[#E8E2D4] text-[#1B1B1A] hover:bg-[#EFECE2]"
                      }`}
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1B1B1A] block">یا متن دلخواه خودت را بنویس:</label>
                <textarea
                  value={customCareMessage}
                  onChange={(e) => setCustomCareMessage(e.target.value)}
                  placeholder="کلمات محبت‌آمیز خودت را بنویس..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-xs text-[#1B1B1A] text-right outline-none resize-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCareModal(false)}
                  className="px-5 py-3 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] rounded-full text-xs font-bold transition-colors cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const msg = customCareMessage.trim() || "عزیزم، همیشه به فکرتم و کنارت هستم 💕";
                    handlePartnerPoke(msg);
                    setShowCareModal(false);
                    setCustomCareMessage("");
                  }}
                  className="flex-1 py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] font-bold text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 stroke-[1.7]" />
                  <span>ارسال پیام محبت‌آمیز</span>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] rounded-[32px] p-6 max-w-md w-full border border-[#E8E2D4] space-y-4 text-right"
            >
              <div className="w-14 h-14 rounded-full bg-[#F6DC6B] text-[#1B1B1A] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 stroke-[1.7]" />
              </div>

              <h4 className="text-base font-bold text-[#1B1B1A] text-center">توجه درباره چرخه نامنظم</h4>

              <p className="text-xs text-[#5C584F] leading-relaxed font-medium text-center">
                {warningMessage}
              </p>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] rounded-[32px] p-6 max-w-lg w-full border border-[#E8E2D4] space-y-4 text-right overflow-y-auto max-h-[90vh]"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-[#E8E2D4] pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#B8CEF4] text-[#1B1B1A] flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 stroke-[1.7]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1B1B1A]">اشتراک‌گذاری با پارتنر</h3>
                    <p className="text-xs text-[#78746B] font-medium">کنترل اختصاصی حریم خصوصی داده‌های سلامت</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4 stroke-[1.8]" />
                </button>
              </div>

              <div className="p-3.5 bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl text-xs text-[#5C584F] leading-relaxed font-medium">
                داده‌های سلامت شما کاملاً خصوصی هستند. با کلیدهای زیر تعیین کنید چه مواردی در حساب پارتنرتان نمایش داده شود.
              </div>

              <div className="space-y-2 divide-y divide-[#E8E2D4]">
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
                  <div key={item.key} className="pt-2.5 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#1B1B1A]">{item.label}</h4>
                      <p className="text-[11px] text-[#78746B] font-medium leading-relaxed">{item.desc}</p>
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
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer shrink-0 ${
                        (sharing as any)[item.key]
                          ? "bg-[#1B1B1A] justify-start"
                          : "bg-[#DDD8C8] justify-end"
                      }`}
                    >
                      <motion.div
                        layout
                        className={`w-4 h-4 rounded-full ${
                          (sharing as any)[item.key] ? "bg-[#F6C3E5]" : "bg-[#FFFDF8]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E8E2D4] flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewingAsPartner(true);
                    setShowSharingModal(false);
                  }}
                  className="w-full py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4 stroke-[1.7]" />
                  <span>پیش‌نمایش آنچه پارتنرم می‌بیند</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportData}
                    className="py-2.5 px-3 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] font-bold text-[11px] rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[1.7]" />
                    <span>{isExporting ? "در حال دریافت..." : "دانلود پشتیبان (JSON)"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingAll}
                    onClick={() => setShowDeleteAllConfirmModal(true)}
                    className="py-2.5 px-3 bg-[#F6C3E5] hover:bg-[#E5ADD2] text-[#1B1B1A] font-bold text-[11px] rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-[1.7]" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] rounded-[32px] p-6 max-w-sm w-full border border-[#E8E2D4] space-y-4 text-center"
              dir="rtl"
            >
              <div className="w-14 h-14 rounded-full bg-[#F6C3E5] text-[#1B1B1A] flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6 stroke-[1.7]" />
              </div>
              <h4 className="text-base font-bold text-[#1B1B1A]">حذف کامل اطلاعات سلامت</h4>
              <p className="text-xs text-[#78746B] leading-relaxed font-medium">
                آیا از حذف کامل تمام اطلاعات، لاگ‌های روزانه و تنظیمات چرخه خود اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
              </p>
              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirmModal(false)}
                  className="flex-1 py-3 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] rounded-full text-xs font-bold cursor-pointer transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isDeletingAll}
                  onClick={handleDeleteAllData}
                  className="flex-1 py-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold cursor-pointer transition-colors"
                >
                  {isDeletingAll ? "در حال حذف..." : "بله، کامل حذف شود"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
