import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Droplet, Calendar as CalendarIcon, Heart, Sparkles, Activity, ShieldAlert, 
  Baby, Moon, Sun, Zap, Smile, Frown, Meh, HeartPulse, Check, Info, Settings, 
  Plus, Trash2, ChevronLeft, ChevronRight, Share2, FileText, AlertCircle, RefreshCw, 
  BarChart3, HelpCircle, Eye, EyeOff, Coffee, HeartHandshake, CheckCircle2, MessageCircleHeart, Send, X, Edit2, Download
} from "lucide-react";
import confetti from "canvas-confetti";
import { UserProfile, ImpoPeriodSettings, ImpoDailyLog, CycleGoalMode, PeriodSharingSettings } from "../types";
import { 
  calculateCycleStatus, predictFutureCycles, calculateBiorhythm, daysBetween,
  extractCycleHistory, estimateCycleLength, predictCycle, formatDateRangePersian,
  CycleStatusResult, PredictedCycle, BiorhythmResult, CyclePredictionResult 
} from "../utils/impoCycleEngine";
import { 
  formatPersianDate, toPersianDigits, gregorianToJalali, jalaliToGregorian, 
  getDaysInJalaliMonth, JALALI_MONTHS, JALALI_WEEKDAYS, getTehranDate, toGregorianIsoString 
} from "../utils/jalali";
import { fetchFromPhpApi } from "../apiClient";
import JalaliDatePicker from "./JalaliDatePicker";

interface ImpoPeriodTrackerProps {
  userProfile: UserProfile;
  onSendPoke?: (message: string, tag: string) => void;
}

// Flow Level Options
const FLOW_OPTIONS = [
  { id: 'none', label: 'بدون خونریزی', icon: '⚪' },
  { id: 'spotting', label: 'لکه‌بینی', icon: '💧' },
  { id: 'light', label: 'خفیف', icon: '🩸' },
  { id: 'medium', label: 'متوسط', icon: '🩸🩸' },
  { id: 'heavy', label: 'شدید', icon: '🩸🩸🩸' }
];

// Mood Options
const MOOD_OPTIONS = [
  { id: 'happy', label: 'شاد و پرانرژی', icon: '🥰' },
  { id: 'calm', label: 'آرام و راضی', icon: '🧘‍♀️' },
  { id: 'moody', label: 'نوسان خلق', icon: '🎭' },
  { id: 'sensitive', label: 'حساس و زودرنج', icon: '🥺' },
  { id: 'anxious', label: 'مضطرب و نگران', icon: '😰' },
  { id: 'tired', label: 'خسته و بی‌انرژی', icon: '🥱' },
  { id: 'angry', label: 'کلافه یا عصبی', icon: '😤' }
];

// Physical Symptoms Options
const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'دل‌پیچه و کرامپ', icon: '⚡' },
  { id: 'backache', label: 'کمردرد', icon: '🦴' },
  { id: 'headache', label: 'سردرد / میگرن', icon: '🤕' },
  { id: 'tender_breasts', label: 'حساسیت پستان', icon: '🌸' },
  { id: 'bloating', label: 'نفخ و ورم شکم', icon: '🎈' },
  { id: 'nausea', label: 'حالت تهوع', icon: '🤢' },
  { id: 'acne', label: 'آکنه و جوش پوستی', icon: '✨' },
  { id: 'sweet_cravings', label: 'هوس شیرینی', icon: '🍫' }
];

// Cervical Discharge Options
const DISCHARGE_OPTIONS = [
  { id: 'none', label: 'خشک / بدون ترشح' },
  { id: 'sticky', label: 'چسبناک' },
  { id: 'creamy', label: 'کرمی و شیری' },
  { id: 'watery', label: 'آبکی و لغزنده' },
  { id: 'clear', label: 'شفاف کشسان (سفیده تخم‌مرغ) 🥚' }
];

// Intimacy Options
const SEX_OPTIONS = [
  { id: 'none', label: 'بدون رابطه', icon: '🚫' },
  { id: 'protected', label: 'رابطه محافظت‌شده (کاندوم/قرص)', icon: '🛡️' },
  { id: 'unprotected', label: 'رابطه محافظت‌نشده', icon: '💖' }
];

// Ovulation Test Options
const OVULATION_TEST_OPTIONS = [
  { id: 'none', label: 'ثبت‌نشده', icon: '⚪' },
  { id: 'negative', label: 'منفی (خط کم‌رنگ)', icon: '➖' },
  { id: 'positive_weak', label: 'مثبت ضعیف', icon: '🟡' },
  { id: 'positive_peak', label: 'مثبت اوج (تخمک‌گذاری)', icon: '🟣' }
];

// Pregnancy Test Options
const PREGNANCY_TEST_OPTIONS = [
  { id: 'none', label: 'تست نداده‌ام', icon: '⚪' },
  { id: 'negative', label: 'منفی (یک خط)', icon: '➖' },
  { id: 'positive', label: 'مثبت (دو خط / باردار)', icon: '👶' }
];


// Helper phase styling for calendar strip
const getPhaseStyle = (phase: string) => {
  switch (phase) {
    case 'period':
      return {
        cardBg: 'bg-rose-50 text-rose-900 border-rose-200',
        selectedBg: 'bg-gradient-to-b from-rose-500 to-pink-600 text-white border-rose-600',
        badge: 'bg-rose-100 text-rose-800',
        icon: '🩸',
        shortLabel: 'پریود'
      };
    case 'due':
      return {
        cardBg: 'bg-rose-50 text-rose-900 border-rose-200',
        selectedBg: 'bg-gradient-to-b from-rose-500 to-pink-500 text-white border-rose-500',
        badge: 'bg-rose-100 text-rose-800',
        icon: '⏳',
        shortLabel: 'موعد'
      };
    case 'delayed':
      return {
        cardBg: 'bg-red-50 text-red-900 border-red-200',
        selectedBg: 'bg-gradient-to-b from-red-500 to-rose-600 text-white border-red-600',
        badge: 'bg-red-100 text-red-800',
        icon: '⚠️',
        shortLabel: 'تاخیر'
      };
    case 'ovulation':
      return {
        cardBg: 'bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200',
        selectedBg: 'bg-gradient-to-b from-fuchsia-500 to-pink-600 text-white border-fuchsia-600',
        badge: 'bg-fuchsia-100 text-fuchsia-800',
        icon: '🥚',
        shortLabel: 'تخمک‌گذاری'
      };
    case 'fertile':
      return {
        cardBg: 'bg-purple-50 text-purple-900 border-purple-200',
        selectedBg: 'bg-gradient-to-b from-purple-500 to-violet-600 text-white border-purple-600',
        badge: 'bg-purple-100 text-purple-800',
        icon: '🟣',
        shortLabel: 'باروری'
      };
    case 'pms':
      return {
        cardBg: 'bg-amber-50 text-amber-900 border-amber-200',
        selectedBg: 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 border-amber-500',
        badge: 'bg-amber-100 text-amber-800',
        icon: '⚡',
        shortLabel: 'PMS'
      };
    case 'follicular':
      return {
        cardBg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        selectedBg: 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white border-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: '🌱',
        shortLabel: 'فولیکولار'
      };
    default:
      return {
        cardBg: 'bg-slate-50 text-slate-800 border-slate-200',
        selectedBg: 'bg-gradient-to-b from-indigo-600 to-purple-700 text-white border-indigo-700',
        badge: 'bg-slate-100 text-slate-700',
        icon: '🌙',
        shortLabel: 'لوتئال'
      };
  }
};

export default function ImpoPeriodTracker({ userProfile, onSendPoke }: ImpoPeriodTrackerProps) {
  // Navigation sub-tab inside period tracker: 'dashboard' | 'calendar' | 'predictions' | 'biorhythm' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'calendar' | 'predictions' | 'biorhythm' | 'history'>('dashboard');

  // View Mode: Circular (Impo Circle) or Flat (Impo Bar)
  const [viewMode, setViewMode] = useState<'circular' | 'flat'>('circular');

  // Storage Key for Shared Couple Space
  const storageKey = userProfile.coupleId || userProfile.uid;

  // Period Settings State
  const [settings, setSettings] = useState<ImpoPeriodSettings>(() => {
    const cached = localStorage.getItem(`impo_period_settings_${storageKey}`) || localStorage.getItem(`impo_period_settings_${userProfile.uid}`);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    return {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: toGregorianIsoString(new Date()),
      goalMode: 'track',
      birthDate: '2000-01-01',
      viewMode: 'circular'
    };
  });

  const [hasConfigured, setHasConfigured] = useState<boolean>(() => {
    return !!(localStorage.getItem(`impo_period_configured_${storageKey}`) || localStorage.getItem(`impo_period_configured_${userProfile.uid}`));
  });

  // Daily Logs State
  const [logs, setLogs] = useState<ImpoDailyLog[]>(() => {
    const cached = localStorage.getItem(`impo_period_logs_${storageKey}`) || localStorage.getItem(`impo_period_logs_${userProfile.uid}`);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
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

  // Period Sharing Settings
  const [sharing, setSharing] = useState<PeriodSharingSettings>(() => {
    const targetId = userProfile.coupleId || userProfile.uid;
    const cached = localStorage.getItem(`impo_period_sharing_${targetId}`);
    if (cached) {
      try { return JSON.parse(cached); } catch {}
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
    return userProfile.gender !== 'male';
  }, [settings.trackerOwnerUid, userProfile.uid, userProfile.gender]);

  const effectiveIsOwner: boolean = isOwner && !isPreviewingAsPartner;
  const partnerRole: 'female' | 'male' = effectiveIsOwner ? 'female' : 'male';

  const [showCareModal, setShowCareModal] = useState(false);
  const [customCareMessage, setCustomCareMessage] = useState("");

  // Settings Form State
  const [formCycleLength, setFormCycleLength] = useState<number>(settings.cycleLength || 28);
  const [formPeriodLength, setFormPeriodLength] = useState<number>(settings.periodLength || 5);
  const [formLastPeriodDate, setFormLastPeriodDate] = useState<string>(settings.lastPeriodStartDate || toGregorianIsoString(new Date()));
  const [formGoalMode, setFormGoalMode] = useState<CycleGoalMode>(settings.goalMode || 'track');
  const [formBirthDate, setFormBirthDate] = useState<string>(settings.birthDate || "2000-01-01");
  const [formClaimOwner, setFormClaimOwner] = useState<boolean>(settings.trackerOwnerUid ? settings.trackerOwnerUid === userProfile.uid : userProfile.gender !== 'male');

  // Log Form State
  const [logFormFlow, setLogFormFlow] = useState<any>('none');
  const [logFormIsPeriodStart, setLogFormIsPeriodStart] = useState<boolean>(false);
  const [logFormMoods, setLogFormMoods] = useState<string[]>([]);
  const [logFormSymptoms, setLogFormSymptoms] = useState<string[]>([]);
  const [logFormDischarge, setLogFormDischarge] = useState<any>('none');
  const [logFormSex, setLogFormSex] = useState<any>('none');
  const [logFormOvulationKit, setLogFormOvulationKit] = useState<any>('none');
  const [logFormPregnancyTest, setLogFormPregnancyTest] = useState<any>('none');
  const [logFormSharePregnancyTest, setLogFormSharePregnancyTest] = useState<boolean>(false);
  const [logFormWater, setLogFormWater] = useState<number>(4);
  const [logFormNotes, setLogFormNotes] = useState<string>("");

  // Current Calendar View Month/Year
  const todayTehran = getTehranDate();
  const [todayJy, todayJm, todayJd] = gregorianToJalali(
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
      try {
        const res = await fetchFromPhpApi('getPeriodData', {
          coupleId: userProfile.coupleId || '',
          uid: userProfile.uid
        });

        if (isMounted && res && res.status === 'success') {
          if (res.settings) {
            setSettings(res.settings);
            setHasConfigured(true);
            localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(res.settings));
            localStorage.setItem(`impo_period_configured_${targetId}`, "true");
            setFormCycleLength(res.settings.cycleLength || 28);
            setFormPeriodLength(res.settings.periodLength || 5);
            setFormLastPeriodDate(res.settings.lastPeriodStartDate || toGregorianIsoString(new Date()));
            setFormGoalMode(res.settings.goalMode || 'track');
            setFormBirthDate(res.settings.birthDate || "2000-01-01");
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

    // Immediate initial sync
    fetchTrackerData();

    // Regular interval polling for live partner updates
    const syncInterval = setInterval(fetchTrackerData, 4000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
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

  // 1) History extraction: builds consecutive intervals from period start logs & settings
  const cycleHistory = useMemo(() => {
    return extractCycleHistory(logs, settings);
  }, [logs, settings]);

  // 2 & 3) Honest Bayesian prediction result (next start, ovulation, fertile window ranges)
  const cyclePrediction: CyclePredictionResult = useMemo(() => {
    return predictCycle(cycleHistory, logs, new Date(), settings, 2);
  }, [cycleHistory, logs, settings]);

  // Cycle Calculations based on engine (incorporates Bayesian estimated cycle length)
  const cycleStatus: CycleStatusResult = useMemo(() => {
    return calculateCycleStatus(settings, new Date(), Math.round(cyclePrediction.estimatedCycleLength));
  }, [settings, cyclePrediction.estimatedCycleLength]);

  // Calendar Strip State (for viewMode === 'flat')
  const [stripSelectedDate, setStripSelectedDate] = useState<string>(toGregorianIsoString(new Date()));
  const [stripWeekOffset, setStripWeekOffset] = useState<number>(0);
  const [stripMode, setStripMode] = useState<'timeline' | 'cycle'>('timeline');

  // Status for selected date on the calendar strip
  const stripSelectedStatus: CycleStatusResult = useMemo(() => {
    try {
      const d = new Date(stripSelectedDate + 'T12:00:00');
      return calculateCycleStatus(settings, d);
    } catch {
      return cycleStatus;
    }
  }, [settings, stripSelectedDate, cycleStatus]);

  // Strip days calculation based on Jalali calendar
  const stripDays = useMemo(() => {
    const results: Array<{
      date: Date;
      iso: string;
      jy: number;
      jm: number;
      jd: number;
      weekday: string;
      status: CycleStatusResult;
      isToday: boolean;
      isSelected: boolean;
      hasLog: boolean;
    }> = [];

    const todayIso = toGregorianIsoString(new Date());

    if (stripMode === 'timeline') {
      // 15 days window centered on current anchor
      const baseTime = new Date().getTime() + stripWeekOffset * 7 * 86400000;
      for (let offset = -5; offset <= 9; offset++) {
        const d = new Date(baseTime + offset * 86400000);
        const iso = toGregorianIsoString(d);
        const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const weekday = JALALI_WEEKDAYS[(d.getDay() + 1) % 7];
        const status = calculateCycleStatus(settings, d);
        results.push({
          date: d,
          iso,
          jy,
          jm,
          jd,
          weekday,
          status,
          isToday: iso === todayIso,
          isSelected: iso === stripSelectedDate,
          hasLog: logs.some(l => l.date === iso)
        });
      }
    } else {
      // Entire current cycle mapped to actual calendar days
      const lastStart = new Date(settings.lastPeriodStartDate + 'T00:00:00');
      const now = new Date();
      const diffDays = daysBetween(settings.lastPeriodStartDate, now);
      const cycleLen = cycleStatus.cycleLength || 28;
      const cycleIdx = diffDays >= 0 ? Math.floor(diffDays / cycleLen) : 0;
      const cycleStartDate = new Date(lastStart);
      cycleStartDate.setDate(cycleStartDate.getDate() + cycleIdx * cycleLen);

      for (let i = 0; i < cycleLen; i++) {
        const d = new Date(cycleStartDate);
        d.setDate(d.getDate() + i);
        const iso = toGregorianIsoString(d);
        const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        const weekday = JALALI_WEEKDAYS[(d.getDay() + 1) % 7];
        const status = calculateCycleStatus(settings, d);
        results.push({
          date: d,
          iso,
          jy,
          jm,
          jd,
          weekday,
          status,
          isToday: iso === todayIso,
          isSelected: iso === stripSelectedDate,
          hasLog: logs.some(l => l.date === iso)
        });
      }
    }

    return results;
  }, [settings, stripWeekOffset, stripMode, stripSelectedDate, cycleStatus.cycleLength, logs]);

  // Future cycle predictions (honest ranges for next 2 cycles)
  const predictions: PredictedCycle[] = useMemo(() => {
    return predictFutureCycles(settings, 2, logs);
  }, [settings, logs]);

  // Biorhythm result
  const biorhythm: BiorhythmResult | null = useMemo(() => {
    return calculateBiorhythm(settings.birthDate, new Date());
  }, [settings.birthDate]);

  // Open log modal for specific date
  const handleOpenLogModal = (dateStr: string) => {
    if (!effectiveIsOwner && !sharing.allowPartnerLogging) {
      alert("امکان ثبت لاگ توسط صاحب ترکر غیرفعال شده است.");
      return;
    }
    setSelectedLogDate(dateStr);
    const existing = logs.find(l => l.date === dateStr);
    if (existing) {
      setLogFormFlow(existing.flow || 'none');
      setLogFormIsPeriodStart(existing.isPeriodStart || false);
      setLogFormMoods(existing.moods || []);
      setLogFormSymptoms(existing.symptoms || []);
      setLogFormDischarge(existing.discharge || 'none');
      setLogFormSex(existing.sex || 'none');
      setLogFormOvulationKit(existing.ovulationTestResult || 'none');
      setLogFormPregnancyTest(existing.pregnancyTestResult || 'none');
      setLogFormSharePregnancyTest(existing.sharePregnancyTestWithPartner || false);
      setLogFormWater(existing.waterGlasses || 4);
      setLogFormNotes(existing.notes || "");
    } else {
      setLogFormFlow('none');
      setLogFormIsPeriodStart(false);
      setLogFormMoods([]);
      setLogFormSymptoms([]);
      setLogFormDischarge('none');
      setLogFormSex('none');
      setLogFormOvulationKit('none');
      setLogFormPregnancyTest('none');
      setLogFormSharePregnancyTest(false);
      setLogFormWater(4);
      setLogFormNotes("");
    }
    setShowLogModal(true);
  };

  // Quick Action: "I got my period today!"
  const handleQuickGotPeriodToday = async () => {
    if (!effectiveIsOwner && !sharing.allowPartnerLogging) {
      alert("امکان ثبت لاگ توسط صاحب ترکر غیرفعال شده است.");
      return;
    }
    const todayStr = toGregorianIsoString(new Date());
    const targetId = userProfile.coupleId || userProfile.uid;
    
    // Trigger celebration / confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });

    // 5) Remove old moving average: settings.cycleLength is retained solely as the initial prior.
    // Recording period start automatically updates history and recomputes Bayesian estimates.
    const updatedSettings: ImpoPeriodSettings = {
      ...settings,
      lastPeriodStartDate: todayStr
    };

    setSettings(updatedSettings);
    localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(updatedSettings));
    localStorage.setItem(`impo_period_configured_${targetId}`, "true");

    const todayLog: ImpoDailyLog = {
      id: `log_${Date.now()}`,
      date: todayStr,
      isPeriodDay: true,
      isPeriodStart: true,
      flow: 'medium',
      moods: ['tired'],
      symptoms: ['cramps'],
      loggedByUid: userProfile.uid,
      loggedByName: userProfile.displayName,
      createdAt: new Date().toISOString()
    };

    const filtered = logs.filter(l => l.date !== todayStr);
    const updatedLogs = [todayLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    setLogs(updatedLogs);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updatedLogs));

    // Persist to Host MySQL & trigger partner sync
    try {
      await fetchFromPhpApi('savePeriodSettings', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        settings: updatedSettings
      });
      await fetchFromPhpApi('savePeriodLog', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        log: todayLog
      });
    } catch (e) {
      console.warn("Host period log save note:", e);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (settings.trackerOwnerUid && !effectiveIsOwner) {
      alert("تنها صاحب ترکر مجاز به تغییر تنظیمات است.");
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
    localStorage.setItem(`impo_period_configured_${targetId}`, "true");

    try {
      await fetchFromPhpApi('savePeriodSettings', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        settings: updatedSettings
      });
    } catch (e) {
      console.warn("Host period settings save error:", e);
    }
  };

  // Save Sharing Settings (Owner only)
  const handleSaveSharingSettings = async (newSharing: PeriodSharingSettings) => {
    setSharing(newSharing);
    const targetId = userProfile.coupleId || userProfile.uid;
    localStorage.setItem(`impo_period_sharing_${targetId}`, JSON.stringify(newSharing));
    try {
      await fetchFromPhpApi('savePeriodSharing', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        sharing: newSharing
      });
    } catch (err) {
      console.warn("Save sharing settings error:", err);
    }
  };

  // Export period data (JSON download)
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetchFromPhpApi('exportMyPeriodData', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid
      });
      if (res && res.status === 'success' && res.data) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `toghrool_period_data_${toGregorianIsoString(new Date())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert(res?.message || "خطا در دریافت فایل خروجی.");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("خطا در برقراری ارتباط با سرور جهت دریافت نسخه پشتیبان.");
    } finally {
      setIsExporting(false);
    }
  };

  // Delete all period health data
  const handleDeleteAllData = async () => {
    const confirm1 = window.confirm("آیا از حذف کامل تمام اطلاعات، لاگ‌ها و تنظیمات قاعدگی خود اطمینان دارید؟ این عمل غیرقابل بازگشت است.");
    if (!confirm1) return;
    const confirm2 = window.confirm("با تایید این پیام، تاریخچه چرخه‌ها و لاگ‌های سلامت شما کاملاً از سرور پاک خواهد شد. ادامه می‌دهید؟");
    if (!confirm2) return;

    setIsDeletingAll(true);
    try {
      const res = await fetchFromPhpApi('deleteMyPeriodData', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid
      });
      if (res && res.status === 'success') {
        const targetId = userProfile.coupleId || userProfile.uid;
        localStorage.removeItem(`impo_period_settings_${targetId}`);
        localStorage.removeItem(`impo_period_logs_${targetId}`);
        localStorage.removeItem(`impo_period_sharing_${targetId}`);
        localStorage.removeItem(`impo_period_configured_${targetId}`);
        setLogs([]);
        setSettings({
          cycleLength: 28,
          periodLength: 5,
          lastPeriodStartDate: toGregorianIsoString(new Date()),
          goalMode: 'track',
          birthDate: '2000-01-01',
          viewMode: 'circular'
        });
        setHasConfigured(false);
        setShowSharingModal(false);
        setShowSettingsModal(false);
        alert("تمام اطلاعات ترکر با موفقیت حذف شد.");
      } else {
        alert(res?.message || "خطا در حذف اطلاعات.");
      }
    } catch (err) {
      console.error("Delete all error:", err);
      alert("خطا در حذف اطلاعات از سرور.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Save Daily Log
  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = userProfile.coupleId || userProfile.uid;

    const newLog: ImpoDailyLog = {
      id: `log_${Date.now()}`,
      date: selectedLogDate,
      isPeriodDay: logFormFlow !== 'none' || logFormIsPeriodStart,
      isPeriodStart: logFormIsPeriodStart,
      flow: effectiveIsOwner ? logFormFlow : 'none',
      moods: effectiveIsOwner ? logFormMoods : [],
      symptoms: effectiveIsOwner ? logFormSymptoms : [],
      discharge: effectiveIsOwner ? logFormDischarge : 'none',
      sex: effectiveIsOwner ? logFormSex : 'none',
      ovulationTestResult: effectiveIsOwner ? logFormOvulationKit : 'none',
      pregnancyTestResult: effectiveIsOwner ? logFormPregnancyTest : 'none',
      sharePregnancyTestWithPartner: effectiveIsOwner ? logFormSharePregnancyTest : false,
      waterGlasses: effectiveIsOwner ? logFormWater : 4,
      notes: effectiveIsOwner ? logFormNotes : '',
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
    }

    const filtered = logs.filter(l => l.date !== selectedLogDate);
    const updatedLogs = [newLog, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    setLogs(updatedLogs);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updatedLogs));

    setShowLogModal(false);

    try {
      if (logFormIsPeriodStart && effectiveIsOwner) {
        await fetchFromPhpApi('savePeriodSettings', {
          coupleId: userProfile.coupleId || '',
          uid: userProfile.uid,
          settings: updatedSettings
        });
      }
      await fetchFromPhpApi('savePeriodLog', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        log: newLog
      });
    } catch (err) {
      console.warn("Host log save notice:", err);
    }
  };

  // Delete Log
  const handleDeleteLog = async (logId: string) => {
    if (!effectiveIsOwner) {
      alert("تنها صاحب ترکر مجاز به حذف لاگ است.");
      return;
    }
    const targetId = userProfile.coupleId || userProfile.uid;
    const targetLog = logs.find(l => l.id === logId);
    const updated = logs.filter(l => l.id !== logId);
    setLogs(updated);
    localStorage.setItem(`impo_period_logs_${targetId}`, JSON.stringify(updated));

    try {
      await fetchFromPhpApi('deletePeriodLog', {
        coupleId: userProfile.coupleId || '',
        uid: userProfile.uid,
        id: logId,
        date: targetLog?.date || ''
      });
    } catch (e) {
      console.warn("Host log delete notice:", e);
    }
  };

  // -------------------------------------------------------------
  // CALCULATIONS FOR 360 DEGREE IMPO CIRCULAR WHEEL
  // -------------------------------------------------------------
  const wheelRadius = 120;
  const wheelStroke = 18;
  const wheelCircumference = 2 * Math.PI * wheelRadius;

  // Degrees and arcs for segments on 360 circle
  const safeCycleLength = cycleStatus.cycleLength;
  const safePeriodLength = cycleStatus.periodLength;
  const safeOvulationDay = cycleStatus.ovulationDay;
  const safeFertileStart = cycleStatus.fertileStartDay;
  const safeFertileEnd = cycleStatus.fertileEndDay;
  const safePmsStart = cycleStatus.pmsStartDay;

  // Angle per day
  const degPerDay = 360 / safeCycleLength;

  // Pointer position on circle (0 deg is top: 12 o'clock)
  const currentPointerAngleDeg = Math.min(360, (cycleStatus.currentCycleDay - 1) * degPerDay);
  const pointerRad = ((currentPointerAngleDeg - 90) * Math.PI) / 180;
  const pointerX = 150 + wheelRadius * Math.cos(pointerRad);
  const pointerY = 150 + wheelRadius * Math.sin(pointerRad);

  // Liquid Wave height calculation (0 to 100%)
  const liquidHeightPercent = cycleStatus.isDelayed 
    ? 90 
    : Math.min(88, Math.max(15, (cycleStatus.currentCycleDay / safeCycleLength) * 85));

  // Partner support message sender
  const handlePartnerPoke = (msg: string) => {
    if (onSendPoke) {
      onSendPoke(msg, 'impo_period_support');
    }
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Partner View Preview Banner for Owner */}
      {isPreviewingAsPartner && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-lg text-xs font-black">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>در حال مشاهده پیش‌نمایش دیدگاه پارتنر — فیلدهای غیرمجاز بر اساس قوانین حریم خصوصی پنهان شده‌اند</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPreviewingAsPartner(false)}
            className="bg-white text-amber-800 px-3 py-1 rounded-xl hover:bg-amber-50 transition-all cursor-pointer font-black shadow-xs"
          >
            خروج از پیش‌نمایش ✕
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* TOP HEADER: BRANDING, GOAL MODE SELECTOR & QUICK BUTTONS */}
      {/* ----------------------------------------------------------------- */}
      <div className="glass-card rounded-3xl p-5 border border-pink-100/80 bg-white/60 backdrop-blur-xl shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-2xl ${partnerRole === 'male' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-indigo-200' : 'bg-gradient-to-tr from-rose-500 to-pink-500 shadow-rose-200'} text-white flex items-center justify-center shadow-md`}>
              {partnerRole === 'male' ? (
                <HeartHandshake className="w-6 h-6 fill-white" />
              ) : (
                <Droplet className="w-6 h-6 fill-white" />
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-800">
                  {partnerRole === 'male' ? "راهنمای همراهی و مراقبت از پارتنر 👨💖" : "تقویم قاعدگی و سلامت من 🌸"}
                </h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  partnerRole === 'male' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-rose-100 text-rose-700 border-rose-200'
                }`}>
                  {settings.goalMode === 'pregnancy' ? 'اقدام به بارداری 👶' : settings.goalMode === 'prevention' ? 'پیشگیری طبیعی 🛡️' : 'پریود ترکر سلامت 🌸'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                {partnerRole === 'male' 
                  ? "اطلاع از وضعیت جسمی و روحی پارتنرتان و راهکارهای عاشقی و همدلی در هر روز چرخه" 
                  : "محاسبه هوشمند چرخه‌های زیستی، تخمک‌گذاری، روزهای باروری و همراهی عاطفی دونفره"
                }
              </p>
            </div>
          </div>

          {/* Quick Buttons differentiated by Partner Role */}
          {partnerRole === 'male' ? (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Care Action for Male Partner */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCareModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer transition-all"
                title="ارسال توجه، محبت و همراهی به پارتنر"
              >
                <Heart className="w-4 h-4 fill-white" />
                ارسال محبت و مراقبت ویژه 💖
              </motion.button>

              {/* Log on behalf of partner (only if allowed) */}
              {sharing.allowPartnerLogging ? (
                <button
                  onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                  className="px-3.5 py-2.5 bg-white/80 hover:bg-white text-slate-700 font-bold text-xs rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  title="ثبت علائم به درخواست پارتنر"
                >
                  <Plus className="w-4 h-4 text-indigo-500" />
                  ثبت به نیابت از پارتنر ✍️
                </button>
              ) : (
                <span className="px-3 py-2 bg-slate-100 text-slate-400 font-bold text-[11px] rounded-2xl border border-slate-200 flex items-center gap-1 cursor-default">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  ثبت لاگ غیرفعال 🔒
                </span>
              )}

              {/* Settings */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2.5 bg-white/80 hover:bg-white text-slate-600 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer transition-all"
                title="تنظیمات چرخه"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Button: Got Period Today */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleQuickGotPeriodToday}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-2xl shadow-md shadow-rose-200 flex items-center gap-2 cursor-pointer transition-all"
                title="ثبت شروع پریود جدید از امروز"
              >
                <Droplet className="w-4 h-4 fill-white" />
                امروز پریود شدم!
              </motion.button>

              {/* Quick Log Button */}
              <button
                onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
                className="px-3.5 py-2.5 bg-white/80 hover:bg-white text-slate-700 font-bold text-xs rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 text-rose-500" />
                ثبت علائم امروز
              </button>

              {/* Sharing & Privacy Button (Owner only) */}
              <button
                type="button"
                onClick={() => setShowSharingModal(true)}
                className="px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-2xl border border-purple-200/80 shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                title="چه چیزی با پارتنرم به اشتراک بگذارم؟"
              >
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                <span>اشتراک با پارتنر 🔒</span>
              </button>

              {/* Settings Modal Button */}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2.5 bg-white/80 hover:bg-white text-slate-600 rounded-2xl border border-slate-200/80 shadow-sm cursor-pointer transition-all"
                title="تنظیمات چرخه"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Active Perspective Badge (configured exclusively via Profile) */}
        <div className="flex items-center justify-between gap-3 mt-3 pt-2.5 border-t border-slate-100">
          {partnerRole === 'male' ? (
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <span>👨 💖</span>
              <span>حالت همراهی عاطفی و مراقبت از پارتنر</span>
            </span>
          ) : (
            <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <span>👩 🌸</span>
              <span>حالت ردیابی چرخه سلامت و خودمراقبتی</span>
            </span>
          )}
        </div>

      {/* SUB-TABS NAVIGATION */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-200/50 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'bg-white/50 text-slate-600 hover:bg-white/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            داشبورد چرخه
          </button>

          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'calendar'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'bg-white/50 text-slate-600 hover:bg-white/80'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            تقویم ماهانه
          </button>

          <button
            onClick={() => setActiveSubTab('predictions')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'predictions'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'bg-white/50 text-slate-600 hover:bg-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            پیش‌بینی دوره‌ها
          </button>

          <button
            onClick={() => setActiveSubTab('biorhythm')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'biorhythm'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'bg-white/50 text-slate-600 hover:bg-white/80'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            بیوریتم زیستی
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-rose-500 text-white shadow-sm shadow-rose-200'
                : 'bg-white/50 text-slate-600 hover:bg-white/80'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            تاریخچه علائم ({toPersianDigits(logs.length)})
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 1: MAIN CYCLE DASHBOARD */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Main Visual Card: 360 Degree Impo Wheel or Flat Bar */}
          <div className="glass-card rounded-3xl p-6 border border-white/60 relative overflow-hidden bg-white/70">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${cycleStatus.stageColor.badgeBg}`}>
                <span className="w-2 h-2 rounded-full animate-ping bg-current" />
                {cycleStatus.phaseTitle}
              </span>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setViewMode('circular')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'circular' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  چرخه دایره‌ای
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'flat' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  نمای نواری
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left/Center: Visual Wheel / Bar Representation */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center">
                {viewMode === 'circular' ? (
                  /* ----------------- 360° IMPO CIRCLE WITH LIQUID WAVE ----------------- */
                  <div className="relative w-[300px] h-[300px] flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 300 300">
                      <defs>
                        {/* Gradient for Period */}
                        <linearGradient id="impoPeriodGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F43F5E" />
                          <stop offset="100%" stopColor="#BE123C" />
                        </linearGradient>
                        {/* Gradient for Fertile */}
                        <linearGradient id="impoFertileGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" />
                          <stop offset="100%" stopColor="#6D28D9" />
                        </linearGradient>
                        {/* Gradient for Ovulation */}
                        <linearGradient id="impoOvulationGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#D946EF" />
                          <stop offset="100%" stopColor="#A21CAF" />
                        </linearGradient>
                        {/* Gradient for PMS */}
                        <linearGradient id="impoPmsGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" />
                          <stop offset="100%" stopColor="#D97706" />
                        </linearGradient>
                        {/* Gradient for Follicular */}
                        <linearGradient id="impoFollicularGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#047857" />
                        </linearGradient>

                        {/* Liquid Wave Clip Path */}
                        <clipPath id="circleLiquidClip">
                          <circle cx="150" cy="150" r={wheelRadius - 15} />
                        </clipPath>
                      </defs>

                      {/* Base Track Circle */}
                      <circle
                        cx="150"
                        cy="150"
                        r={wheelRadius}
                        className="stroke-slate-100 fill-white"
                        strokeWidth={wheelStroke}
                      />

                      {/* 1. Period Arc Segment */}
                      <circle
                        cx="150"
                        cy="150"
                        r={wheelRadius}
                        fill="none"
                        stroke="url(#impoPeriodGrad)"
                        strokeWidth={wheelStroke}
                        strokeDasharray={`${(safePeriodLength / safeCycleLength) * wheelCircumference} ${wheelCircumference}`}
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        className="opacity-90"
                      />

                      {/* 2. Fertile Window Arc Segment */}
                      <circle
                        cx="150"
                        cy="150"
                        r={wheelRadius}
                        fill="none"
                        stroke="url(#impoFertileGrad)"
                        strokeWidth={wheelStroke}
                        strokeDasharray={`${((safeFertileEnd - safeFertileStart + 1) / safeCycleLength) * wheelCircumference} ${wheelCircumference}`}
                        strokeDashoffset={`-${((safeFertileStart - 1) / safeCycleLength) * wheelCircumference}`}
                        strokeLinecap="round"
                        className="opacity-80"
                      />

                      {/* 3. PMS Arc Segment */}
                      <circle
                        cx="150"
                        cy="150"
                        r={wheelRadius}
                        fill="none"
                        stroke="url(#impoPmsGrad)"
                        strokeWidth={wheelStroke}
                        strokeDasharray={`${((safeCycleLength - safePmsStart + 1) / safeCycleLength) * wheelCircumference} ${wheelCircumference}`}
                        strokeDashoffset={`-${((safePmsStart - 1) / safeCycleLength) * wheelCircumference}`}
                        strokeLinecap="round"
                        className="opacity-75"
                      />

                      {/* Animated Current Day Progress Glow */}
                      <circle
                        cx="150"
                        cy="150"
                        r={wheelRadius}
                        fill="none"
                        stroke={cycleStatus.stageColor.primary}
                        strokeWidth={wheelStroke + 4}
                        strokeDasharray={`4 ${wheelCircumference}`}
                        strokeDashoffset={`-${((cycleStatus.currentCycleDay - 1) / safeCycleLength) * wheelCircumference}`}
                        className="opacity-40 animate-pulse"
                      />

                      {/* Liquid Wave in Center of Wheel (Impo Cycle Wave) */}
                      <g clipPath="url(#circleLiquidClip)">
                        <rect x="0" y="0" width="300" height="300" fill="#FFF5F7" />
                        
                        {/* Animated Liquid Wave Path */}
                        <motion.path
                          d={`M 0 ${300 - (liquidHeightPercent * 2.8)} Q 75 ${300 - (liquidHeightPercent * 2.8) - 10} 150 ${300 - (liquidHeightPercent * 2.8)} T 300 ${300 - (liquidHeightPercent * 2.8)} L 300 300 L 0 300 Z`}
                          fill={cycleStatus.stageColor.light}
                          animate={{
                            d: [
                              `M 0 ${300 - (liquidHeightPercent * 2.8)} Q 75 ${300 - (liquidHeightPercent * 2.8) - 10} 150 ${300 - (liquidHeightPercent * 2.8)} T 300 ${300 - (liquidHeightPercent * 2.8)} L 300 300 L 0 300 Z`,
                              `M 0 ${300 - (liquidHeightPercent * 2.8)} Q 75 ${300 - (liquidHeightPercent * 2.8) + 10} 150 ${300 - (liquidHeightPercent * 2.8)} T 300 ${300 - (liquidHeightPercent * 2.8)} L 300 300 L 0 300 Z`,
                              `M 0 ${300 - (liquidHeightPercent * 2.8)} Q 75 ${300 - (liquidHeightPercent * 2.8) - 10} 150 ${300 - (liquidHeightPercent * 2.8)} T 300 ${300 - (liquidHeightPercent * 2.8)} L 300 300 L 0 300 Z`
                            ]
                          }}
                          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        />
                      </g>
                    </svg>

                    {/* Floating Glow Pointer for Current Day */}
                    <div 
                      className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all duration-700"
                      style={{
                        backgroundColor: cycleStatus.stageColor.primary,
                        left: `${pointerX - 10}px`,
                        top: `${pointerY - 10}px`
                      }}
                    >
                      <div className="w-full h-full rounded-full animate-ping opacity-60 bg-current" />
                    </div>

                    {/* Center Typography (Exact Impo Style) */}
                    <div className="absolute flex flex-col items-center justify-center text-center p-4 z-10 pointer-events-none">
                      {cycleStatus.diffDays >= 90 ? (
                        <>
                          <span className="text-xs font-black text-amber-600">عدم قاعدگی طولانی</span>
                          <span className="text-lg font-black text-slate-800 mt-1">مشورت با پزشک</span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">بیش از ۹۰ روز</span>
                        </>
                      ) : cycleStatus.diffDays >= 45 ? (
                        <>
                          <span className="text-xs font-black text-rose-500">پایان دوره انتظار</span>
                          <span className="text-lg font-black text-slate-800 mt-1">ثبت پریود جدید</span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">{toPersianDigits(cycleStatus.diffDays)} روز از شروع قبلی</span>
                        </>
                      ) : cycleStatus.phase === 'due' ? (
                        <>
                          <span className="text-xs font-black text-rose-500 animate-pulse">
                            {partnerRole === 'male' ? 'موعد پریود پارتنر' : 'موعد پریود'}
                          </span>
                          <span className="text-3xl font-black text-rose-600 mt-0.5">امروز</span>
                          <span className="text-[10px] font-bold text-slate-500 mt-0.5">زمان مورد انتظار</span>
                        </>
                      ) : cycleStatus.isDelayed ? (
                        <>
                          <span className="text-xs font-black text-red-500 animate-pulse">
                            {partnerRole === 'male' ? 'تاخیر پریود پارتنر' : 'تاخیر پریود'}
                          </span>
                          <span className="text-4xl font-black text-red-600 mt-0.5">
                            {toPersianDigits(cycleStatus.delayedDays)}
                          </span>
                          <span className="text-xs font-black text-slate-500 mt-0.5">روز تاخیر</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-black text-slate-400">
                            {partnerRole === 'male' ? 'روز چرخه پارتنر' : 'روز چرخه'}
                          </span>
                          <span className="text-4xl font-black text-slate-800 tracking-tight mt-0.5">
                            {toPersianDigits(cycleStatus.currentCycleDay)}
                          </span>
                          <span className="text-[11px] font-black text-slate-500 mt-0.5">
                            از {toPersianDigits(safeCycleLength)} روز
                          </span>
                        </>
                      )}

                      <div className="mt-2.5 flex items-center gap-1 text-[10px] font-black text-rose-500 bg-white/90 px-2.5 py-0.5 rounded-full shadow-xs border border-rose-100">
                        <span>
                          {cycleStatus.phase === 'due'
                            ? (partnerRole === 'male' ? 'امروز موعد پریود پارتنر است' : 'امروز موعد مورد انتظار است')
                            : cycleStatus.diffDays >= 90
                            ? 'نیاز به بررسی توسط پزشک'
                            : cycleStatus.diffDays >= 45
                            ? 'پیشنهاد ثبت چرخه جدید'
                            : partnerRole === 'male'
                            ? (cycleStatus.daysUntilNextPeriod > 0 ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز تا موعد بعدی پارتنر` : `${toPersianDigits(cycleStatus.delayedDays)} روز تاخیر`)
                            : (cycleStatus.daysUntilNextPeriod > 0 ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز تا پریود بعدی` : `${toPersianDigits(cycleStatus.delayedDays)} روز تاخیر`)
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ----------------- CALENDAR-BASED STRIP CYCLE VIEW ----------------- */
                  <div className="w-full py-2 space-y-4 text-right">
                    {/* Navigation Header for Calendar Strip */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3.5 rounded-2xl border border-slate-200/60 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-rose-500" />
                          <span>نوار تقویمی چرخه قاعدگی</span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60">
                          {formatPersianDate(stripSelectedDate)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
                        <div className="inline-flex bg-slate-100/90 p-0.5 rounded-xl text-[10px] font-bold border border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => setStripMode('timeline')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              stripMode === 'timeline' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            روزشمار تقویمی
                          </button>
                          <button
                            type="button"
                            onClick={() => setStripMode('cycle')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              stripMode === 'cycle' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            کل روزهای چرخه
                          </button>
                        </div>

                        {stripMode === 'timeline' && (
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              type="button"
                              onClick={() => setStripWeekOffset(w => w - 1)}
                              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all cursor-pointer"
                              title="دوره قبل"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStripWeekOffset(0);
                                setStripSelectedDate(toGregorianIsoString(new Date()));
                              }}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black transition-all cursor-pointer border border-rose-200/60"
                            >
                              امروز 📍
                            </button>
                            <button
                              type="button"
                              onClick={() => setStripWeekOffset(w => w + 1)}
                              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-all cursor-pointer"
                              title="دوره بعد"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Horizontal Scrollable Calendar Day Strip */}
                    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                      <div className="flex items-stretch gap-2 min-w-max p-1">
                        {stripDays.map((dayItem) => {
                          const phaseColor = getPhaseStyle(dayItem.status.phase);
                          return (
                            <button
                              key={dayItem.iso}
                              type="button"
                              onClick={() => setStripSelectedDate(dayItem.iso)}
                              className={`w-20 p-2.5 rounded-2xl flex flex-col items-center justify-between transition-all cursor-pointer border text-center relative ${
                                dayItem.isSelected
                                  ? 'ring-3 ring-rose-400 ring-offset-2 scale-105 z-10 shadow-md ' + phaseColor.selectedBg
                                  : phaseColor.cardBg + ' hover:scale-102 hover:shadow-xs'
                              }`}
                            >
                              {dayItem.isToday && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
                                  امروز
                                </span>
                              )}

                              <span className="text-[10px] font-bold opacity-80 mb-0.5">
                                {dayItem.weekday}
                              </span>

                              <span className="text-lg font-black my-0.5">
                                {toPersianDigits(dayItem.jd)}
                              </span>

                              <span className="text-[9px] font-bold opacity-75">
                                {JALALI_MONTHS[dayItem.jm - 1]}
                              </span>

                              {/* Phase Badge */}
                              <div className={`mt-1.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-0.5 ${phaseColor.badge}`}>
                                <span>{phaseColor.icon}</span>
                                <span>{phaseColor.shortLabel}</span>
                              </div>

                              <span className="text-[8px] font-bold text-slate-400 mt-1">
                                روز {toPersianDigits(dayItem.status.currentCycleDay)}
                              </span>

                              {dayItem.hasLog && (
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 absolute bottom-1 right-1" title="یادداشت ثبت شده" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Day Inspector Card */}
                    <div className="bg-white/90 p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-black text-slate-800">
                            📅 {formatPersianDate(stripSelectedDate)}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${stripSelectedStatus.stageColor.badgeBg}`}>
                            {stripSelectedStatus.phaseTitle}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">
                            روز {toPersianDigits(stripSelectedStatus.currentCycleDay)} از چرخه {toPersianDigits(stripSelectedStatus.cycleLength)} روزه
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenLogModal(stripSelectedDate)}
                            className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>ثبت یا ویرایش علائم ✍️</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {stripSelectedStatus.stageDescription}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">احتمال بارداری در این تاریخ:</span>
                          <span className="text-xs font-black text-purple-700 flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5" />
                            {stripSelectedStatus.chanceOfPregnancy}
                          </span>
                        </div>

                        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">توصیه خودمراقبتی:</span>
                          <span className="text-xs font-bold text-slate-700 line-clamp-2">
                            {stripSelectedStatus.selfCareTip}
                          </span>
                        </div>

                        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">راهنمای پارتنر:</span>
                          <span className="text-xs font-bold text-slate-700 line-clamp-2">
                            {stripSelectedStatus.partnerTip}
                          </span>
                        </div>
                      </div>

                      {/* Logged details if any */}
                      {(() => {
                        const dayLog = logs.find(l => l.date === stripSelectedDate);
                        if (!dayLog) return null;
                        return (
                          <div className="bg-pink-50/60 p-3 rounded-2xl border border-pink-100/70 text-xs space-y-1.5">
                            <span className="font-black text-pink-700 block text-[11px]">علائم و حالات ثبت‌شده در این روز:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {dayLog.flow && dayLog.flow !== 'none' && (
                                <span className="bg-white px-2 py-0.5 rounded-lg border border-pink-200 text-pink-700 font-bold text-[10px]">
                                  خونریزی: {FLOW_OPTIONS.find(f => f.id === dayLog.flow)?.label || dayLog.flow}
                                </span>
                              )}
                              {(dayLog.moods || []).map(m => (
                                <span key={m} className="bg-white px-2 py-0.5 rounded-lg border border-purple-200 text-purple-700 font-bold text-[10px]">
                                  {MOOD_OPTIONS.find(x => x.id === m)?.label || m}
                                </span>
                              ))}
                              {(dayLog.symptoms || []).map(s => (
                                <span key={s} className="bg-white px-2 py-0.5 rounded-lg border border-amber-200 text-amber-700 font-bold text-[10px]">
                                  {SYMPTOM_OPTIONS.find(x => x.id === s)?.label || s}
                                </span>
                              ))}
                              {dayLog.notes && (
                                <p className="w-full text-slate-600 mt-1 font-medium bg-white/80 p-2 rounded-xl text-[11px]">
                                  یادداشت: {dayLog.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Color Legend (Impo Phase Palette) */}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[10px] font-black text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    قاعدگی ({toPersianDigits(safePeriodLength)} روز)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    فاز امن / فولیکولار
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    پنجره باروری
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
                    روز تخمک‌گذاری (روز {toPersianDigits(safeOvulationDay)})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    دوران PMS
                  </span>
                </div>
              </div>

              {/* Right: Detailed Status Cards & Insights (Differentiated by Role) */}
              <div className="lg:col-span-6 space-y-4 text-right">
                {cycleStatus.diffDays >= 90 ? (
                  /* ================= 90+ DAYS CEILING: ONLY DOCTOR MESSAGE ================= */
                  <div className="bg-amber-50/90 border-2 border-amber-300 rounded-3xl p-6 text-right shadow-sm space-y-3">
                    <div className="flex items-center gap-2.5 text-amber-900 font-black text-base">
                      <span className="text-2xl">🩺</span>
                      <span>پیام سلامت: ضرورت مشورت با پزشک</span>
                    </div>
                    <p className="text-sm text-amber-900 font-bold leading-relaxed">
                      اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.
                    </p>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      طولانی شدن عدم قاعدگی نیازمند بررسی دقیق هورمونی و سونوگرافی توسط متخصص زنان است.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleQuickGotPeriodToday}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                      >
                        در صورت شروع پریود، همین حالا ثبتش کن 🩸
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {cycleStatus.diffDays >= 45 && (
                      /* ================= 45-89 DAYS CEILING CARD ================= */
                      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200 rounded-3xl p-5 text-right shadow-sm space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-black text-rose-900 flex items-center gap-1.5">
                              <CalendarIcon className="w-4 h-4 text-rose-600" />
                              پریودت شروع شده؟ همین حالا ثبتش کن
                            </h4>
                            <p className="text-[11px] text-rose-700 font-medium mt-1">
                              {toPersianDigits(cycleStatus.diffDays)} روز از موعد شروع قبلی سپری شده است.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleQuickGotPeriodToday}
                            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer self-start sm:self-auto shrink-0"
                          >
                            ثبت پریود امروز 🩸
                          </button>
                        </div>
                        <div className="pt-2 border-t border-rose-200/60">
                          <p className="text-xs text-slate-700 font-bold leading-relaxed">
                            اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.
                          </p>
                        </div>
                      </div>
                    )}

                    {partnerRole === 'male' ? (
                      /* ================= MALE COMPANION VIEW ================= */
                      <>
                        {/* Companion Status Card */}
                        <div className="bg-white/85 p-5 rounded-3xl border border-indigo-100 shadow-sm space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              {sharing.sharePhase ? `وضعیت جسمی و روحی پارتنر در روز ${toPersianDigits(cycleStatus.currentCycleDay)} چرخه` : "وضعیت روزانه پارتنر"}
                            </h3>
                            <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                              {sharing.sharePhase ? cycleStatus.phaseTitle : "محرمانه 🔒"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {sharing.sharePhase ? (
                              cycleStatus.phase === 'period' ? (
                                "بدن پارتنر شما در حال خونریزی ماهانه است. احساس گرفتگی‌های عضلانی شکم و کمر، افت آهن و خستگی در این روزها شایع است. او بیش از هر چیز به استراحت، گرم نگه داشتن بدن و حمایت بدون قید و شرط شما نیاز دارد."
                              ) : cycleStatus.phase === 'due' ? (
                                "امروز موعد مورد انتظار برای شروع پریود پارتنر شماست. ممکن است علائمی از خستگی، حساسیت عاطفی یا گرفتگی داشته باشد. با آرامش و محبت، فضایی آرام برای او مهیا کنید."
                              ) : cycleStatus.phase === 'delayed' ? (
                                `پریود پارتنر شما ${toPersianDigits(cycleStatus.delayedDays)} روز به تاخیر افتاده است. استرس و نوسانات هورمونی شایع‌ترین علل هستند. آرامش‌بخش‌ترین تکیه‌گاه او باشید.`
                              ) : cycleStatus.phase === 'pms' ? (
                                "پارتنر شما در روزهای حساس PMS (پیش‌قاعدگی) قرار دارد. به دلیل تغییرات هورمونی، احساس دل‌نازکی، کم‌حوصلگی ناگهانی یا اضطراب کاملاً طبیعی است. درک و آرامش شما در این روزها معجزه می‌کند."
                              ) : cycleStatus.phase === 'ovulation' ? (
                                "پارتنر شما در اوج روز تخمک‌گذاری و شادابی این ماه است. زمان طلایی برای خلق لحظات شیرین، شام دونفره و ابراز عشق عمیق."
                              ) : cycleStatus.phase === 'fertile' ? (
                                "پارتنر شما در پنجره باروری قرار دارد. سطح انرژی بدنی او رو به اوج است."
                              ) : (
                                "پارتنر شما در فاز پرانرژی و باانگیزه قرار دارد. زمان عالی برای ورزش، پیاده‌روی دونفره و تفریحات مشترک."
                              )
                            ) : (
                              "پارتنر شما نمایش فازهای چرخه را خصوصی‌سازی کرده است. با آرامش، احترام به حریم خصوصی و ابراز محبت همیشگی، همراه و تکیه‌گاه او باشید."
                            )}
                          </p>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                        <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">شانس باروری پارتنر:</span>
                          <span className="text-xs font-black text-indigo-700 flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5" />
                            {sharing.shareFertileWindow ? cycleStatus.chanceOfPregnancy : "محرمانه 🔒"}
                          </span>
                        </div>

                        <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/60">
                          <span className="text-[10px] font-bold text-slate-500 block mb-0.5">موعد بعدی پریود پارتنر:</span>
                          <span className="text-xs font-black text-purple-700">
                            {sharing.shareNextPeriod 
                              ? (cycleStatus.daysUntilNextPeriod > 0 ? `${toPersianDigits(cycleStatus.daysUntilNextPeriod)} روز دیگر` : 'هم‌اکنون در موعد')
                              : "محرمانه 🔒"
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Golden Companion Empathy Guide */}
                    <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/90 p-4.5 rounded-3xl border border-indigo-100/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-indigo-600" />
                          راهنمای طلایی همراهی امروز 🌟 (چگونه بهترین همراه باشیم؟):
                        </h4>
                        <span className="text-[10px] font-bold text-indigo-600 bg-white/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                          توصیه تخصصی ایمپو
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-950 leading-relaxed font-semibold">
                        {sharing.sharePhase 
                          ? cycleStatus.partnerTip 
                          : "با همدلی، صبوری و احترام به فضای شخصی، بدون استرس در کنار پارتنرتان باشید. احساس امنیت عاطفی بهترین هدیه شما در این روزهاست."
                        }
                      </p>
                    </div>

                    {/* Quick Care Actions (1-Click Pokes for Male Partner) */}
                    <div className="bg-white/85 p-4 rounded-3xl border border-slate-100 shadow-xs space-y-2.5">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        اقدام سریع مراقبت و توجه (با یک کلیک برای پارتنر ارسال می‌شود):
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePartnerPoke("برات یک فنجان دمنوش گرم و نبات آماده کنم عزیزم؟ ☕")}
                          className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl text-[11px] font-bold text-rose-800 flex items-center gap-1.5 transition-all cursor-pointer text-right"
                        >
                          <span>☕</span>
                          <span>پیشنهاد دمنوش گرم</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePartnerPoke("کیسه آب گرم و جای استراحتت آماده‌ست قشنگم، بیا دراز بکش 🛋️")}
                          className="p-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200/60 rounded-xl text-[11px] font-bold text-purple-800 flex items-center gap-1.5 transition-all cursor-pointer text-right"
                        >
                          <span>🛋️</span>
                          <span>کیسه آب گرم و استراحت</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePartnerPoke("شکلات و خوراکی‌های مورد علاقه‌ت رو برات خریدم نوش جونت 🍫")}
                          className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-xl text-[11px] font-bold text-amber-800 flex items-center gap-1.5 transition-all cursor-pointer text-right"
                        >
                          <span>🍫</span>
                          <span>شکلات و تنقلات محبوب</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowCareModal(true)}
                          className="p-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 rounded-xl text-[11px] font-bold text-indigo-800 flex items-center gap-1.5 transition-all cursor-pointer text-right"
                        >
                          <span>💌</span>
                          <span>ارسال پیام دلگرمی ویژه</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ================= FEMALE HEALTH VIEW ================= */
                  <>
                    <div className="bg-white/80 p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-rose-500" />
                          وضعیت بیولوژیکی امروز شما
                        </h3>
                        <span className="text-[11px] font-black text-slate-400">
                          {formatPersianDate(toGregorianIsoString(new Date()))}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {cycleStatus.stageDescription}
                      </p>

                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">احتمال بارداری امروز:</span>
                          <span className="text-xs font-black text-purple-700 flex items-center gap-1">
                            <Baby className="w-3.5 h-3.5" />
                            {cycleStatus.chanceOfPregnancy}
                          </span>
                        </div>

                        <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 block mb-0.5">روز تخمک‌گذاری شما:</span>
                          <span className="text-xs font-black text-fuchsia-700">
                            روز {toPersianDigits(safeOvulationDay)} چرخه
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Self Care & Nutrition Tip */}
                    <div className="bg-gradient-to-r from-rose-50/70 to-pink-50/70 p-4 rounded-2xl border border-rose-100 space-y-1.5">
                      <h4 className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-rose-600" />
                        توصیه خودمراقبتی و تغذیه امروز:
                      </h4>
                      <p className="text-[11px] text-rose-700 leading-relaxed font-medium">
                        {cycleStatus.selfCareTip} {cycleStatus.nutritionTip}
                      </p>
                    </div>

                    {/* Partner Care Insight (Special Couples Sync Feature) */}
                    <div className="bg-gradient-to-r from-purple-50/70 to-indigo-50/70 p-4 rounded-2xl border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <HeartHandshake className="w-3.5 h-3.5 text-purple-600" />
                          همدلی پارتنر (نسخه همراه):
                        </h4>
                        <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                          همگام دونفره 💖
                        </span>
                      </div>

                      <p className="text-[11px] text-purple-700 leading-relaxed font-medium">
                        {cycleStatus.partnerTip}
                      </p>

                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() => handlePartnerPoke(`عزیزم، امروز در ${cycleStatus.phaseTitle} هستی؛ مراقب خودت باش 🌸`)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <MessageCircleHeart className="w-3 h-3" />
                          ارسال پیام همدلی به همسر
                        </button>
                      </div>
                    </div>
                  </>
                )}
                </>
              )}
              </div>
            </div>
          </div>

          {/* Quick Logs Summary Bar */}
          <div className="glass-card rounded-3xl p-5 border border-white/60 bg-white/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div>
                <h4 className="text-xs font-black text-slate-800">ثبت احساسات، دردها و علائم فیزیکی</h4>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                  ثبت روزانه به الگوریتم ایمپو کمک می‌کند تا پیش‌بینی دقیق‌تری از چرخه‌ها و دردهای شما به دست آورد.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
            >
              ثبت وضعیت امروز
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 2: JALALI MONTHLY CALENDAR (WITH IMPO PHASE DOTS) */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'calendar' && (
        <div className="glass-card rounded-3xl p-6 border border-white/60 bg-white/70 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (calendarMonth === 1) {
                    setCalendarMonth(12);
                    setCalendarYear(y => y - 1);
                  } else {
                    setCalendarMonth(m => m - 1);
                  }
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
              <h3 className="text-base font-black text-slate-800">
                {JALALI_MONTHS[calendarMonth - 1]} {toPersianDigits(calendarYear)}
              </h3>
              <button
                onClick={() => {
                  if (calendarMonth === 12) {
                    setCalendarMonth(1);
                    setCalendarYear(y => y + 1);
                  } else {
                    setCalendarMonth(m => m + 1);
                  }
                }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <button
              onClick={() => {
                setCalendarYear(todayJy);
                setCalendarMonth(todayJm);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              برو به ماه جاری
            </button>
          </div>

          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 pb-2 border-b border-slate-100">
            {JALALI_WEEKDAYS.map(day => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Calendar Days Grid */}
          {(() => {
            const daysInMonth = getDaysInJalaliMonth(calendarYear, calendarMonth);
            const [firstGy, firstGm, firstGd] = jalaliToGregorian(calendarYear, calendarMonth, 1);
            const firstDateGregorian = new Date(firstGy, firstGm - 1, firstGd);
            // In JavaScript: Sunday=0, Monday=1, ..., Saturday=6
            // In Iran: Saturday is index 0
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
              <div className="grid grid-cols-7 gap-2">
                {daysArray.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty_${idx}`} className="h-16" />;
                  }

                  const [gy, gm, gd] = jalaliToGregorian(calendarYear, calendarMonth, day);
                  const cellDate = new Date(gy, gm - 1, gd);
                  const cellIso = toGregorianIsoString(cellDate);
                  const isToday = cellIso === toGregorianIsoString(new Date());

                  // Cycle calculations for this specific date
                  const diffFromStart = daysBetween(settings.lastPeriodStartDate, cellDate);
                  
                  let cellCycleDay = 0;
                  if (diffFromStart >= 0) {
                    cellCycleDay = (diffFromStart % safeCycleLength) + 1;
                  }

                  const isPeriodDay = cellCycleDay >= 1 && cellCycleDay <= safePeriodLength;
                  const isOvulationDay = cellCycleDay === safeOvulationDay;
                  const isFertileDay = cellCycleDay >= safeFertileStart && cellCycleDay <= safeFertileEnd;
                  const isPmsDay = cellCycleDay >= safePmsStart && cellCycleDay <= safeCycleLength;

                  const hasLog = logs.some(l => l.date === cellIso);

                  return (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleOpenLogModal(cellIso)}
                      className={`h-16 p-1.5 rounded-2xl flex flex-col justify-between items-center transition-all cursor-pointer border ${
                        isToday 
                          ? 'border-rose-500 bg-rose-50/50 shadow-sm' 
                          : 'border-slate-100 hover:border-pink-200 bg-white/70'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between text-[11px] font-black text-slate-700">
                        <span>{toPersianDigits(day)}</span>
                        {isToday && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                      </div>

                      {/* Phase Dot Indicators */}
                      <div className="flex items-center gap-1">
                        {isPeriodDay && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" title="قاعدگی" />
                        )}
                        {isOvulationDay && (
                          <span className="w-2 h-2 rounded-full bg-fuchsia-500" title="تخمک‌گذاری" />
                        )}
                        {isFertileDay && !isOvulationDay && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" title="باروری" />
                        )}
                        {isPmsDay && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="PMS" />
                        )}
                        {hasLog && (
                          <span className="w-1 h-1 rounded-full bg-cyan-500" title="گزارش ثبت‌شده" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}

          {/* Calendar Help Legend */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
            <span className="font-bold">راهنمای رنگ‌های تقویم:</span>
            <div className="flex flex-wrap gap-4 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                روزهای خونریزی قاعدگی
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-500" />
                تخمک‌گذاری
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                پنجره باروری
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                سندرم PMS
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                علائم ثبت‌شده
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 3: FUTURE CYCLE PREDICTIONS */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'predictions' && (
        <div className="glass-card rounded-3xl p-6 border border-white/60 bg-white/70 space-y-6 text-right">
          {cyclePrediction.isPregnant ? (
            /* 4) Positive Pregnancy Banner */
            <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border-2 border-purple-200 rounded-3xl p-6 text-right shadow-sm space-y-3">
              <div className="flex items-center gap-2.5 text-purple-900 font-black text-base">
                <span className="text-2xl">🌸🤰</span>
                <span>تبریک و وضعیت بارداری</span>
              </div>
              <p className="text-sm text-purple-900 font-bold leading-relaxed">
                {cyclePrediction.pregnancyMessage || "تست بارداری مثبت ثبت شده است. پیش‌بینی دوره‌های قاعدگی بعدی متوقف شد."}
              </p>
              <p className="text-xs text-purple-800 font-medium leading-relaxed">
                جهت آغاز مراقبت‌های دوران بارداری و تعیین سن دقیق بارداری با پزشک متخصص مشورت نمایید.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 p-4 rounded-2xl border border-pink-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    پیش‌بینی دوره‌های آتی قاعدگی و باروری (بر مبنای بازه)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {cyclePrediction.confidence === 'low'
                      ? "دقت برآورد اولیه است؛ بعد از ثبت چند چرخه‌ی دیگر دقیق‌تر می‌شود."
                      : cyclePrediction.confidence === 'medium'
                      ? "برآورد با دقت متوسط بر اساس تاریخچه چرخه‌های قبلی شما."
                      : "برآورد با دقت بالا بر اساس نظم منظم چرخه‌های ثبت‌شده شما."}
                  </p>
                </div>
                <div className="self-start sm:self-auto shrink-0">
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                    cyclePrediction.confidence === 'high'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : cyclePrediction.confidence === 'medium'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {cyclePrediction.confidence === 'high' ? 'دقت بالا 🎯' : cyclePrediction.confidence === 'medium' ? 'دقت متوسط 📊' : 'برآورد اولیه ⏳'}
                  </span>
                </div>
              </div>

              {cyclePrediction.hasOvulationPeakSignal && (
                <div className="bg-purple-50/90 border border-purple-200 text-purple-900 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <span>🎯</span>
                  <span>کیت تخمک‌گذاری با نتیجه پیک (LH Peak) ثبت شده است؛ تاریخ تخمک‌گذاری و پریود بعدی بر این اساس دقیق‌سازی شدند.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictions.map((p) => (
                  <div 
                    key={p.cycleIndex} 
                    className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm relative overflow-hidden space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                        {p.cycleIndex === 1 && p.isDelayed ? "دوره جاری (دارای تاخیر)" : `دوره ${toPersianDigits(p.cycleIndex)} آینده`}
                      </span>
                      <span className="text-[11px] font-black">
                        {p.isDelayed ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                            {toPersianDigits(p.delayedDays)} روز تاخیر ⚠️
                          </span>
                        ) : p.daysUntilStart === 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                            امروز (موعد پریود)
                          </span>
                        ) : p.daysUntilStart > 0 ? (
                          <span className="text-slate-500">
                            {toPersianDigits(p.daysUntilStart)} روز دیگر
                          </span>
                        ) : (
                          <span className="text-slate-400">نزدیک</span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">بازه شروع پریود:</span>
                        <span className="font-black text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                          {p.startDateRangePersian || p.startDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">بازه تخمک‌گذاری:</span>
                        <span className="font-black text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-md border border-fuchsia-100">
                          {p.ovulationDateRangePersian || p.ovulationDatePersian}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-bold">پنجره باروری:</span>
                        <span className="font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          {p.fertileWindowStartPersian} الی {p.fertileWindowEndPersian}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      {p.cycleIndex === 1
                        ? "بازه اطمینان ۸۰٪ بیزی بر اساس پراکندگی دوره‌های قبلی 🌸"
                        : "بازه دوره ۲ با ضریب √۲ جهت لحاظ افزایش عدم قطعیت آینده 🌸"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 4: BIORHYTHM ANALYSIS (IMPO EXCLUSIVE) */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'biorhythm' && (
        <div className="glass-card rounded-3xl p-6 border border-white/60 bg-white/70 space-y-6 text-right">
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              آنالیز بیوریتم زیستی امروز (Biorhythm)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              محاسبه موج‌های بیولوژیک طبیعی انسان از روی تاریخ تولد برای درک بهتر سطح انرژی، نوسان خلق و تمرکز فکری:
            </p>
          </div>

          {biorhythm ? (
            <div className="space-y-6">
              {/* Three Rhythms Progress Bars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Physical Rhythm */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      ریتم فیزیکی (۲۳ روزه)
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      %{toPersianDigits(Math.abs(biorhythm.physical))} {biorhythm.physical >= 0 ? 'مثبت' : 'منفی'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${biorhythm.physical >= 0 ? 'bg-emerald-500' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(100, Math.max(10, (biorhythm.physical + 100) / 2))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    قدرت عضلانی، انرژی بدنی، مقاومت در برابر درد و هماهنگی حرکتی.
                  </p>
                </div>

                {/* 2. Emotional Rhythm */}
                <div className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      ریتم احساسی (۲۸ روزه)
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      %{toPersianDigits(Math.abs(biorhythm.emotional))} {biorhythm.emotional >= 0 ? 'مثبت' : 'منفی'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${biorhythm.emotional >= 0 ? 'bg-rose-500' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, Math.max(10, (biorhythm.emotional + 100) / 2))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    روحیه، خوش‌بینی، عواطف و پذیرش عاطفی در رابطه با پارتنر.
                  </p>
                </div>

                {/* 3. Intellectual Rhythm */}
                <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-700 flex items-center gap-1.5">
                      <Sun className="w-4 h-4" />
                      ریتم ذهنی (۳۳ روزه)
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      %{toPersianDigits(Math.abs(biorhythm.intellectual))} {biorhythm.intellectual >= 0 ? 'مثبت' : 'منفی'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${biorhythm.intellectual >= 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}
                      style={{ width: `${Math.min(100, Math.max(10, (biorhythm.intellectual + 100) / 2))}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    تمرکز، سرعت یادگیری، حافظه و قدرت تصمیم‌گیری منطقی.
                  </p>
                </div>
              </div>

              {/* Summary Insight */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <strong>نتیجه‌گیری بیوریتم امروز: </strong>
                {biorhythm.summary}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-white/50 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs text-slate-500">
                برای مشاهده بیوریتم دقیق، لطفاً تاریخ تولد خود را در تنظیمات چرخه وارد کنید.
              </p>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-black"
              >
                تنظیم تاریخ تولد
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 5: SYMPTOMS & LOGS HISTORY */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'history' && (
        <div className="glass-card rounded-3xl p-6 border border-white/60 bg-white/70 space-y-6 text-right">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800">تاریخچه علائم، احوالات و گزارش‌های ثبت‌شده</h3>
              <p className="text-xs text-slate-500 mt-0.5">مشاهده سوابق خونریزی و احساسات گذشته</p>
            </div>
            <button
              onClick={() => handleOpenLogModal(toGregorianIsoString(new Date()))}
              className="px-3.5 py-2 bg-rose-500 text-white rounded-xl text-xs font-black shadow-xs"
            >
              ثبت گزارش جدید
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs bg-white/50 rounded-2xl border border-slate-100">
              هنوز هیچ وضعیتی ثبت نشده است. روی دکمه «ثبت علائم امروز» کلیک کنید.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative text-right"
                >
                  {effectiveIsOwner && (
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="absolute top-3 left-3 p-1 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800">
                      {formatPersianDate(log.date)}
                    </span>
                    {log.isPeriodStart && (
                      <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        🩸 روز اول پریود
                      </span>
                    )}
                    {(effectiveIsOwner || sharing.shareFlow) && log.flow && log.flow !== 'none' && (
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        خونریزی: {FLOW_OPTIONS.find(f => f.id === log.flow)?.label || log.flow}
                      </span>
                    )}
                  </div>

                  {(effectiveIsOwner || sharing.shareMood) && log.moods && log.moods.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.moods.map(m => {
                        const opt = MOOD_OPTIONS.find(x => x.id === m);
                        return (
                          <span key={m} className="text-[10px] font-bold bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg border border-pink-100">
                            {opt?.icon} {opt?.label || m}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareSymptoms) && log.symptoms && log.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {log.symptoms.map(s => {
                        const opt = SYMPTOM_OPTIONS.find(x => x.id === s);
                        return (
                          <span key={s} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                            {opt?.icon} {opt?.label || s}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareSex) && log.sex && log.sex !== 'none' && (
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 inline-block">
                        🔒 رابطه: {SEX_OPTIONS.find(s => s.id === log.sex)?.label || log.sex}
                      </span>
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareTests) && log.ovulationTestResult && log.ovulationTestResult !== 'none' && (
                    <div>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 inline-block">
                        🧪 کیت تخمک‌گذاری: {OVULATION_TEST_OPTIONS.find(o => o.id === log.ovulationTestResult)?.label || log.ovulationTestResult}
                      </span>
                    </div>
                  )}

                  {(effectiveIsOwner || (sharing.shareTests && log.sharePregnancyTestWithPartner)) && log.pregnancyTestResult && log.pregnancyTestResult !== 'none' && (
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 inline-block">
                        👶 بی‌بی‌چک: {PREGNANCY_TEST_OPTIONS.find(p => p.id === log.pregnancyTestResult)?.label || log.pregnancyTestResult}
                      </span>
                    </div>
                  )}

                  {(effectiveIsOwner || sharing.shareNotes) && log.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {log.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 1: SETTINGS & ONBOARDING DIALOG (IMPO STYLE) */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-rose-500" />
                  تنظیمات چرخه و محاسبات ایمپو
                </h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {/* Ownership Card & Permissions Status */}
                <div className="p-3.5 bg-gradient-to-r from-purple-50/70 to-pink-50/70 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-purple-600" />
                      مالکیت ترکر سلامت
                    </span>
                    {isOwner ? (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        👑 شما صاحب ترکر هستید
                      </span>
                    ) : (
                      <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        👨 حالت همراه (مشاهده‌گر)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-950 leading-relaxed font-medium">
                    {isOwner 
                      ? "این ترکر به عنوان ترکر سلامت شخصی شما تنظیم شده است. کلیه لاگ‌ها، علائم و تنظیمات اشتراک‌گذاری با پارتنر منحصراً تحت کنترل شما قرار دارد."
                      : "این ترکر تحت مالکیت و مدیریت پارتنر شماست. شما به عنوان همراه تنها داده‌های مجاز را مشاهده می‌کنید."
                    }
                  </p>

                  {!settings.trackerOwnerUid && (
                    <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-slate-800 block">
                          این ترکر برای من است
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          من صاحب این ترکر خواهم بود و مدیریت کامل دسترسی‌ها با من خواهد بود.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formClaimOwner}
                        onChange={(e) => setFormClaimOwner(e.target.checked)}
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </div>
                  )}
                </div>

                {/* Goal Mode */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">هدف شما از استفاده:</label>
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setFormGoalMode('track')}
                      className={`p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        formGoalMode === 'track' 
                          ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      🌸 ردیابی سلامت
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode('pregnancy')}
                      className={`p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        formGoalMode === 'pregnancy' 
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      👶 اقدام به بارداری
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormGoalMode('prevention')}
                      className={`p-2.5 rounded-xl border transition-all text-center cursor-pointer ${
                        formGoalMode === 'prevention' 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      🛡️ پیشگیری طبیعی
                    </button>
                  </div>
                </div>

                {/* Last Period Start Date */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    تاریخ اولین روز آخرین پریود (شمسی):
                  </label>
                  <JalaliDatePicker
                    value={formLastPeriodDate}
                    onChange={(val) => setFormLastPeriodDate(val)}
                    placeholder="انتخاب اولین روز آخرین پریود به شمسی..."
                  />
                  <span className="text-[10px] text-rose-500 font-bold mt-1 block">
                    تاریخ انتخابی: {formatPersianDate(formLastPeriodDate)}
                  </span>
                </div>

                {/* Cycle and Period Lengths */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      طول دوره (فاصله دو شروع):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="60"
                      required
                      value={formCycleLength}
                      onChange={(e) => setFormCycleLength(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">نرمال: ۲۱ تا ۳۵ روز</span>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      طول خونریزی پریود:
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="15"
                      required
                      value={formPeriodLength}
                      onChange={(e) => setFormPeriodLength(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">معمولاً: ۳ تا ۷ روز</span>
                  </div>
                </div>

                {/* Birth date for Biorhythm */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    تاریخ تولد (برای نمودار بیوریتم ایمپو):
                  </label>
                  <JalaliDatePicker
                    value={formBirthDate}
                    onChange={(val) => setFormBirthDate(val)}
                    placeholder="انتخاب تاریخ تولد شمسی..."
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                  >
                    ذخیره تنظیمات چرخه 🌸
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 2: COMPREHENSIVE DAILY LOG MODAL (SIGNS & SYMPTOMS) */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5 text-right overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-800">ثبت علائم و احوالات روزانه</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    تاریخ: {formatPersianDate(selectedLogDate)}
                  </p>
                </div>
                <button
                  onClick={() => setShowLogModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveDailyLog} className="space-y-4">
                {!effectiveIsOwner && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 font-medium leading-relaxed">
                    شما در حال ثبت لاگ به عنوان همراه هستید. برای حفظ حریم خصوصی پارتنرتان، در این بخش تنها می‌توانید اعلام شروع پریود جدید را ثبت کنید و سایر بخش‌های محرمانه غیرفعال هستند.
                  </div>
                )}

                {/* Period Start Checkbox */}
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-rose-800 block">امروز شروع پریود جدید است؟</span>
                    <span className="text-[10px] text-rose-600 font-medium">با انتخاب این گزینه، چرخه جدید از این تاریخ آغاز می‌شود.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={logFormIsPeriodStart}
                    onChange={(e) => setLogFormIsPeriodStart(e.target.checked)}
                    className="w-5 h-5 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {effectiveIsOwner && (
                  <>
                    {/* Bleeding Flow */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">شدت خونریزی:</label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs font-bold">
                        {FLOW_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormFlow(opt.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              logFormFlow === opt.id 
                                ? 'bg-rose-500 text-white border-rose-600 shadow-xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                      <label className="block text-xs font-black text-slate-700 mb-1.5">احوالات روحی امروز:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {MOOD_OPTIONS.map(opt => {
                          const isSelected = logFormMoods.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setLogFormMoods(logFormMoods.filter(m => m !== opt.id));
                                } else {
                                  setLogFormMoods([...logFormMoods, opt.id]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                                isSelected 
                                  ? 'bg-pink-500 text-white border-pink-600' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                      <label className="block text-xs font-black text-slate-700 mb-1.5">نشانه‌ها و دردهای فیزیکی:</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SYMPTOM_OPTIONS.map(opt => {
                          const isSelected = logFormSymptoms.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setLogFormSymptoms(logFormSymptoms.filter(s => s !== opt.id));
                                } else {
                                  setLogFormSymptoms([...logFormSymptoms, opt.id]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                                isSelected 
                                  ? 'bg-rose-600 text-white border-rose-700' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                      <label className="block text-xs font-black text-slate-700 mb-1.5">وضعیت ترشحات واژن:</label>
                      <select
                        value={logFormDischarge}
                        onChange={(e) => setLogFormDischarge(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        {DISCHARGE_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sex Intimacy */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">رابطه زناشویی امروز:</label>
                      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                        {SEX_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormSex(opt.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              logFormSex === opt.id 
                                ? 'bg-purple-500 text-white border-purple-600' 
                                : 'bg-slate-50 border-slate-200 text-slate-700'
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
                      <label className="block text-xs font-black text-slate-700 mb-1.5">کیت تخمک‌گذاری (LH):</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                        {OVULATION_TEST_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormOvulationKit(opt.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              logFormOvulationKit === opt.id 
                                ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pregnancy Test (بی‌بی‌چک) */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">تست بارداری (بی‌بی‌چک):</label>
                      <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                        {PREGNANCY_TEST_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setLogFormPregnancyTest(opt.id)}
                            className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                              logFormPregnancyTest === opt.id 
                                ? 'bg-rose-500 text-white border-rose-600 shadow-xs' 
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="block text-sm mb-0.5">{opt.icon}</span>
                            <span className="text-[10px]">{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Explicit toggle: Share pregnancy test with partner */}
                      {logFormPregnancyTest !== 'none' && (
                        <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-200 flex items-center justify-between mt-2.5">
                          <div className="pr-1">
                            <span className="text-xs font-black text-purple-900 block">این نتیجه را برای پارتنرم نمایش بده</span>
                            <span className="text-[10px] text-purple-700 font-medium">به صورت پیش‌فرض نتایج تست‌های بارداری کاملاً محرمانه هستند و برای پارتنر ارسال نمی‌شوند مگر اینکه خودتان این گزینه را فعال کنید.</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={logFormSharePregnancyTest}
                            onChange={(e) => setLogFormSharePregnancyTest(e.target.checked)}
                            className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0 mr-2"
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">یادداشت شخصی:</label>
                      <textarea
                        rows={2}
                        value={logFormNotes}
                        onChange={(e) => setLogFormNotes(e.target.value)}
                        placeholder="هر احساس، تجربه یا نکته‌ای از این روز..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </>
                )}

                <div className="pt-3 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                  >
                    ثبت و ذخیره علائم 🌸
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* ----------------------------------------------------------------- */}
      {/* COMPANION CARE & EMPATHY MODAL (FOR MALE PARTNER) */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showCareModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-indigo-100 text-right space-y-4"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      ارسال محبت و مراقبت برای پارتنر 💖
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      یک پیام محبت‌آمیز یا پیشنهاد همدلی بفرستید تا فوراً روی صفحه او نمایش داده شود
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCareModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Selectable Warm Templates */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  انتخاب پیام‌های آماده و دلگرم‌کننده:
                </label>
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
                      className={`p-3 rounded-2xl text-xs font-bold text-right border transition-all cursor-pointer flex items-center gap-2 ${
                        customCareMessage === tmpl
                          ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs"
                          : "bg-slate-50/70 border-slate-100 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>💬</span>
                      <span>{tmpl}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom message textarea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  یا متن دلخواه خودت رو بنویس:
                </label>
                <textarea
                  value={customCareMessage}
                  onChange={(e) => setCustomCareMessage(e.target.value)}
                  placeholder="اینجا کلمات محبت‌آمیز و دلگرم‌کننده‌ات رو بنویس... 💕"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCareModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
                  className="flex-[2] py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>ارسال پیام محبت‌آمیز 💌</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: IRREGULAR CYCLE WARNING DIALOG (EXACT IMPO CLINICAL RULE) */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 text-right"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-black text-slate-800 text-center">توجه درباره چرخه نامنظم</h4>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {warningMessage}
              </p>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-xs"
              >
                متوجه شدم، ادامه بده
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* ----------------------------------------------------------------- */}
      {/* MODAL 4: PERIOD SHARING & PRIVACY CONTROLS (OWNER ONLY) */}
      {/* ----------------------------------------------------------------- */}
      <AnimatePresence>
        {showSharingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 text-right overflow-y-auto max-h-[90vh]"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800">
                      چه چیزی با پارتنرم به اشتراک بگذارم؟ 🔒
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      کنترل اختصاصی حریم خصوصی و داده‌های سلامت
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSharingModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-2xl text-[11px] text-purple-900 leading-relaxed font-medium">
                داده‌های سلامت شما کاملاً خصوصی هستند. با تنظیمات زیر می‌توانید دقیقاً تعیین کنید چه مواردی در حساب کاربری پارتنرتان نمایش داده شود. خاموش کردن هر سوئیچ فوراً دسترسی پارتنر را قطع می‌کند.
              </div>

              {/* 10 Sharing Toggles */}
              <div className="space-y-2 divide-y divide-slate-100">
                {[
                  {
                    key: 'sharePhase',
                    label: 'فاز فعلی چرخه قاعدگی',
                    desc: 'نمایش فازهای پریود، باروری، PMS و فولیکولار به پارتنر',
                    icon: '🌸',
                  },
                  {
                    key: 'shareNextPeriod',
                    label: 'موعد پریود بعدی و روزشمار',
                    desc: 'نمایش تاریخ تقریبی و تعداد روزهای مانده به پریود بعدی',
                    icon: '📅',
                  },
                  {
                    key: 'shareFertileWindow',
                    label: 'پنجره باروری و شانس بارداری',
                    desc: 'نمایش روزهای تخمک‌گذاری و میزان شانس بارداری امروز',
                    icon: '👶',
                  },
                  {
                    key: 'shareFlow',
                    label: 'شدت خونریزی روزانه',
                    desc: 'نمایش لکه‌بینی، خونریزی کم، متوسط یا شدید در تاریخچه',
                    icon: '🩸',
                  },
                  {
                    key: 'shareMood',
                    label: 'احوالات روحی و خلقیات',
                    desc: 'نمایش احساسات ثبت‌شده (شاد، آرام، حساس، خسته و...)',
                    icon: '😊',
                  },
                  {
                    key: 'shareSymptoms',
                    label: 'علائم جسمی و دردهای فیزیکی',
                    desc: 'نمایش دردهای پریود مثل دل‌درد، کمردرد، سردرد و نفخ',
                    icon: '🩹',
                  },
                  {
                    key: 'shareSex',
                    label: 'ثبت رابطه زناشویی',
                    desc: 'نمایش روزهای رابطه صمیمانه ثبت‌شده در تاریخچه (پیش‌فرض خاموش)',
                    icon: '🔒',
                  },
                  {
                    key: 'shareTests',
                    label: 'کیت تخمک‌گذاری و تست بارداری',
                    desc: 'نمایش نتایج تست‌ها (تست بارداری علاوه بر این نیازمند تایید در هر ثبت است)',
                    icon: '🧪',
                  },
                  {
                    key: 'shareNotes',
                    label: 'یادداشت‌های شخصی روزانه',
                    desc: 'نمایش متن یادداشت‌های خصوصی در لاگ‌های روزانه (پیش‌فرض خاموش)',
                    icon: '📝',
                  },
                  {
                    key: 'allowPartnerLogging',
                    label: 'اجازه ثبت لاگ به پارتنر',
                    desc: 'اگر فعال باشد، پارتنر می‌تواند فقط شروع پریود را به نیابت از شما ثبت کند',
                    icon: '✍️',
                  },
                ].map((item) => (
                  <div key={item.key} className="pt-2 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-base leading-none mt-0.5">{item.icon}</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{item.label}</h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                      </div>
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
                        (sharing as any)[item.key] ? 'bg-purple-600 justify-start' : 'bg-slate-200 justify-end'
                      }`}
                    >
                      <motion.div
                        layout
                        className="bg-white w-4 h-4 rounded-full shadow-md"
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action: Preview what partner sees */}
              <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewingAsPartner(true);
                    setShowSharingModal(false);
                  }}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>پیش‌نمایش آنچه پارتنرم می‌بیند 👁️</span>
                </button>

                {/* Data Rights: Export & Delete */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportData}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isExporting ? "در حال دریافت..." : "دانلود کل داده‌های من (JSON)"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingAll}
                    onClick={handleDeleteAllData}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{isDeletingAll ? "در حال حذف..." : "حذف کامل اطلاعات پریود"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
