import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Heart, Plus, Trash2, Calendar as CalendarIcon, BookOpen, Film, ShoppingBag, MapPin, Compass, 
  Send, ExternalLink, Flame, Sparkles, LogOut, CheckCircle, Bell, BellOff, RefreshCw, ChevronLeft, ChevronRight, 
  MessageCircleHeart, X, Edit2, User, Palette, Layers, Pizza, Coffee, Music, Smile, Camera, Gift, Settings,
  Droplet, HeartHandshake, Search, Wallet
} from "lucide-react";

import FinanceSection from "./FinanceSection";
import ImpoPeriodTracker from "./ImpoPeriodTracker";
import JalaliDatePicker from "./JalaliDatePicker";
import { toPersianDigits } from "../utils/jalali";

// @ts-ignore
import { toJalaali, toGregorian, jalaaliMonthLength, isLeapJalaaliYear } from "jalaali-js";

// Gregorian to Jalali (Solar) conversion helpers using official jalaali-js package
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const res = toJalaali(gy, gm, gd);
  return [res.jy, res.jm, res.jd];
}

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

function formatPersianDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);
  if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return dateStr;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

function isJalaliLeapYear(jy: number): boolean {
  return isLeapJalaaliYear(jy);
}

function getJalaliDaysInMonth(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const res = toGregorian(jy, jm, jd);
  return [res.gy, res.gm, res.gd];
}

function getTehranDate(): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return new Date(
      parseInt(partMap.year, 10),
      parseInt(partMap.month, 10) - 1,
      parseInt(partMap.day, 10),
      parseInt(partMap.hour, 10),
      parseInt(partMap.minute, 10),
      parseInt(partMap.second, 10)
    );
  } catch (e) {
    return new Date();
  }
}

function formatTehranDateAndTime(date: Date) {
  const [jy, jm, jd] = gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const weekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
  const weekday = weekdays[date.getDay()];
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  return {
    weekday,
    jalaliDateStr: `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`,
    timeStr
  };
}

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "درد شکم و دل‌پیچه 💥",
  headache: "سردرد 🤕",
  bloating: "نفخ بدنی 🎈",
  backache: "کمردرد 🪵",
  fatigue: "خستگی مفرط 🥱",
  tender_breasts: "حساسیت سینه‌ها 🍒",
  insomnia: "بی‌خوابی 🦉",
};

const MOOD_LABELS: Record<string, string> = {
  happy: "خوشحال و پرانرژی 😊",
  sensitive: "حساس و دل‌نازک 🥺",
  tired: "خسته و بی‌حال 😴",
  crampy: "کلافه و بی‌حوصله 🌪️",
  anxious: "نگران و مضطرب 😰",
  neutral: "معمولی و آرام 😐",
};

const FLOW_LABELS: Record<string, string> = {
  none: "بدون خونریزی ⚪",
  light: "کم / سبک 💧",
  medium: "متوسط 🩸",
  heavy: "زیاد / شدید 🔥",
};
import { auth } from "../firebase";
import { WishlistItem, UserProfile, LinkPreview, Poke, Memory, MemoryComment, MemoryReaction, ImpoPeriodSettings } from "../types";
import { calculateCycleStatus } from "../utils/impoCycleEngine";
import { fetchFromPhpApi, clearAuthSession } from "../apiClient";

interface DashboardProps {
  userProfile: UserProfile;
  onRefreshProfile: () => void;
  onUpdateUserProfile?: (updated: UserProfile) => void;
}

// Preset configurations for adding custom shelves (categories)
const PRESET_ICONS: Record<string, any> = {
  Heart, Sparkles, Compass, MapPin, ShoppingBag, BookOpen, Film, Coffee, Pizza, Music, Palette, Smile, Camera, Gift, Flame
};

const PRESET_ICONS_LIST = [
  { name: "Heart", label: "💖 قلب" },
  { name: "Sparkles", label: "✨ درخشش" },
  { name: "Compass", label: "🧭 سفرهامون" },
  { name: "MapPin", label: "📍 آدرس‌ها" },
  { name: "ShoppingBag", label: "🛍️ خریدنی" },
  { name: "BookOpen", label: "📖 کتاب" },
  { name: "Film", label: "🎬 فیلم و سریال" },
  { name: "Coffee", label: "☕ کافه‌گردی" },
  { name: "Pizza", label: "🍕 غذاگردی" },
  { name: "Music", label: "🎵 آهنگ‌ها" },
  { name: "Palette", label: "🎨 هنری" },
  { name: "Smile", label: "😊 حس خوب" },
  { name: "Camera", label: "📷 عکاسی" },
  { name: "Gift", label: "🎁 کادو" },
  { name: "Flame", label: "🔥 هیجان" }
];

const PRESET_COLORS_LIST = [
  { name: "rose", label: "صورتی رمانتیک", bg: "bg-rose-50", border: "border-rose-100", color: "text-rose-600" },
  { name: "pink", label: "صورتی روشن", bg: "bg-pink-50", border: "border-pink-100", color: "text-pink-600" },
  { name: "emerald", label: "سبز ملایم", bg: "bg-emerald-50", border: "border-emerald-100", color: "text-emerald-600" },
  { name: "blue", label: "آبی آرام", bg: "bg-blue-50", border: "border-blue-100", color: "text-blue-600" },
  { name: "violet", label: "بنفش فانتزی", bg: "bg-violet-50", border: "border-violet-100", color: "text-violet-600" },
  { name: "amber", label: "طلایی گرم", bg: "bg-amber-50", border: "border-amber-100", color: "text-amber-600" },
  { name: "indigo", label: "نیلی تیره", bg: "bg-indigo-50", border: "border-indigo-100", color: "text-indigo-600" },
  { name: "teal", label: "فیروزه‌ای", bg: "bg-teal-50", border: "border-teal-100", color: "text-teal-600" }
];

const PRESET_AVATARS = ["🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🦄", "💖", "✨", "🧸", "🐣", "🥑", "🍕"];

// Default shelves (categories)
const DEFAULT_CATEGORIES = [
  { id: "place", label: "جاهایی که بریم", iconName: "MapPin", color: "emerald", bg: "bg-emerald-50", border: "border-emerald-100", icon: MapPin },
  { id: "buy", label: "خریدنی‌ها", iconName: "ShoppingBag", color: "blue", bg: "bg-blue-50", border: "border-blue-100", icon: ShoppingBag },
  { id: "trip", label: "سفرهامون", iconName: "Compass", color: "violet", bg: "bg-violet-50", border: "border-violet-100", icon: Compass },
  { id: "book", label: "کتاب‌هایی که بخونیم", iconName: "BookOpen", color: "amber", bg: "bg-amber-50", border: "border-amber-100", icon: BookOpen },
  { id: "movie", label: "فیلم‌هایی که ببینیم", iconName: "Film", color: "rose", bg: "bg-rose-50", border: "border-rose-100", icon: Film }
];

// Helper to render beautiful user avatars
const renderAvatar = (profile: UserProfile | null, fallbackLetter = "❤️", sizeClasses = "w-9 h-9") => {
  if (!profile) {
    return (
      <div className={`${sizeClasses} bg-slate-100 rounded-full flex items-center justify-center border border-white/60 shadow-sm text-xs`}>
        {fallbackLetter}
      </div>
    );
  }
  const isEmoji = profile.photoURL && profile.photoURL.length <= 4;
  if (profile.photoURL && !isEmoji) {
    return (
      <img
        src={profile.photoURL}
        alt={profile.displayName}
        className={`${sizeClasses} rounded-full object-cover border-2 border-white shadow-sm`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as any).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=" + profile.uid;
        }}
      />
    );
  } else if (profile.photoURL && isEmoji) {
    return (
      <div className={`${sizeClasses} bg-white/80 rounded-full flex items-center justify-center border-2 border-white shadow-sm text-lg`}>
        {profile.photoURL}
      </div>
    );
  } else {
    const initial = profile.displayName ? profile.displayName.charAt(0) : "💕";
    return (
      <div className={`${sizeClasses} bg-gradient-to-tr from-rose-400 to-pink-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm font-black text-sm`}>
        {initial}
      </div>
    );
  }
};

export default function Dashboard({ userProfile, onRefreshProfile, onUpdateUserProfile }: DashboardProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [pokes, setPokes] = useState<Poke[]>([]);
  const [activeTab, setActiveTab] = useState<string>("wishlist");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Memories states
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoryFormTitle, setMemoryFormTitle] = useState("");
  const [memoryFormDate, setMemoryFormDate] = useState("");
  const [memoryFormContent, setMemoryFormContent] = useState("");
  const [memoryFormImageUrl, setMemoryFormImageUrl] = useState("");
  const [isUploadingMemoryImage, setIsUploadingMemoryImage] = useState(false);
  const [memoryCommentText, setMemoryCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Dynamic state for custom settings
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const isPartnerOnline = partnerProfile
    ? partnerProfile.isOnline === true || (!!partnerProfile.lastActiveAt && (Date.now() - partnerProfile.lastActiveAt < 90000))
    : false;
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [customTabs, setCustomTabs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);

  // Modal controls
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddShelfModal, setShowAddShelfModal] = useState(false);
  const [showAddTabModal, setShowAddTabModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);

  // Profile fields
  const [editDisplayName, setEditDisplayName] = useState(userProfile.displayName || "");
  const [editPhotoURL, setEditPhotoURL] = useState(userProfile.photoURL || "");
  const [editGender, setEditGender] = useState<'female' | 'male'>(userProfile.gender || 'female');
  const [impoSettings, setImpoSettings] = useState<ImpoPeriodSettings | null>(() => {
    try {
      const targetId = userProfile.coupleId || userProfile.uid;
      const cached = localStorage.getItem(`impo_period_settings_${targetId}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [showCycleOnCalendar, setShowCycleOnCalendar] = useState<boolean>(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setEditDisplayName(userProfile.displayName || "");
      setEditPhotoURL(userProfile.photoURL || "");
      if (userProfile.gender) {
        setEditGender(userProfile.gender);
      }
    }
  }, [userProfile.uid, userProfile.displayName, userProfile.photoURL, userProfile.gender, showProfileModal]);

  // Image Crop states
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState<number>(1);
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Memory Image Cropper States (16:9 aspect ratio)
  const [memoryRawImageSrc, setMemoryRawImageSrc] = useState<string | null>(null);
  const [memoryCropImageSrc, setMemoryCropImageSrc] = useState<string | null>(null);
  const [memoryCropScale, setMemoryCropScale] = useState<number>(1);
  const [memoryCropOffset, setMemoryCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingMemoryCrop, setIsDraggingMemoryCrop] = useState(false);
  const [memoryDragStart, setMemoryDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [memoryImageDimensions, setMemoryImageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const memoryCropViewportRef = useRef<HTMLDivElement>(null);

  // Custom category / shelf fields
  const [newShelfLabel, setNewShelfLabel] = useState("");
  const [newShelfIcon, setNewShelfIcon] = useState("Heart");
  const [newShelfColor, setNewShelfColor] = useState("rose");

  // Custom tab fields
  const [newTabTitle, setNewTabTitle] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("✨");

  // Custom tab scrapbook note fields
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteColor, setNewNoteColor] = useState("yellow");

  // Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("place");
  const [newDesc, setNewDesc] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newDate, setNewDate] = useState("");
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<LinkPreview | null>(null);

  // Edit Wish State
  const [showEditWishModal, setShowEditWishModal] = useState(false);
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<string>("place");
  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDate, setEditDate] = useState("");
  const [fetchingEditPreview, setFetchingEditPreview] = useState(false);
  const [editPreviewData, setEditPreviewData] = useState<LinkPreview | null>(null);

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showNotificationAlert, setShowNotificationAlert] = useState<string | null>(null);

  // Custom inline modals for iframe compatibility
  const [customConfirm, setCustomConfirm] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean;
    message: string;
  } | null>(null);

  const triggerConfirm = (message: string, onConfirm: () => void) => {
    setCustomConfirm({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        setCustomConfirm(null);
      }
    });
  };

  const triggerAlert = (message: string) => {
    setCustomAlert({
      isOpen: true,
      message
    });
  };

  // Tehran Time Real-Time Clock & Official Sync State
  const [tehranTime, setTehranTime] = useState<Date | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);

  useEffect(() => {
    // Start with timezone-adjusted local time
    setTehranTime(getTehranDate());

    const syncTime = async () => {
      try {
        const res = await fetch("https://worldtimeapi.org/api/timezone/Asia/Tehran");
        if (res.ok) {
          const data = await res.json();
          const apiTime = new Date(data.datetime);
          const localNow = new Date();
          const offset = apiTime.getTime() - localNow.getTime();
          setTimeOffset(offset);
        }
      } catch (err) {
        console.warn("Failed to sync with WorldTimeAPI, using standard local timezone calculation.", err);
      }
    };
    syncTime();
    const interval = setInterval(syncTime, 10 * 60 * 1000); // Sync offset every 10 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const localNow = new Date();
      const adjusted = new Date(localNow.getTime() + timeOffset);
      
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Tehran",
          year: "numeric", month: "numeric", day: "numeric",
          hour: "numeric", minute: "numeric", second: "numeric",
          hour12: false
        });
        const parts = formatter.formatToParts(adjusted);
        const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
        const tDate = new Date(
          parseInt(partMap.year, 10),
          parseInt(partMap.month, 10) - 1,
          parseInt(partMap.day, 10),
          parseInt(partMap.hour, 10),
          parseInt(partMap.minute, 10),
          parseInt(partMap.second, 10)
        );
        setTehranTime(tDate);
      } catch (e) {
        setTehranTime(adjusted);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [timeOffset]);

  // Calendar State (Jalali)
  const [currentJalaliYear, setCurrentJalaliYear] = useState(() => {
    const today = getTehranDate();
    const [jy] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return jy;
  });
  const [currentJalaliMonth, setCurrentJalaliMonth] = useState(() => {
    const today = getTehranDate();
    const [, jm] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());
    return jm;
  });

  // Period Tracker State
  const [periodSettings, setPeriodSettings] = useState<{
    cycleLength: number;
    periodLength: number;
    lastPeriodStartDate: string;
  } | null>(null);
  const [periodLogs, setPeriodLogs] = useState<any[]>([]);

  // Personalized period settings
  const [userPeriodSettings, setUserPeriodSettings] = useState<{
    uid: string;
    cycleLengthMin: number;
    cycleLengthMax: number;
    cycleLengthTypical: number;
    periodLength: number;
    lastPeriodStartDate: string;
    pmsNotificationEnabled: boolean;
    pmsNotificationDaysBefore: number;
    showPmsPredictions: boolean;
  } | null>(null);
  const [personalUseAdvanced, setPersonalUseAdvanced] = useState<boolean>(false);
  const [personalCycleMin, setPersonalCycleMin] = useState<number>(25);
  const [personalCycleMax, setPersonalCycleMax] = useState<number>(35);
  const [personalCycleTypical, setPersonalCycleTypical] = useState<number>(28);
  const [personalPeriodLength, setPersonalPeriodLength] = useState<number>(5);
  const [personalLastPeriodStartDate, setPersonalLastPeriodStartDate] = useState<string>("");
  const [personalPmsNotificationEnabled, setPersonalPmsNotificationEnabled] = useState<boolean>(true);
  const [personalPmsNotificationDaysBefore, setPersonalPmsNotificationDaysBefore] = useState<number>(2);
  const [personalShowPmsPredictions, setPersonalShowPmsPredictions] = useState<boolean>(true);
  const [settingsModalTab, setSettingsModalTab] = useState<"general" | "advanced">("general");

  // Period Tracker Modal & Form State
  const [showLogPeriodModal, setShowLogPeriodModal] = useState(false);
  const [showPeriodSettingsModal, setShowPeriodSettingsModal] = useState(false);
  const [logFormDate, setLogFormDate] = useState(() => {
    return getTehranDate().toLocaleDateString("en-CA"); // YYYY-MM-DD local format
  });
  const [logFormFlow, setLogFormFlow] = useState<string>("medium");
  const [logFormMood, setLogFormMood] = useState<string>("neutral");
  const [logFormSymptoms, setLogFormSymptoms] = useState<string[]>([]);
  const [logFormNotes, setLogFormNotes] = useState<string>("");
  const [logFormIsPeriodStart, setLogFormIsPeriodStart] = useState<boolean>(false);

  // Settings form fields
  const [settingsFormCycleLength, setSettingsFormCycleLength] = useState<number>(28);
  const [settingsFormPeriodLength, setSettingsFormPeriodLength] = useState<number>(5);
  const [settingsFormLastPeriodStartDate, setSettingsFormLastPeriodStartDate] = useState<string>("");

  // Notification permission check
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // Continuous Data Synchronization with Host PHP API (MySQL)
  useEffect(() => {
    if (!userProfile?.coupleId && !userProfile?.uid) return;
    let isMounted = true;

    const syncWithHost = async () => {
      // 1. Wishlist Items
      if (userProfile.coupleId) {
        try {
          const wishRes = await fetchFromPhpApi('getWishlist', { coupleId: userProfile.coupleId });
          if (isMounted && wishRes && wishRes.status === 'success' && Array.isArray(wishRes.items)) {
            setItems(wishRes.items);
            setLoading(false);
          }
        } catch (e) {}

        // 2. Shared Memories (Persisted in MySQL on Host)
        try {
          const memRes = await fetchFromPhpApi('getMemories', { coupleId: userProfile.coupleId });
          if (isMounted && memRes && memRes.status === 'success' && Array.isArray(memRes.memories)) {
            setMemories(memRes.memories);
          }
        } catch (e) {}

        // 3. Pokes
        try {
          const pokeRes = await fetchFromPhpApi('getPokes', { 
            coupleId: userProfile.coupleId,
            recipientUid: userProfile.uid
          });
          if (isMounted && pokeRes && pokeRes.status === 'success' && Array.isArray(pokeRes.pokes)) {
            const unread = pokeRes.pokes.filter((p: Poke) => !p.read);
            setPokes(unread);
          }
        } catch (e) {}

        // 4. Period Data for Shared Calendar
        try {
          const periodRes = await fetchFromPhpApi('getPeriodData', {
            coupleId: userProfile.coupleId || '',
            uid: userProfile.uid
          });
          if (isMounted && periodRes && periodRes.status === 'success') {
            if (periodRes.settings) {
              setImpoSettings(periodRes.settings);
              setPeriodSettings(periodRes.settings);
              const targetId = userProfile.coupleId || userProfile.uid;
              localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(periodRes.settings));
            }
            if (Array.isArray(periodRes.logs)) {
              setPeriodLogs(periodRes.logs);
            }
          }
        } catch (e) {}
      }

      // 4. Heartbeat & Partner Status
      if (userProfile.uid) {
        try {
          const hbRes = await fetchFromPhpApi('heartbeat', {
            uid: userProfile.uid,
            partnerUid: userProfile.partnerUid || ''
          });
          if (isMounted && hbRes && hbRes.status === 'success' && hbRes.partner) {
            setPartnerProfile(prev => ({
              uid: hbRes.partner.uid,
              email: prev?.email || '',
              displayName: hbRes.partner.displayName || prev?.displayName || 'پارتنر',
              coupleCode: prev?.coupleCode || '',
              partnerEmail: userProfile.email,
              partnerUid: userProfile.uid,
              coupleId: userProfile.coupleId,
              photoURL: hbRes.partner.photoURL,
              isOnline: !!hbRes.partner.isOnline,
              lastActiveAt: hbRes.partner.lastActiveAt
            }));
          }
        } catch (e) {}
      }
    };

    syncWithHost();
    const interval = setInterval(syncWithHost, 4000);
    const handleVis = () => {
      if (document.visibilityState === 'visible') {
        syncWithHost();
      }
    };
    window.addEventListener('focus', syncWithHost);
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', syncWithHost);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [userProfile.coupleId, userProfile.uid, userProfile.partnerUid]);

  // Compute allCategories dynamically
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map(cat => {
      const styles = PRESET_COLORS_LIST.find(col => col.name === cat.color) || PRESET_COLORS_LIST[0];
      const IconComponent = PRESET_ICONS[cat.iconName] || Heart;
      return {
        id: cat.id,
        label: cat.label,
        iconName: cat.iconName,
        color: styles.color,
        bg: styles.bg,
        border: styles.border,
        icon: IconComponent
      };
    })
  ];

  // Sync profile editing inputs when profile updates
  useEffect(() => {
    if (userProfile) {
      setEditDisplayName(userProfile.displayName || "");
      setEditPhotoURL(userProfile.photoURL || "");
    }
  }, [userProfile]);

  // Load Custom Categories (Shelves) from local storage
  useEffect(() => {
    if (!userProfile?.coupleId) return;
    try {
      const stored = localStorage.getItem(`couples_categories_${userProfile.coupleId}`);
      if (stored) {
        setCustomCategories(JSON.parse(stored));
      }
    } catch (e) {}
  }, [userProfile?.coupleId]);

  // Load Custom Tabs from local storage
  useEffect(() => {
    if (!userProfile?.coupleId) return;
    try {
      const stored = localStorage.getItem(`couples_custom_tabs_${userProfile.coupleId}`);
      if (stored) {
        setCustomTabs(JSON.parse(stored));
      }
    } catch (e) {}
  }, [userProfile?.coupleId]);

  // Load Notes inside a Custom Tab from local storage
  useEffect(() => {
    if (!userProfile?.coupleId || !activeTab.startsWith("tab-")) return;
    const tabId = activeTab.replace("tab-", "");
    try {
      const stored = localStorage.getItem(`couples_tab_notes_${userProfile.coupleId}_${tabId}`);
      if (stored) {
        setNotes(JSON.parse(stored));
      } else {
        setNotes([]);
      }
    } catch (e) {}
  }, [userProfile?.coupleId, activeTab]);

  // Load Personal Period Settings from local storage
  useEffect(() => {
    if (!userProfile?.uid) return;
    try {
      const stored = localStorage.getItem(`user_period_settings_${userProfile.uid}`);
      if (stored) {
        const data = JSON.parse(stored);
        setUserPeriodSettings(data);
        setPersonalUseAdvanced(true);
        setPersonalCycleMin(data.cycleLengthMin ?? 25);
        setPersonalCycleMax(data.cycleLengthMax ?? 35);
        setPersonalCycleTypical(data.cycleLengthTypical ?? 28);
        setPersonalPeriodLength(data.periodLength ?? 5);
        setPersonalLastPeriodStartDate(data.lastPeriodStartDate || "");
        setPersonalPmsNotificationEnabled(data.pmsNotificationEnabled ?? true);
        setPersonalPmsNotificationDaysBefore(data.pmsNotificationDaysBefore ?? 2);
        setPersonalShowPmsPredictions(data.showPmsPredictions ?? true);
      }
    } catch (e) {}
  }, [userProfile?.uid]);

  // Handlers for cropping drag / pan
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!cropImageSrc) return;
    setIsDraggingCrop(true);
    setDragStart({
      x: e.clientX - cropOffset.x,
      y: e.clientY - cropOffset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !cropImageSrc) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setCropOffset({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(false);
  };

  const handleMouseLeave = () => {
    setIsDraggingCrop(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cropImageSrc || e.touches.length === 0) return;
    setIsDraggingCrop(true);
    setDragStart({
      x: e.touches[0].clientX - cropOffset.x,
      y: e.touches[0].clientY - cropOffset.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingCrop || !cropImageSrc || e.touches.length === 0) return;
    const newX = e.touches[0].clientX - dragStart.x;
    const newY = e.touches[0].clientY - dragStart.y;
    setCropOffset({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDraggingCrop(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCropImageSrc(reader.result as string);
        setCropScale(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePerformCrop = () => {
    if (!cropImageSrc) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = 180;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.clearRect(0, 0, 180, 180);
    
    const img = new Image();
    img.onload = async () => {
      const w = imageDimensions.width || 240;
      const h = imageDimensions.height || 240;
      
      const visualWidth = w * cropScale;
      const visualHeight = h * cropScale;
      const visualLeft = cropOffset.x - (visualWidth - w) / 2;
      const visualTop = cropOffset.y - (visualHeight - h) / 2;
      
      const factor = 180 / 240;
      
      const canvasLeft = visualLeft * factor;
      const canvasTop = visualTop * factor;
      const canvasWidth = visualWidth * factor;
      const canvasHeight = visualHeight * factor;
      
      ctx.drawImage(img, canvasLeft, canvasTop, canvasWidth, canvasHeight);
      
      try {
        const croppedDataURL = canvas.toDataURL("image/jpeg", 0.85);
        setCropImageSrc(null);
        setIsSavingProfile(true);

        // Upload avatar directly to cPanel host
        const uploadRes = await fetchFromPhpApi('uploadImage', {
          image: croppedDataURL,
          folder: 'avatars'
        });

        if (uploadRes && uploadRes.status === 'success' && uploadRes.url) {
          setEditPhotoURL(uploadRes.url);
          triggerAlert("عکس پروفایل با موفقیت روی هاست آپلود شد! دکمه ذخیره تغییرات را بزنید. 📸✨");
        } else {
          setEditPhotoURL(croppedDataURL);
        }
      } catch (err) {
        console.error("Error cropping/uploading image to host:", err);
      } finally {
        setIsSavingProfile(false);
      }
    };
    img.src = cropImageSrc;
  };

  // Handlers for memory image crop drag / pan (16:9 aspect ratio)
  const handleMemoryCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!memoryCropImageSrc) return;
    setIsDraggingMemoryCrop(true);
    setMemoryDragStart({
      x: e.clientX - memoryCropOffset.x,
      y: e.clientY - memoryCropOffset.y
    });
  };

  const handleMemoryCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingMemoryCrop || !memoryCropImageSrc) return;
    const newX = e.clientX - memoryDragStart.x;
    const newY = e.clientY - memoryDragStart.y;
    setMemoryCropOffset({ x: newX, y: newY });
  };

  const handleMemoryCropMouseUp = () => {
    setIsDraggingMemoryCrop(false);
  };

  const handleMemoryCropTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!memoryCropImageSrc || e.touches.length === 0) return;
    setIsDraggingMemoryCrop(true);
    setMemoryDragStart({
      x: e.touches[0].clientX - memoryCropOffset.x,
      y: e.touches[0].clientY - memoryCropOffset.y
    });
  };

  const handleMemoryCropTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingMemoryCrop || !memoryCropImageSrc || e.touches.length === 0) return;
    const newX = e.touches[0].clientX - memoryDragStart.x;
    const newY = e.touches[0].clientY - memoryDragStart.y;
    setMemoryCropOffset({ x: newX, y: newY });
  };

  const handleMemoryCropTouchEnd = () => {
    setIsDraggingMemoryCrop(false);
  };

  const handlePerformMemoryCrop = () => {
    if (!memoryCropImageSrc) return;

    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 960, 540);

    const img = new Image();
    img.onload = () => {
      const rect = memoryCropViewportRef.current?.getBoundingClientRect();
      const vw = rect?.width || 440;
      const vh = rect?.height || (vw * 9 / 16);

      const iw = memoryImageDimensions.width || vw;
      const ih = memoryImageDimensions.height || vh;

      const visualWidth = iw * memoryCropScale;
      const visualHeight = ih * memoryCropScale;
      const visualLeft = memoryCropOffset.x - (visualWidth - iw) / 2;
      const visualTop = memoryCropOffset.y - (visualHeight - ih) / 2;

      const scaleFactor = 960 / vw;

      const canvasLeft = visualLeft * scaleFactor;
      const canvasTop = visualTop * scaleFactor;
      const canvasWidth = visualWidth * scaleFactor;
      const canvasHeight = visualHeight * scaleFactor;

      ctx.drawImage(img, canvasLeft, canvasTop, canvasWidth, canvasHeight);

      const croppedDataURL = canvas.toDataURL("image/jpeg", 0.9);
      setMemoryFormImageUrl(croppedDataURL);
      setMemoryCropImageSrc(null);
      triggerAlert("تصویر خاطره با موفقیت در نسبت ۱۶:۹ برش داده شد! 📸✨");
    };
    img.src = memoryCropImageSrc;
  };

  // CRUD operations
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = editDisplayName.trim();
    if (!cleanName) {
      triggerAlert("لطفاً نام یا لقب خود را وارد کنید.");
      return;
    }

    setIsSavingProfile(true);

    try {
      let finalPhotoURL = editPhotoURL;
      if (finalPhotoURL && finalPhotoURL.startsWith("data:image/")) {
        try {
          const uploadRes = await fetchFromPhpApi('uploadImage', {
            image: finalPhotoURL,
            folder: 'avatars'
          });
          if (uploadRes && uploadRes.status === 'success' && uploadRes.url) {
            finalPhotoURL = uploadRes.url;
            setEditPhotoURL(finalPhotoURL);
          }
        } catch (uploadErr) {
          console.warn("Avatar upload fallback note:", uploadErr);
        }
      }

      const updatedProfile: UserProfile = {
        ...userProfile,
        displayName: cleanName,
        photoURL: finalPhotoURL,
        gender: editGender
      };

      // 1. Optimistic update to local storage & in-memory state
      try {
        localStorage.setItem("cached_user_profile", JSON.stringify(updatedProfile));
        localStorage.setItem(`impo_partner_role_${userProfile.uid}`, editGender);
        const customSess = localStorage.getItem("custom_user_session");
        if (customSess) {
          const parsed = JSON.parse(customSess);
          localStorage.setItem("custom_user_session", JSON.stringify({
            ...parsed,
            displayName: cleanName,
            photoURL: finalPhotoURL,
            gender: editGender
          }));
        }
      } catch (cacheErr) {
        console.warn("Failed updating local storage cache:", cacheErr);
      }

      if (onUpdateUserProfile) {
        onUpdateUserProfile(updatedProfile);
      }

      // 2. Call PHP backend API (cPanel MySQL)
      try {
        const res = await fetchFromPhpApi('updateProfile', {
          uid: userProfile.uid,
          displayName: cleanName,
          photoURL: finalPhotoURL,
          gender: editGender
        });
        if (res && res.status === 'success' && res.user) {
          localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
          if (onUpdateUserProfile) {
            onUpdateUserProfile(res.user);
          }
        }
      } catch (phpErr) {
        console.warn("PHP API updateProfile error:", phpErr);
      }

      setShowProfileModal(false);
      onRefreshProfile();
      triggerAlert("تغییرات پروفایل با موفقیت ذخیره شد. ✨");
      confetti({
        particleCount: 25,
        spread: 50,
        colors: ["#3b82f6", "#10b981", "#ec4899", "#f59e0b"]
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      triggerAlert("تغییرات پروفایل شما با موفقیت ثبت شد.");
      setShowProfileModal(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUnpairPartner = async () => {
    triggerConfirm(
      "آیا مطمئن هستید که می‌خواهید اتصال خود را با شریکتان قطع کنید؟ در صورت قطع اتصال، تمامی آرزوها و اطلاعات تالار افتخارات حفظ خواهند شد، اما دیگر دسترسی مشترک به آن نخواهید داشت تا زمانی که دوباره جفت شوید.",
      async () => {
        try {
          const currentUid = userProfile.uid;
          const partnerUid = userProfile.partnerUid;
          const coupleId = userProfile.coupleId;

          // PHP API Call
          try {
            await fetchFromPhpApi('unpair', { uid: currentUid });
          } catch (phpErr) {
            console.warn("PHP unpair error:", phpErr);
          }

          const uncoupledProfile: UserProfile = {
            ...userProfile,
            partnerEmail: null,
            partnerUid: null,
            coupleId: null
          };
          localStorage.setItem("cached_user_profile", JSON.stringify(uncoupledProfile));
          if (onUpdateUserProfile) onUpdateUserProfile(uncoupledProfile);

          setShowProfileModal(false);
          onRefreshProfile();
          triggerAlert("اتصال با شریک شما با موفقیت قطع شد. 💔");
        } catch (err) {
          console.error("Error unpairing partner:", err);
          triggerAlert("خطایی در قطع اتصال پیش آمد. دوباره تلاش کنید.");
        }
      }
    );
  };

  const handleSavePeriodSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.coupleId) return;
    try {
      const updated = {
        cycleLength: Number(settingsFormCycleLength) || 28,
        periodLength: Number(settingsFormPeriodLength) || 5,
        lastPeriodStartDate: settingsFormLastPeriodStartDate
      };
      await fetchFromPhpApi('savePeriodSettings', { settings: updated });
      setPeriodSettings(updated);
      setShowPeriodSettingsModal(false);
      triggerAlert("تنظیمات ردیاب عادت ماهانه با موفقیت ذخیره شد. ✨");
      confetti({
        particleCount: 15,
        spread: 30,
        colors: ["#ec4899", "#f43f5e"]
      });
    } catch (err) {
      console.error("Error saving period settings:", err);
      triggerAlert("خطایی در ذخیره تنظیمات رخ داد. مجددا تلاش کنید.");
    }
  };

  const handleSavePersonalPeriodSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    try {
      const personalSettings = {
        uid: userProfile.uid,
        cycleLengthMin: Number(personalCycleMin) || 25,
        cycleLengthMax: Number(personalCycleMax) || 35,
        cycleLengthTypical: Number(personalCycleTypical) || 28,
        periodLength: Number(personalPeriodLength) || 5,
        lastPeriodStartDate: personalLastPeriodStartDate || settingsFormLastPeriodStartDate || "",
        pmsNotificationEnabled: personalPmsNotificationEnabled,
        pmsNotificationDaysBefore: Number(personalPmsNotificationDaysBefore) || 2,
        showPmsPredictions: personalShowPmsPredictions,
      };
      localStorage.setItem(`user_period_settings_${userProfile.uid}`, JSON.stringify(personalSettings));
      setUserPeriodSettings(personalSettings);
      setPersonalUseAdvanced(true);
      setShowPeriodSettingsModal(false);
      triggerAlert("تنظیمات پیشرفته و شخصی شما با موفقیت ذخیره شد. ✨");
      confetti({
        particleCount: 20,
        spread: 35,
        colors: ["#a855f7", "#ec4899"]
      });
    } catch (err) {
      console.error("Error saving personal period settings:", err);
      triggerAlert("خطایی در ذخیره تنظیمات پیشرفته رخ داد. مجدداً تلاش کنید.");
    }
  };

  const handleSavePeriodLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.coupleId) return;
    try {
      const logData = {
        date: logFormDate,
        flow: logFormFlow,
        moods: [logFormMood],
        symptoms: logFormSymptoms,
        notes: logFormNotes,
        isPeriodDay: true,
        isPeriodStart: logFormIsPeriodStart
      };
      await fetchFromPhpApi('savePeriodLog', { log: logData });

      // Automatically update last period start date if marked as start
      if (logFormIsPeriodStart) {
        if (!periodSettings || logFormDate >= (periodSettings.lastPeriodStartDate || '')) {
          await fetchFromPhpApi('savePeriodSettings', {
            settings: {
              cycleLength: periodSettings?.cycleLength || 28,
              periodLength: periodSettings?.periodLength || 5,
              lastPeriodStartDate: logFormDate
            }
          });
        }
      }

      setShowLogPeriodModal(false);
      triggerAlert("وضعیت امروز با موفقیت ثبت و همگام‌سازی شد. 💕");
      confetti({
        particleCount: 20,
        spread: 40,
        colors: ["#ec4899", "#f43f5e"]
      });
    } catch (err) {
      console.error("Error saving period log:", err);
      triggerAlert("خطایی در ثبت وضعیت رخ داد.");
    }
  };

  const handleDeletePeriodLog = async (logId: string) => {
    triggerConfirm("آیا مطمئن هستید که می‌خواهید این گزارش را حذف کنید؟", async () => {
      try {
        await fetchFromPhpApi('deletePeriodLog', { id: logId });
        setPeriodLogs(prev => prev.filter(l => l.id !== logId));
      } catch (err) {
        console.error("Error deleting period log:", err);
      }
    });
  };

  const openLogModalForDate = (dateStr: string) => {
    setLogFormDate(dateStr);
    const existing = periodLogs.find(l => l.date === dateStr);
    if (existing) {
      setLogFormFlow(existing.flow || "medium");
      setLogFormMood(Array.isArray(existing.moods) ? existing.moods[0] : (existing.mood || "neutral"));
      setLogFormSymptoms(existing.symptoms || []);
      setLogFormNotes(existing.notes || "");
      setLogFormIsPeriodStart(existing.isPeriodStart || false);
    } else {
      setLogFormFlow("medium");
      setLogFormMood("neutral");
      setLogFormSymptoms([]);
      setLogFormNotes("");
      setLogFormIsPeriodStart(false);
    }
    setShowLogPeriodModal(true);
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShelfLabel.trim() || !userProfile?.coupleId) return;
    const newCat = {
      id: "cat_" + Date.now(),
      coupleId: userProfile.coupleId,
      label: newShelfLabel,
      iconName: newShelfIcon,
      color: newShelfColor,
      createdAt: new Date().toISOString()
    };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    localStorage.setItem(`couples_categories_${userProfile.coupleId}`, JSON.stringify(updated));
    setNewShelfLabel("");
    setShowAddShelfModal(false);
    confetti({
      particleCount: 20,
      spread: 40,
      colors: ["#10b981", "#6366f1"]
    });
  };

  const handleCreateTab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTabTitle.trim() || !userProfile?.coupleId) return;
    const newTabId = "tab_" + Date.now();
    const newTab = {
      id: newTabId,
      coupleId: userProfile.coupleId,
      title: newTabTitle,
      icon: newTabIcon,
      createdAt: new Date().toISOString()
    };
    const updated = [...customTabs, newTab];
    setCustomTabs(updated);
    localStorage.setItem(`couples_custom_tabs_${userProfile.coupleId}`, JSON.stringify(updated));
    setNewTabTitle("");
    setShowAddTabModal(false);
    setActiveTab(`tab-${newTabId}`);
    confetti({
      particleCount: 30,
      spread: 50,
      colors: ["#a855f7", "#ec4899"]
    });
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim() || !activeTab.startsWith("tab-") || !userProfile?.coupleId) return;
    const tabId = activeTab.replace("tab-", "");
    const newNote = {
      id: "note_" + Date.now(),
      coupleId: userProfile.coupleId,
      tabId: tabId,
      content: newNoteContent,
      color: newNoteColor,
      createdBy: userProfile.uid,
      createdByName: userProfile.displayName,
      photoURL: userProfile.photoURL || "",
      createdAt: new Date().toISOString()
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`couples_tab_notes_${userProfile.coupleId}_${tabId}`, JSON.stringify(updated));
    setNewNoteContent("");
    setShowAddNoteModal(false);
  };

  const handleDeleteCategory = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "آیا مطمئن هستید که می‌خواهید این دسته‌بندی (قفسه) را حذف کنید؟ آرزوهای این قفسه حذف نمی‌شوند اما دسته‌بندی آن‌ها برداشته می‌شود.",
      () => {
        const updated = customCategories.filter(c => c.id !== catId);
        setCustomCategories(updated);
        if (userProfile?.coupleId) {
          localStorage.setItem(`couples_categories_${userProfile.coupleId}`, JSON.stringify(updated));
        }
        if (categoryFilter === catId) {
          setCategoryFilter("all");
        }
      }
    );
  };

  const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerConfirm(
      "آیا مطمئن هستید که می‌خواهید این تب و تمامی یادداشت‌های داخل آن را حذف کنید؟",
      () => {
        const updated = customTabs.filter(t => t.id !== tabId);
        setCustomTabs(updated);
        if (userProfile?.coupleId) {
          localStorage.setItem(`couples_custom_tabs_${userProfile.coupleId}`, JSON.stringify(updated));
        }
        setActiveTab("wishlist");
      }
    );
  };

  const handleDeleteNote = (noteId: string) => {
    triggerConfirm("آیا از حذف این یادداشت مطمئن هستید؟", () => {
      const updated = notes.filter(n => n.id !== noteId);
      setNotes(updated);
      if (userProfile?.coupleId && activeTab.startsWith("tab-")) {
        const tabId = activeTab.replace("tab-", "");
        localStorage.setItem(`couples_tab_notes_${userProfile.coupleId}_${tabId}`, JSON.stringify(updated));
      }
    });
  };

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      triggerAlert("مرورگر شما از اعلان‌ها پشتیبانی نمی‌کند.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      if (permission === "granted") {
        triggerAlert("اعلان‌های مرورگر با موفقیت فعال شدند! 🔔");
      } else {
        triggerAlert("شما دسترسی اعلان‌ها را رد کردید یا مسدود است.");
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      // Fallback for iframe/sandbox where permissions are restricted
      triggerAlert(
        "امکان درخواست اعلان در این محیط (مانند پیش‌نمایش داخل آی‌فریم) وجود ندارد. در صورتی که تمایل دارید، می‌توانید برنامه را در تب جدید باز کنید و امتحان نمایید. 🌐"
      );
    }
  };

  // Preview fetching when URL changes
  useEffect(() => {
    if (!newLink) {
      setPreviewData(null);
      return;
    }

    // Debounce preview fetch
    const timer = setTimeout(async () => {
      setFetchingPreview(true);
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(newLink)}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewData(data);
        }
      } catch (err) {
        console.error("Error fetching link preview:", err);
      } finally {
        setFetchingPreview(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [newLink]);

  // Preview fetching when Edit URL changes
  useEffect(() => {
    if (!editLink) {
      setEditPreviewData(null);
      return;
    }

    if (editingWish && editingWish.link === editLink) {
      setEditPreviewData(editingWish.linkPreview);
      return;
    }

    // Debounce preview fetch
    const timer = setTimeout(async () => {
      setFetchingEditPreview(true);
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(editLink)}`);
        if (res.ok) {
          const data = await res.json();
          setEditPreviewData(data);
        }
      } catch (err) {
        console.error("Error fetching edit link preview:", err);
      } finally {
        setFetchingEditPreview(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [editLink, editingWish]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const itemData = {
        coupleId: userProfile.coupleId,
        title: newTitle,
        category: newCategory,
        description: newDesc,
        link: newLink,
        linkPreview: previewData,
        date: newDate || null,
        progress: 0,
        isCompleted: false,
        completedAt: null,
        createdBy: userProfile.uid,
        createdByName: userProfile.displayName,
        createdAt: new Date().toISOString()
      };

      // 1. Host PHP API (MySQL) call
      const res = await fetchFromPhpApi('addWishlistItem', { item: itemData });
      const newItem: WishlistItem = {
        id: res?.id || `wish_${Date.now()}`,
        ...itemData
      };
      setItems(prev => [newItem, ...prev.filter(i => i.id !== newItem.id)]);

      // Reset form
      setNewTitle("");
      setNewCategory("place");
      setNewDesc("");
      setNewLink("");
      setNewDate("");
      setPreviewData(null);
      setShowAddModal(false);

      // Sparkles effect
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#ec4899", "#f43f5e", "#fb7185"]
      });
    } catch (err) {
      console.error("Error adding item:", err);
    }
  };

  const handleUpdateProgress = async (itemId: string, currentVal: number, step: number) => {
    const newVal = Math.min(100, Math.max(0, currentVal + step));
    const isCompleted = newVal === 100;
    const completedAtStr = isCompleted ? new Date().toISOString() : null;

    // 1. Optimistic local state update
    setItems(prev => prev.map(item => item.id === itemId ? {
      ...item,
      progress: newVal,
      isCompleted: isCompleted,
      completedAt: completedAtStr
    } : item));

    // 2. Host PHP API (MySQL) call
    try {
      await fetchFromPhpApi('updateWishlistItem', {
        id: itemId,
        updates: {
          progress: newVal,
          isCompleted: isCompleted,
          completedAt: completedAtStr
        }
      });
    } catch (e) {}

    if (isCompleted) {
      // Glorious Full Canvas Celebration Confetti (Multi-Phase: Fireworks, Side Cannons, and Pop Bursts)
      const duration = 3.5 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ["#f43f5e", "#ec4899", "#fb7185", "#fbbf24", "#38bdf8", "#a855f7"];

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      // Stage 1: Big Center Splash
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: colors,
        disableForReducedMotion: true
      });

      // Stage 2: Dual Side Cannons
      const streamInterval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(streamInterval);
        }

        confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.85 },
          colors: colors
        });
        confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.85 },
          colors: colors
        });
      }, 50);

      // Stage 3: Random Firework Bursts
      const fireworkInterval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(fireworkInterval);
        }

        confetti({
          particleCount: 35,
          spread: 60,
          origin: { x: randomInRange(0.15, 0.85), y: randomInRange(0.2, 0.5) },
          colors: colors,
          startVelocity: 25,
          disableForReducedMotion: true
        });
      }, 400);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    triggerConfirm("آیا مطمئن هستید که می‌خواهید این مورد را حذف کنید؟", async () => {
      // 1. Optimistic local state update
      setItems(prev => prev.filter(item => item.id !== itemId));

      // Host PHP API (MySQL) call
      try {
        await fetchFromPhpApi('deleteWishlistItem', { id: itemId });
      } catch (e) {}
    });
  };

  const handleOpenEditModal = (item: WishlistItem) => {
    setEditingWish(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditDesc(item.description || "");
    setEditLink(item.link || "");
    setEditDate(item.date || "");
    setEditPreviewData(item.linkPreview || null);
    setShowEditWishModal(true);
  };

  const handleUpdateWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWish || !editTitle.trim()) return;

    const updates = {
      title: editTitle,
      category: editCategory,
      description: editDesc,
      link: editLink,
      linkPreview: editPreviewData,
      date: editDate || null
    };

    // 1. Optimistic local update
    setItems(prev => prev.map(item => item.id === editingWish.id ? { ...item, ...updates } : item));

    // 2. Host PHP API (MySQL) call
    try {
      await fetchFromPhpApi('updateWishlistItem', {
        id: editingWish.id,
        updates: updates
      });
    } catch (e) {}

    setShowEditWishModal(false);
    setEditingWish(null);

    confetti({
      particleCount: 25,
      spread: 50,
      origin: { y: 0.8 },
      colors: ["#ec4899", "#f43f5e", "#fb7185"]
    });
  };

  // Send real-time Poke to Partner
  const handleSendPoke = async (item: WishlistItem) => {
    if (!userProfile.partnerUid) {
      triggerAlert("شریک شما هنوز به حساب متصل نشده است!");
      return;
    }

    const pokeData = {
      coupleId: userProfile.coupleId,
      senderUid: userProfile.uid,
      senderName: userProfile.displayName,
      recipientUid: userProfile.partnerUid,
      message: `منتظر انجام "${item.title}" هستم! 💖`,
      itemId: item.id,
      itemTitle: item.title
    };

    // Host PHP API (MySQL)
    try {
      await fetchFromPhpApi('sendPoke', { poke: pokeData });
    } catch (e) {}

    triggerAlert(`پیام یادآوری شیرین برای پارتنر شما فرستاده شد! 💌`);
  };

  const handleSendPeriodSupportPoke = async (customMessage: string) => {
    if (!userProfile.partnerUid) {
      triggerAlert("شریک شما هنوز به حساب متصل نشده است!");
      return;
    }

    const pokeData = {
      coupleId: userProfile.coupleId,
      senderUid: userProfile.uid,
      senderName: userProfile.displayName,
      recipientUid: userProfile.partnerUid,
      message: customMessage,
      itemId: "impo_period_support",
      itemTitle: "همدلی روزهای ماهانه 🌸"
    };

    try {
      await fetchFromPhpApi('sendPoke', { poke: pokeData });
    } catch (e) {}

    triggerAlert("پیام همراهی و همدلی برای شریک زندگی شما ارسال شد! 💕");
  };

  const handleDismissAlert = async (pokeId: string) => {
    setPokes(prev => prev.filter(p => p.id !== pokeId));
    try {
      await fetchFromPhpApi('markPokeRead', { id: pokeId });
    } catch (e) {}
    setShowNotificationAlert(null);
  };

  // Memory utilities & operations
  const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    });
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile.coupleId) {
      triggerAlert("ابتدا باید به پارتنر خود متصل شوید! 👥");
      return;
    }
    if (!memoryFormTitle.trim() || !memoryFormContent.trim() || !memoryFormDate) {
      triggerAlert("لطفاً عنوان، تاریخ و متن خاطره را پر کنید. 📝");
      return;
    }

    try {
      setIsUploadingMemoryImage(true);
      
      let processedImg = memoryFormImageUrl;
      if (processedImg && processedImg.startsWith("data:image")) {
        try {
          processedImg = await compressImage(processedImg);
          const uploadRes = await fetchFromPhpApi('uploadImage', {
            image: processedImg,
            folder: 'memories'
          });
          if (uploadRes && uploadRes.status === 'success' && uploadRes.url) {
            processedImg = uploadRes.url;
          }
        } catch (uploadErr) {
          console.warn("Memory image upload fallback note:", uploadErr);
        }
      }

      const memoryPayload = {
        coupleId: userProfile.coupleId,
        title: memoryFormTitle.trim(),
        date: memoryFormDate,
        imageUrl: processedImg || "",
        content: memoryFormContent.trim(),
        createdBy: userProfile.uid,
        createdByName: userProfile.displayName || "پارتنر"
      };

      // 1. Save to Host MySQL via PHP API
      const res = await fetchFromPhpApi('addMemory', { memory: memoryPayload });

      const newMemory: Memory = {
        id: res?.id || `mem_${Date.now()}`,
        ...memoryPayload,
        createdAt: new Date().toISOString()
      };

      setMemories(prev => [newMemory, ...prev.filter(m => m.id !== newMemory.id)]);

      // Joyful splash of pink/rose confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f43f5e", "#ec4899", "#a855f7", "#f59e0b"]
      });
      // Clear state and close modal
      setMemoryFormTitle("");
      setMemoryFormDate("");
      setMemoryFormContent("");
      setMemoryFormImageUrl("");
      setMemoryRawImageSrc(null);
      setMemoryCropImageSrc(null);
      setShowAddMemoryModal(false);
      triggerAlert("خاطره شیرین شما با موفقیت ثبت شد! 💖✨");
    } catch (err) {
      console.error("Error saving memory:", err);
      triggerAlert("خطایی در ذخیره خاطره پیش آمد.");
    } finally {
      setIsUploadingMemoryImage(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!window.confirm("آیا از حذف این خاطره قشنگ مطمئن هستید؟ 🥺")) return;
    try {
      setMemories(prev => prev.filter(m => m.id !== memoryId));
      await fetchFromPhpApi('deleteMemory', { id: memoryId });
      triggerAlert("خاطره با موفقیت حذف شد. 🕊️");
    } catch (err) {
      console.error("Error deleting memory:", err);
      triggerAlert("خطایی در حذف خاطره به وجود آمد.");
    }
  };

  // Keep selectedMemory synchronized with memories state
  useEffect(() => {
    if (selectedMemory) {
      const fresh = memories.find(m => m.id === selectedMemory.id);
      if (fresh) {
        setSelectedMemory(fresh);
      }
    }
  }, [memories]);

  // Toggle Reaction on Memory
  const handleToggleMemoryReaction = async (memoryId: string, emoji: string) => {
    if (!userProfile) return;
    const currentName = userProfile.displayName || "پارتنر";

    // 1. Optimistic update
    setMemories(prev => prev.map(m => {
      if (m.id !== memoryId) return m;
      const reactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
      const existingIdx = reactions.findIndex(r => r.uid === userProfile.uid && r.emoji === emoji);
      if (existingIdx >= 0) {
        reactions.splice(existingIdx, 1);
      } else {
        reactions.push({ emoji, uid: userProfile.uid, userName: currentName });
      }
      return { ...m, reactions };
    }));

    // 2. Persist in MySQL via PHP API
    try {
      const res = await fetchFromPhpApi('toggleMemoryReaction', {
        memoryId,
        emoji,
        uid: userProfile.uid,
        userName: currentName
      });
      if (res && res.status === 'success' && Array.isArray(res.reactions)) {
        setMemories(prev => prev.map(m => m.id === memoryId ? { ...m, reactions: res.reactions } : m));
      }
    } catch (err) {
      console.warn("Failed saving reaction:", err);
    }
  };

  // Add Comment on Memory
  const handleAddMemoryComment = async (memoryId: string) => {
    if (!memoryCommentText.trim() || !userProfile) return;
    const cleanText = memoryCommentText.trim();
    setMemoryCommentText("");
    setIsSubmittingComment(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticComment: MemoryComment = {
      id: tempId,
      memoryId,
      coupleId: userProfile.coupleId || "",
      uid: userProfile.uid,
      userName: userProfile.displayName || "پارتنر",
      userPhoto: userProfile.photoURL,
      text: cleanText,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setMemories(prev => prev.map(m => {
      if (m.id !== memoryId) return m;
      const comments = Array.isArray(m.comments) ? [...m.comments] : [];
      return { ...m, comments: [...comments, optimisticComment] };
    }));

    try {
      const res = await fetchFromPhpApi('addMemoryComment', {
        memoryId,
        coupleId: userProfile.coupleId || "",
        uid: userProfile.uid,
        userName: userProfile.displayName || "پارتنر",
        userPhoto: userProfile.photoURL || "",
        text: cleanText
      });
      if (res && res.status === 'success' && res.comment) {
        setMemories(prev => prev.map(m => {
          if (m.id !== memoryId) return m;
          const filtered = (m.comments || []).filter(c => c.id !== tempId);
          return { ...m, comments: [...filtered, res.comment] };
        }));
      }
    } catch (err) {
      console.warn("Failed adding memory comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Comment on Memory
  const handleDeleteMemoryComment = async (memoryId: string, commentId: string) => {
    setMemories(prev => prev.map(m => {
      if (m.id !== memoryId) return m;
      return { ...m, comments: (m.comments || []).filter(c => c.id !== commentId) };
    }));
    try {
      await fetchFromPhpApi('deleteMemoryComment', {
        commentId,
        uid: userProfile.uid
      });
    } catch (err) {
      console.warn("Failed deleting memory comment:", err);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetchFromPhpApi('logout');
    } catch (e) {}
    clearAuthSession();
    await auth.signOut();
    window.location.reload();
  };

  // Filter lists
  const wishlistItems = items.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = !searchQuery.trim() || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return !item.isCompleted && matchesCategory && matchesSearch;
  });

  const hallOfFameItems = items.filter(item => {
    const matchesSearch = !searchQuery.trim() || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return item.isCompleted && matchesSearch;
  });

  // Group Hall of Fame items by Category
  const groupedHallOfFame = allCategories.reduce((acc, cat) => {
    acc[cat.id] = hallOfFameItems.filter(item => item.category === cat.id);
    return acc;
  }, {} as Record<string, WishlistItem[]>);

  // Calendar calculations (Jalali)
  // Map trips or activities with dates to calendar
  const calendarItems = items.filter(item => item.date);

  const getMenstrualPhaseForDate = (targetDate: Date) => {
    const active = impoSettings || (periodSettings ? {
      cycleLength: periodSettings.cycleLength,
      periodLength: periodSettings.periodLength,
      lastPeriodStartDate: periodSettings.lastPeriodStartDate,
      goalMode: 'track' as const
    } : null);

    if (!active || !active.lastPeriodStartDate) return null;

    try {
      return calculateCycleStatus(active, targetDate);
    } catch (e) {
      return null;
    }
  };

  const daysInMonth = getJalaliDaysInMonth(currentJalaliYear, currentJalaliMonth);
  // Get Gregorian day of 1st day of current Jalali month to find weekday index
  const [gFirstY, gFirstM, gFirstD] = jalaliToGregorian(currentJalaliYear, currentJalaliMonth, 1);
  const firstDayGDate = new Date(gFirstY, gFirstM - 1, gFirstD);
  const firstDay = (firstDayGDate.getDay() + 1) % 7; // Sunday=0 -> +1%7 => Saturday is index 0

  const calendarDays = [];
  // Offset empty boxes for first day (starting Saturday)
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  const prevMonth = () => {
    if (currentJalaliMonth === 1) {
      setCurrentJalaliMonth(12);
      setCurrentJalaliYear(prev => prev - 1);
    } else {
      setCurrentJalaliMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentJalaliMonth === 12) {
      setCurrentJalaliMonth(1);
      setCurrentJalaliYear(prev => prev + 1);
    } else {
      setCurrentJalaliMonth(prev => prev + 1);
    }
  };

  const getItemsForDay = (day: number) => {
    const [gy, gm, gd] = jalaliToGregorian(currentJalaliYear, currentJalaliMonth, day);
    const dateStr = `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
    return calendarItems.filter(item => item.date === dateStr);
  };

  const itemsInCurrentJalaliMonth = calendarItems.filter(item => {
    if (!item.date) return false;
    const parts = item.date.split("-");
    if (parts.length !== 3) return false;
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10);
    const gd = parseInt(parts[2], 10);
    if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return false;
    const [jy, jm] = gregorianToJalali(gy, gm, gd);
    return jy === currentJalaliYear && jm === currentJalaliMonth;
  });

  return (
    <div className="min-h-screen pb-24 relative">
      {/* Background Orbs */}
      <div className="absolute top-[20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-pink-100 to-indigo-100 opacity-50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-emerald-50 to-rose-100 opacity-50 blur-3xl pointer-events-none" />

      {/* Dynamic Header */}
      <header className="sticky top-0 bg-white/30 backdrop-blur-lg border-b border-white/50 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Beautiful Connected Avatars */}
            <div className="flex items-center relative pr-3 sm:pr-4">
              <div className="relative z-10 hover:scale-105 transition-all">
                {renderAvatar(userProfile, "❤️", "w-9 h-9 sm:w-11 sm:h-11 border-2 border-white shadow-md")}
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow border border-white cursor-pointer transition-all"
                  title="ویرایش پروفایل من"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
              {userProfile.partnerUid && (
                <div className="absolute left-5 sm:left-6 z-0 -translate-x-1 hover:z-20 hover:scale-105 transition-all relative">
                  {renderAvatar(partnerProfile, "💖", "w-9 h-9 sm:w-11 sm:h-11 border-2 border-white shadow-md")}
                  <span 
                    className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white shadow-sm transition-all duration-300 ${
                      isPartnerOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    }`}
                    title={isPartnerOnline ? "پارتنر شما آنلاین است" : "پارتنر شما آفلاین است"}
                  />
                </div>
              )}
            </div>
            
            <div className="mr-2 sm:mr-3">
              <h1 className="text-xs sm:text-base md:text-lg font-black text-slate-800 flex items-center gap-1 sm:gap-1.5 leading-none">
                {userProfile.displayName}
                <span className="text-[8px] sm:text-xs text-rose-500 font-medium bg-rose-500/10 px-1 sm:px-2 py-0.5 rounded-full backdrop-blur-sm border border-rose-500/10 whitespace-nowrap">❤️ همگام</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-1 sm:mt-1.5 font-medium leading-none flex items-center gap-1.5">
                شریک رؤیاها: <span className="font-bold text-rose-600">{partnerProfile?.displayName || (userProfile.partnerEmail ? userProfile.partnerEmail.split("@")[0] : "در انتظار...")}</span>
                {userProfile.partnerUid && (
                  <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isPartnerOnline 
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/15" 
                      : "bg-slate-100 text-slate-400 border border-slate-200"
                  }`}>
                    <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isPartnerOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {isPartnerOnline ? "فعال" : "آفلاین"}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Synced Tehran Clock Widget (Desktop) */}
          <div className="hidden md:flex flex-col items-center text-center bg-white/40 border border-white/60 px-4 py-1.5 rounded-2xl backdrop-blur-md shadow-sm">
            <span className="text-[9px] font-black text-rose-500 tracking-wide flex items-center gap-1 mb-0.5" dir="rtl">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              ساعت رسمی تهران
            </span>
            {tehranTime ? (
              <div className="flex items-center gap-2" dir="rtl">
                <span className="text-xs font-bold text-slate-700">{formatTehranDateAndTime(tehranTime).weekday}، {formatTehranDateAndTime(tehranTime).jalaliDateStr}</span>
                <span className="text-xs font-black text-rose-600 font-mono tracking-wider bg-rose-50/80 px-1.5 py-0.5 rounded-lg border border-rose-100">{formatTehranDateAndTime(tehranTime).timeStr}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium animate-pulse">در حال همگام‌سازی...</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick reminder triggers */}
            <button
              onClick={requestNotificationPermission}
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                notificationsEnabled 
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/25 backdrop-blur-md" 
                  : "bg-white/40 border-white/60 text-slate-400 hover:bg-white/70 backdrop-blur-md"
              }`}
              title={notificationsEnabled ? "اعلان‌ها فعال هستند" : "فعال‌سازی اعلان‌های مرورگر"}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 bg-white/40 border border-white/60 hover:bg-rose-500/10 hover:text-rose-600 text-slate-500 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold backdrop-blur-md"
              title="خروج"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Real-time poke notification alert toaster */}
      <AnimatePresence>
        {pokes.length > 0 && (
          <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50">
            {pokes.map((poke) => (
              <motion.div
                key={poke.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-rose-500 text-white rounded-2xl shadow-xl p-4 mb-3 border border-rose-400 flex items-start gap-3"
              >
                <div className="p-2 bg-white/20 rounded-xl animate-bounce">
                  <MessageCircleHeart className="w-5 h-5 text-white fill-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold opacity-90">یادآوری قلقلکی عاشقانه! 💕</h4>
                  <p className="text-sm font-semibold mt-1">{poke.message}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">برای مورد: {poke.itemTitle}</p>
                </div>
                <button
                  onClick={() => handleDismissAlert(poke.id)}
                  className="p-1 hover:bg-white/10 rounded-lg text-xs font-bold cursor-pointer"
                >
                  فهمیدم!
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-5xl mx-auto px-4 mt-8">
        {/* Synced Tehran Clock for Mobile Screen only */}
        <div className="md:hidden flex items-center justify-between bg-white/40 border border-white/50 px-4 py-2.5 rounded-2xl backdrop-blur-xl shadow-sm mb-6 text-right" dir="rtl">
          <span className="text-[10px] font-black text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            ساعت رسمی تهران:
          </span>
          {tehranTime ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700">{formatTehranDateAndTime(tehranTime).weekday}، {formatTehranDateAndTime(tehranTime).jalaliDateStr}</span>
              <span className="text-xs font-black text-rose-600 font-mono bg-rose-50/80 px-1.5 py-0.5 rounded-lg border border-rose-100">{formatTehranDateAndTime(tehranTime).timeStr}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium animate-pulse">همگام‌سازی...</span>
          )}
        </div>

        {/* Navigation Tabs (Desktop only) */}
        <div className="hidden md:block w-full mb-8">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 px-1 w-full md:flex-wrap md:justify-center">
            <div className="flex flex-nowrap md:flex-wrap bg-white/30 backdrop-blur-xl p-1.5 rounded-2xl border border-white/50 shadow-sm gap-1 shrink-0">
              <button
                onClick={() => setActiveTab("wishlist")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "wishlist" 
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === "wishlist" ? "fill-white text-white" : "text-slate-400"}`} />
                ویش‌لیست مشترک
              </button>

              <button
                onClick={() => setActiveTab("hall")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "hall" 
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                تالار افتخارات
              </button>

              <button
                onClick={() => setActiveTab("calendar")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "calendar" 
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                تقویم دو نفره
              </button>

              <button
                onClick={() => setActiveTab("memories")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "memories" 
                    ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Camera className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === "memories" ? "fill-white text-white" : "text-pink-500"}`} />
                خاطرات مشترک 📸
              </button>

              <button
                onClick={() => setActiveTab("period")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "period" 
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Droplet className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === "period" ? "fill-white text-white" : "text-rose-500"}`} />
                ردیاب پریود 🩸
              </button>

              <button
                onClick={() => setActiveTab("finance")}
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
                  activeTab === "finance" 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200" 
                    : "text-slate-600 hover:bg-white/40"
                }`}
              >
                <Wallet className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === "finance" ? "fill-white text-white" : "text-emerald-500"}`} />
                مدیریت مالی 💼
              </button>

              {customTabs.map((tab) => (
                <div key={tab.id} className="relative group/tab flex items-center shrink-0">
                  <button
                    onClick={() => setActiveTab(`tab-${tab.id}`)}
                    className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 ${
                      activeTab === `tab-${tab.id}`
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200"
                        : "text-slate-600 hover:bg-white/40"
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{tab.icon || "✨"}</span>
                    {tab.title}
                  </button>
                  <button
                    onClick={(e) => handleDeleteTab(tab.id, e)}
                    className="absolute -top-1.5 -left-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-100 md:opacity-0 group-hover/tab:opacity-100 transition-all shadow border border-white cursor-pointer z-10"
                    title="حذف تب"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search Bar Component */}
        {(activeTab === "wishlist" || activeTab === "hall" || activeTab === "memories") && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto mb-8 relative text-right"
            dir="rtl"
          >
            <div className="relative">
              <input
                type="text"
                placeholder={activeTab === "memories" ? "جستجو در بین خاطرات (عنوان یا متن)... 🔍" : "جستجو در بین آرزوها (عنوان یا توضیحات)... 🔍"}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm transition-all text-right"
              />
              <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-5 h-5" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 left-3 -translate-y-1/2 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  title="پاک کردن متن"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* --- TAB 1: WISHLIST --- */}
        {activeTab === "wishlist" && (
          <div>
            {/* Filter buttons & Add Trigger */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 px-1 w-full md:overflow-visible md:flex-wrap">
                <div className="flex flex-nowrap md:flex-wrap gap-2 items-center shrink-0">
                  <button
                    onClick={() => setCategoryFilter("all")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer backdrop-blur-md shrink-0 whitespace-nowrap ${
                      categoryFilter === "all" 
                        ? "bg-slate-800 text-white border-slate-800 shadow-sm" 
                        : "bg-white/40 text-slate-600 border-white/50 hover:bg-white/70"
                    }`}
                  >
                    همه موارد
                  </button>
                  {allCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isCustom = customCategories.some(c => c.id === cat.id);
                    return (
                      <div key={cat.id} className="relative group/cat flex items-center shrink-0">
                        <button
                          onClick={() => setCategoryFilter(cat.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md shrink-0 whitespace-nowrap ${
                            categoryFilter === cat.id 
                              ? `${cat.bg} ${cat.color} ${cat.border} ring-2 ring-rose-200 shadow-sm` 
                              : "bg-white/40 text-slate-600 border-white/50 hover:bg-white/70"
                          }`}
                        >
                          {typeof cat.iconName === "string" && !PRESET_ICONS[cat.iconName] ? (
                            <span className="text-sm">{cat.iconName}</span>
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                          {cat.label}
                        </button>
                        {isCustom && (
                          <button
                            onClick={(e) => handleDeleteCategory(cat.id, e)}
                            className="absolute -top-1.5 -left-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-100 md:opacity-0 group-hover/cat:opacity-100 transition-all shadow border border-white cursor-pointer z-10"
                            title="حذف دسته‌بندی"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        )}
                      </div>
                    );
                  })}


                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="py-2.5 px-5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:shadow-xl hover:shadow-rose-300 transition-all cursor-pointer w-full md:w-auto text-center whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" />
                افزودن آرزوی جدید
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                <p className="text-sm">در حال بارگذاری لیست آرزوها...</p>
              </div>
            ) : wishlistItems.length === 0 ? (
              <div className="glass-card rounded-3xl p-16 text-center">
                <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-sm border border-white/60">
                  <Compass className="w-8 h-8 animate-pulse text-rose-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800">اینجا هنوز چیزی نیست!</h3>
                <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
                  اولین آرزوی خودتون رو اضافه کنید؛ سفر، خرید، فیلم، کتاب یا جاهایی که دوست دارید برید رو ثبت کنید!
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-6 inline-flex py-2.5 px-6 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-bold rounded-xl gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  افزودن آرزوی اول
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {wishlistItems.map((item) => {
                  const catConfig = allCategories.find(c => c.id === item.category) || allCategories[0];
                  const CatIcon = catConfig.icon;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                            {typeof catConfig.iconName === "string" && !PRESET_ICONS[catConfig.iconName] ? (
                              <span className="text-xs">{catConfig.iconName}</span>
                            ) : (
                              <CatIcon className="w-3 h-3" />
                            )}
                            {catConfig.label}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendPoke(item)}
                              className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all cursor-pointer"
                              title="یادآوری قلقلکی به همسرت"
                            >
                              <MessageCircleHeart className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 hover:bg-amber-500/10 text-amber-500 rounded-lg transition-all cursor-pointer"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-all cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-base font-bold text-slate-800 leading-snug">{item.title}</h3>
                        {item.description && (
                          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        )}

                        {/* Link Preview integration */}
                        {item.link && (
                          <div className="mt-4">
                            {item.linkPreview ? (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group block bg-white/30 hover:bg-white/60 rounded-2xl border border-white/40 hover:border-white/60 p-2.5 transition-all text-right backdrop-blur-md"
                              >
                                <div className="flex gap-3">
                                  {item.linkPreview.image && (
                                    <img
                                      src={item.linkPreview.image}
                                      alt="link preview"
                                      className="w-14 h-14 object-cover rounded-xl shrink-0 border border-white/40 group-hover:scale-102 transition-all"
                                      referrerPolicy="no-referrer"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-bold text-slate-700 truncate flex items-center gap-1">
                                      {item.linkPreview.title || "مشاهده لینک"}
                                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-rose-500" />
                                    </h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-normal">
                                      {item.linkPreview.description}
                                    </p>
                                  </div>
                                </div>
                              </a>
                            ) : (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:underline bg-white/40 px-3 py-1.5 rounded-xl border border-white/50 backdrop-blur-md"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>باز کردن لینک کمکی</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Trip Date or Target Date */}
                        {item.date && (
                          <div className="mt-4 flex items-center gap-1.5 text-xs text-violet-600 font-bold">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>تاریخ برنامه‌ریزی: {item.date}</span>
                          </div>
                        )}
                      </div>

                      {/* Progressive Tracker Section */}
                      <div className="mt-6 pt-4 border-t border-white/40">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                          <span>میزان پیشرفت دو نفره:</span>
                          <span className="text-rose-600 font-mono text-sm">{item.progress}%</span>
                        </div>

                        {/* Dynamic Progress Indicator */}
                        <div className="w-full bg-white/40 h-2 rounded-full overflow-hidden relative border border-white/20">
                          <div 
                            className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-300" 
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>

                        {/* Step progression buttons */}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleUpdateProgress(item.id, item.progress, -25)}
                              disabled={item.progress === 0}
                              className="px-2.5 py-1 bg-white/40 border border-white/50 hover:bg-white/60 rounded-lg text-xs font-bold text-slate-500 disabled:opacity-50 cursor-pointer"
                            >
                              -۲۵٪
                            </button>
                            <button
                              onClick={() => handleUpdateProgress(item.id, item.progress, 25)}
                              disabled={item.progress === 100}
                              className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-600 rounded-lg text-xs font-bold disabled:opacity-50 cursor-pointer"
                            >
                              +۲۵٪
                            </button>
                          </div>

                          <button
                            onClick={() => handleUpdateProgress(item.id, item.progress, 100 - item.progress)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-rose-200"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>انجام شد!</span>
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400">
                          <span>ثبت‌کننده: {item.createdByName}</span>
                          <span>پیشرفت مشارکتی</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: HALL OF FAME --- */}
        {activeTab === "hall" && (
          <div>
            <div className="text-center max-w-xl mx-auto mb-10">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-amber-500/20 border border-white/60 animate-bounce">
                <Sparkles className="w-8 h-8 fill-white/20" />
              </div>
              <h2 className="text-xl font-black text-slate-800 font-sans">تالار افتخارات دونفره ما 🏆</h2>
              <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                آرشیو خاطرات شیرین و کارهایی که با موفقیت کامل انجام دادیم و تیک زدیم. هر تیک یک خاطره ماندگار است!
              </p>
            </div>

            {hallOfFameItems.length === 0 ? (
              <div className="glass-card rounded-3xl p-16 text-center">
                <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-sm border border-white/60">
                  <Flame className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-black text-slate-800">تالار افتخارات فعلاً خالیه!</h3>
                <p className="text-slate-500 text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
                  هر زمان یکی از آرزوهای ویش‌لیست را به ۱۰۰٪ برسونید، با شکوه خاصی وارد تالار افتخارات خواهد شد.
                </p>
              </div>
            ) : (
              <div className="space-y-10">
                {allCategories.map((cat) => {
                  const catItems = groupedHallOfFame[cat.id] || [];
                  if (catItems.length === 0) return null;
                  const Icon = cat.icon;

                  return (
                    <div key={cat.id} className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/40 pb-2">
                        <div className={`p-1.5 rounded-lg ${cat.bg} ${cat.color} border border-white/60 backdrop-blur-md`}>
                          {typeof cat.iconName === "string" && !PRESET_ICONS[cat.iconName] ? (
                            <span className="text-xs">{cat.iconName}</span>
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">{cat.label} برآورده شده</h3>
                        <span className="text-xs bg-amber-500/20 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-500/10">
                          {catItems.length} مورد
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {catItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ rotate: -1, opacity: 0, scale: 0.95 }}
                            animate={{ rotate: (Math.random() * 2 - 1), opacity: 1, scale: 1 }}
                            className="fame-card rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between group/fame"
                          >
                            {/* Gold Badge */}
                            <div className="absolute -top-3 -left-3 w-12 h-12 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] shadow-sm rotate-12 border border-white/60">
                              ✓ خاطره
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="absolute top-3 right-3 p-1.5 text-amber-800/50 hover:text-red-600 hover:bg-red-50/60 rounded-xl transition-all cursor-pointer z-10"
                              title="حذف از تالار افتخارات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div>
                              <h4 className="text-sm font-bold text-slate-800 mt-2 pr-6 leading-snug">{item.title}</h4>
                              {item.description && (
                                <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-amber-200/30">
                              {item.link && (
                                <a
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-amber-700 hover:underline flex items-center gap-1 mb-2"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  لینک خاطره
                                </a>
                              )}
                              <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold bg-amber-100/30 p-2 rounded-xl border border-amber-200/20">
                                <span>انجام با: {item.createdByName}</span>
                                <span>
                                  {item.completedAt ? new Date(item.completedAt.seconds * 1000).toLocaleDateString('fa-IR') : "خاطره طلایی"}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: CALENDAR --- */}
        {activeTab === "calendar" && (
          <div className="max-w-2xl mx-auto">
            <div className="glass-card rounded-3xl p-6 mb-8">
              {/* Calendar Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-violet-500" />
                    برنامه‌های مشترک روی تقویم
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    برنامه‌های دونفره همراه با نمایش نامحسوس روزهای چرخه سلامت
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Subtle Cycle toggle button */}
                  <button
                    onClick={() => setShowCycleOnCalendar(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      showCycleOnCalendar
                        ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
                        : "bg-white/40 text-slate-500 border-slate-200 hover:bg-white/70"
                    }`}
                    title="روشن یا خاموش کردن نمایش رنگ‌های نامحسوس چرخه در تقویم"
                  >
                    <Droplet className={`w-3.5 h-3.5 ${showCycleOnCalendar ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                    <span>چرخه سلامت: {showCycleOnCalendar ? "نمایان" : "مخفی"}</span>
                  </button>

                  <div className="flex items-center gap-1 bg-white/50 border border-white/60 p-0.5 rounded-xl backdrop-blur-sm">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 hover:bg-white/80 rounded-lg text-slate-600 transition-all cursor-pointer"
                      title="ماه قبل"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-slate-700 font-mono px-2">
                      {JALALI_MONTHS[currentJalaliMonth - 1]} {currentJalaliYear}
                    </span>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 hover:bg-white/80 rounded-lg text-slate-600 transition-all cursor-pointer"
                      title="ماه بعد"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                <div>شنبه</div>
                <div>یکشنبه</div>
                <div>دوشنبه</div>
                <div>سه‌شنبه</div>
                <div>چهارشنبه</div>
                <div>پنجشنبه</div>
                <div>جمعه</div>
              </div>

              {/* Day Boxes with Subtle Menstrual Phase Colors */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="h-16 bg-white/10 rounded-xl border border-transparent" />;
                  }

                  const dayItems = getItemsForDay(day);
                  const hasItems = dayItems.length > 0;

                  const [gy, gm, gd] = jalaliToGregorian(currentJalaliYear, currentJalaliMonth, day);
                  const targetDate = new Date(gy, gm - 1, gd);
                  const phaseInfo = showCycleOnCalendar ? getMenstrualPhaseForDate(targetDate) : null;

                  let cellClass = "bg-white/40 border-white/50 text-slate-700 hover:bg-white/70";
                  let pillClass = "";
                  let phaseLabel = "";

                  if (phaseInfo) {
                    if (phaseInfo.phase === "period") {
                      cellClass = "bg-rose-500/[0.08] border-rose-300/40 text-rose-950 hover:bg-rose-500/[0.14]";
                      pillClass = "bg-rose-400";
                      phaseLabel = `روز ${toPersianDigits(phaseInfo.currentCycleDay)} قاعدگی 🩸`;
                    } else if (phaseInfo.phase === "due") {
                      cellClass = "bg-rose-500/[0.12] border-rose-400/50 text-rose-950 hover:bg-rose-500/[0.18]";
                      pillClass = "bg-rose-500";
                      phaseLabel = "موعد مورد انتظار پریود ⏳";
                    } else if (phaseInfo.phase === "delayed") {
                      cellClass = "bg-red-500/[0.08] border-red-300/40 text-red-950 hover:bg-red-500/[0.14]";
                      pillClass = "bg-red-400";
                      phaseLabel = `تاخیر در پریود (${toPersianDigits(phaseInfo.delayedDays)} روز) ⚠️`;
                    } else if (phaseInfo.phase === "pms") {
                      cellClass = "bg-purple-500/[0.06] border-purple-300/40 text-purple-950 hover:bg-purple-500/[0.14]";
                      pillClass = "bg-purple-400";
                      phaseLabel = "دوران حساس PMS 🌸";
                    } else if (phaseInfo.phase === "ovulation") {
                      cellClass = "bg-orange-500/[0.08] border-orange-300/45 text-orange-950 hover:bg-orange-500/[0.16]";
                      pillClass = "bg-orange-400";
                      phaseLabel = "روز تخمک‌گذاری 🥚";
                    } else if (phaseInfo.phase === "fertile") {
                      cellClass = "bg-amber-500/[0.06] border-amber-300/40 text-amber-950 hover:bg-amber-500/[0.14]";
                      pillClass = "bg-amber-300";
                      phaseLabel = "پنجره باروری ✨";
                    } else if (phaseInfo.phase === "follicular") {
                      cellClass = "bg-emerald-500/[0.04] border-emerald-300/30 text-emerald-950 hover:bg-emerald-500/[0.10]";
                      pillClass = "bg-emerald-300";
                      phaseLabel = "فاز پرانرژی و شادابی 🌱";
                    }
                  }

                  if (hasItems) {
                    cellClass += " ring-1.5 ring-violet-500/50 shadow-xs";
                  }

                  return (
                    <div
                      key={`day-${day}`}
                      className={`h-16 rounded-xl border p-1.5 flex flex-col justify-between transition-all relative backdrop-blur-sm cursor-pointer ${cellClass}`}
                      title={`${phaseLabel ? `[${phaseLabel}] ` : ""}${hasItems ? `(${dayItems.length} برنامه: ${dayItems.map(i => i.title).join("، ")})` : ""}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-mono font-black">{toPersianDigits(day)}</span>
                        {phaseLabel && (
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: phaseInfo?.stageColor.primary || '#f43f5e' }}
                            title={phaseLabel}
                          />
                        )}
                      </div>

                      {/* Scheduled Wishlist Plans Badge */}
                      {hasItems && (
                        <div className="flex flex-col items-center justify-center my-auto w-full px-0.5">
                          <span className="w-full text-center py-0.5 px-1 bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-black rounded-md shadow-xs truncate">
                            {dayItems.length === 1 ? dayItems[0].title : `${toPersianDigits(dayItems.length)} برنامه`}
                          </span>
                        </div>
                      )}

                      {/* Subtle Bottom Phase Bar (نامحسوس و تمیز) */}
                      {pillClass && (
                        <div className="w-full flex justify-center mt-auto pt-0.5">
                          <div className={`w-5 h-1 rounded-full ${pillClass} opacity-80`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Subtle Menstrual Phase Calendar Legend */}
              <div className="mt-6 pt-4 border-t border-slate-200/50" dir="rtl">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-black text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    راهنمای رنگ‌های نامحسوس چرخه سلامت در تقویم:
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (برای هماهنگی مسافرت‌ها و قرارهای دونفره)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-center">
                  <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-300/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-rose-900">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>دوران پریود (استراحت بیشتر)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-300/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-purple-900">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>دوران PMS (نیاز به آرامش و درک)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-300/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-orange-900">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>تخمک‌گذاری (اوج باروری)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-300/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-900">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>پنجره باروری</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-300/40 px-2.5 py-1 rounded-xl text-[10px] font-bold text-emerald-900">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>فاز پرانرژی (فولیکولار)</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-violet-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-xs">
                    <CalendarIcon className="w-3 h-3" />
                    <span>برنامه‌های مشترک ثبت‌شده</span>
                  </div>
                </div>
              </div>
            </div>

            {/* List of items scheduled for current month */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 mr-1">برنامه‌ها و سفرهای این ماه:</h4>
              {itemsInCurrentJalaliMonth.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-white/30 rounded-2xl border border-white/40 text-xs backdrop-blur-sm">
                  هیچ برنامه یا سفری برای این ماه تنظیم نشده است. به بخش ویش‌لیست بروید و برنامه‌ای را با تاریخ ثبت کنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {itemsInCurrentJalaliMonth.map(item => {
                    const catConfig = allCategories.find(c => c.id === item.category) || allCategories[0];
                    const CatIcon = catConfig.icon;
                    return (
                      <div 
                        key={item.id} 
                        className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${catConfig.bg} ${catConfig.color} border border-white/60`}>
                            {typeof catConfig.iconName === "string" && !PRESET_ICONS[catConfig.iconName] ? (
                              <span className="text-xs">{catConfig.iconName}</span>
                            ) : (
                              <CatIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-slate-800">{item.title}</h5>
                            <span className="text-xs text-violet-600 font-bold flex items-center gap-1 mt-0.5">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {formatPersianDate(item.date)}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab("wishlist");
                            setCategoryFilter(item.category);
                          }}
                          className="px-3 py-1.5 bg-white/40 border border-white/50 hover:bg-white/70 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer backdrop-blur-sm"
                        >
                          مشاهده در ویش‌لیست
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: PERIOD TRACKER (IMPO CALCULATION & VISUAL DESIGN) --- */}
        {activeTab === "period" && (
          <div className="max-w-5xl mx-auto" dir="rtl">
            <ImpoPeriodTracker 
              userProfile={userProfile} 
              onSendPoke={handleSendPeriodSupportPoke}
            />
          </div>
        )}

        {/* --- TAB 5: MEMORIES --- */}
        {activeTab === "memories" && (
          <div className="space-y-8" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/45 p-6 rounded-3xl border border-white/50 backdrop-blur-xl shadow-sm">
              <div className="text-right">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Camera className="w-6 h-6 text-pink-500 animate-pulse" />
                  دفترچه خاطرات شیرین مشترک 📸🌸
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-1 font-semibold leading-relaxed">
                  ثبت و مرور لحظات، عکس‌ها، و خاطرات قشنگی که با هم ساختیم تا همیشه برامون موندگار بمونه. 💕
                </p>
              </div>
              <button
                onClick={() => {
                  setMemoryFormDate("");
                  setMemoryFormTitle("");
                  setMemoryFormContent("");
                  setMemoryFormImageUrl("");
                  setShowAddMemoryModal(true);
                }}
                className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-100 transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>ثبت خاطره جدید ✨</span>
              </button>
            </div>

            {/* Memories List */}
            {(() => {
              const filteredMemories = memories.filter(m => 
                m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                m.content.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredMemories.length === 0) {
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/40 border border-dashed border-pink-200 rounded-3xl p-12 text-center backdrop-blur-md"
                  >
                    <div className="w-16 h-16 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mx-auto mb-4 border border-pink-200">
                      <HeartHandshake className="w-8 h-8 text-pink-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-700">هنوز خاطره‌ای ثبت نشده است!</h3>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1.5 leading-relaxed max-w-md mx-auto">
                      {searchQuery 
                        ? "هیچ خاطره‌ای با عبارت جستجو شده پیدا نشد. عبارت دیگری را امتحان کنید!" 
                        : "اولین خاطره خوشگلتون رو ثبت کنید تا دفترچه خاطراتتون شروع به پر شدن کنه... ✨🌷"}
                    </p>
                  </motion.div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMemories.map((memory, idx) => (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedMemory(memory)}
                      className="group bg-white/70 backdrop-blur-md border border-slate-100 hover:border-pink-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col text-right relative cursor-pointer"
                    >
                      {/* Optional Memory Image Cover */}
                      {memory.imageUrl && (
                        <div className="relative h-36 overflow-hidden bg-slate-100">
                          <img
                            src={memory.imageUrl}
                            alt={memory.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                        </div>
                      )}

                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          {/* Date and Author Tag */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              🗓️ {memory.date}
                            </span>
                            <span className="text-[9px] font-bold text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-md">
                              ✍️ {memory.createdByName}
                            </span>
                          </div>

                          {/* Memory Title */}
                          <h3 className="text-sm sm:text-base font-black text-slate-800 leading-snug group-hover:text-pink-500 transition-colors mb-2">
                            {memory.title}
                          </h3>

                          {/* Memory Content with wrap support */}
                          <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap break-words font-semibold line-clamp-3">
                            {memory.content}
                          </p>

                          {memory.content && memory.content.length > 100 && (
                            <span className="text-[11px] font-black text-pink-500 mt-1.5 block hover:underline">
                              ادامه خاطره... 📖
                            </span>
                          )}
                        </div>

                        {/* Reactions and Comments Bar on Card */}
                        {(() => {
                          const groupedReactions: { [emoji: string]: { count: number; userReacted: boolean } } = {};
                          (memory.reactions || []).forEach(r => {
                            if (!groupedReactions[r.emoji]) {
                              groupedReactions[r.emoji] = { count: 0, userReacted: false };
                            }
                            groupedReactions[r.emoji].count += 1;
                            if (r.uid === userProfile.uid) {
                              groupedReactions[r.emoji].userReacted = true;
                            }
                          });

                          return (
                            <div className="pt-2 border-t border-slate-100/70 space-y-2">
                              {/* Active Reaction Chips */}
                              {Object.keys(groupedReactions).length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleMemoryReaction(memory.id, emoji);
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                        data.userReacted
                                          ? 'bg-rose-100 border-rose-300 text-rose-800 scale-102 shadow-xs'
                                          : 'bg-white/80 border-slate-200 text-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-[10px]">{toPersianDigits(data.count)}</span>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Quick Emoji Picker & Comments Count & Delete */}
                              <div className="flex items-center justify-between gap-1 text-xs">
                                <div className="flex items-center gap-1">
                                  {["❤️", "😍", "🥹", "😂", "🔥", "🌸"].slice(0, 4).map(emoji => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleMemoryReaction(memory.id, emoji);
                                      }}
                                      className="w-6 h-6 hover:scale-125 transition-transform text-sm cursor-pointer"
                                      title={`واکنش با ${emoji}`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[11px] font-bold text-pink-600 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg transition-all border border-pink-100">
                                    <MessageCircleHeart className="w-3 h-3 text-pink-500" />
                                    <span>{(memory.comments || []).length > 0 ? `${toPersianDigits((memory.comments || []).length)} نظر` : 'نظر'}</span>
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMemory(memory.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="حذف خاطره"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* --- TAB 6: PRIVATE FINANCIAL MANAGEMENT --- */}
        {activeTab === "finance" && (
          <FinanceSection userProfile={userProfile} />
        )}

        {/* --- CUSTOM SCRAPBOOK BOARD TAB VIEW --- */}
        {activeTab.startsWith("tab-") && (
          <div className="space-y-8">
            {(() => {
              const currentTabId = activeTab.replace("tab-", "");
              const tab = customTabs.find(t => t.id === currentTabId);
              if (!tab) return <p className="text-center text-slate-500 font-bold">تب پیدا نشد یا حذف شده است.</p>;
              
              return (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <span className="text-2xl">{tab.icon || "✨"}</span>
                        {tab.title}
                      </h2>
                      <p className="text-slate-500 text-xs mt-1.5 font-medium">
                        برد یادداشت‌ها، برنامه‌ها و خاطرات اختصاصی دونفره مخصوص تب {tab.title} 💕
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddNoteModal(true)}
                      className="py-2.5 px-5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 transition-all cursor-pointer hover:shadow-rose-300"
                    >
                      <Plus className="w-4 h-4" />
                      افزودن یادداشت جدید
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div className="glass-card rounded-3xl p-16 text-center max-w-lg mx-auto">
                      <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-4 shadow-sm border border-white/60">
                        <Edit2 className="w-8 h-8 text-rose-400" />
                      </div>
                      <h3 className="text-base font-black text-slate-800">این برد هنوز خالیه!</h3>
                      <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                        اولین پیام عاشقانه، یادداشت روزانه یا خاطره قشنگتون رو روی این برد سنجاق کنید تا پارتنرتون درجا ببینه!
                      </p>
                      <button
                        onClick={() => setShowAddNoteModal(true)}
                        className="mt-6 inline-flex py-2.5 px-6 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold rounded-xl gap-2 transition-all cursor-pointer shadow-md"
                      >
                        <Plus className="w-4 h-4" />
                        نوشتن اولین یادداشت
                      </button>
                    </div>
                  ) : (
                    /* Sticky note scrapbook board grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {notes.map((note, index) => {
                        const noteBgClasses: Record<string, string> = {
                          yellow: "bg-amber-100/90 border-amber-200 text-slate-800 shadow-amber-100/30",
                          pink: "bg-rose-100/90 border-rose-200 text-slate-800 shadow-rose-100/30",
                          blue: "bg-sky-100/90 border-sky-200 text-slate-800 shadow-sky-100/30",
                          violet: "bg-purple-100/90 border-purple-200 text-slate-800 shadow-purple-100/30",
                          green: "bg-emerald-100/90 border-emerald-200 text-slate-800 shadow-emerald-100/30"
                        };
                        const bgClass = noteBgClasses[note.color] || noteBgClasses.yellow;
                        
                        // Rotations to look like real physical sticky notes
                        const rotations = ["rotate-1", "-rotate-1", "rotate-2", "-rotate-2", "rotate-0"];
                        const rotationClass = rotations[index % rotations.length];

                        return (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className={`p-6 rounded-2xl border shadow-md relative group/note flex flex-col justify-between min-h-[160px] backdrop-blur-sm transition-all hover:scale-[1.02] hover:-translate-y-0.5 ${bgClass} ${rotationClass}`}
                          >
                            <div className="relative">
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="absolute top-0 left-0 p-1 text-slate-400 hover:text-red-500 hover:bg-white/50 rounded-lg opacity-0 group-hover/note:opacity-100 transition-all cursor-pointer"
                                title="حذف یادداشت"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <p className="text-sm font-semibold whitespace-pre-wrap leading-relaxed pr-3 text-right">
                                {note.content}
                              </p>
                            </div>

                            <div className="mt-6 pt-3 border-t border-black/5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <div className="flex items-center gap-1.5">
                                {note.photoURL ? (
                                  note.photoURL.length <= 4 ? (
                                    <span className="text-sm">{note.photoURL}</span>
                                  ) : (
                                    <img src={note.photoURL} alt="" className="w-4 h-4 rounded-full object-cover border border-white" referrerPolicy="no-referrer" />
                                  )
                                ) : (
                                  <span className="text-xs">👤</span>
                                )}
                                <span>{note.createdByName}</span>
                              </div>
                              <span>
                                {note.createdAt ? new Date(note.createdAt.seconds * 1000).toLocaleDateString('fa-IR') : "الان"}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* --- ADD NEW WISHLIST ITEM MODAL --- */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/40">
                <h3 className="text-base font-black text-slate-800">افزودن آرزوی جدید 🌸</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">عنوان آرزو</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: سفر به شیراز، خرید کادو تولد، فیلم اینسپشن"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">دسته‌بندی (قفسه آرزو)</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right font-bold text-slate-700"
                  >
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">توضیحات (اختیاری)</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="جزییات، حس خوب یا برنامه‌ریزی اولیه"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right h-20 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">لینک مرتبط / آدرس خرید (اختیاری)</label>
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://example.com/item"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-left font-mono"
                    dir="ltr"
                  />
                  {fetchingPreview && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      در حال بارگذاری پیش‌نمایش لینک...
                    </span>
                  )}
                  {previewData && (
                    <div className="border border-white/50 bg-white/40 backdrop-blur-md p-2 rounded-xl mt-2 flex gap-2">
                      {previewData.image && (
                        <img 
                          src={previewData.image} 
                          alt="preview" 
                          className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/40"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-700 truncate">{previewData.title}</h5>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{previewData.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Picker specifically for Trips or general plans */}
                <div className="space-y-1 text-right" dir="rtl">
                  <label className="text-xs font-bold text-slate-600 block mb-1">تاریخ برنامه‌ریزی / انجام (اختیاری)</label>
                  <JalaliDatePicker
                    value={newDate}
                    onChange={setNewDate}
                    placeholder="انتخاب تاریخ برنامه‌ریزی..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  ثبت آرزو در لیست مشترک
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT WISHLIST ITEM MODAL --- */}
      <AnimatePresence>
        {showEditWishModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/40">
                <h3 className="text-base font-black text-slate-800">ویرایش آرزو ✏️🌸</h3>
                <button
                  onClick={() => {
                    setShowEditWishModal(false);
                    setEditingWish(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>

              <form onSubmit={handleUpdateWish} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">عنوان آرزو</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="مثال: سفر به شیراز، خرید کادو تولد، فیلم اینسپشن"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">دسته‌بندی (قفسه آرزو)</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right font-bold text-slate-700"
                  >
                    {allCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">توضیحات (اختیاری)</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="جزییات، حس خوب یا برنامه‌ریزی اولیه"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right h-20 resize-none font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">لینک مرتبط / آدرس خرید (اختیاری)</label>
                  <input
                    type="url"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://example.com/item"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-left font-mono"
                    dir="ltr"
                  />
                  {fetchingEditPreview && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 font-bold">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      در حال بارگذاری پیش‌نمایش لینک...
                    </span>
                  )}
                  {editPreviewData && (
                    <div className="border border-white/50 bg-white/40 backdrop-blur-md p-2 rounded-xl mt-2 flex gap-2">
                      {editPreviewData.image && (
                        <img 
                          src={editPreviewData.image} 
                          alt="preview" 
                          className="w-10 h-10 object-cover rounded-lg shrink-0 border border-white/40"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-700 truncate">{editPreviewData.title}</h5>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{editPreviewData.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Date Picker specifically for Trips or general plans */}
                <div className="space-y-1 text-right" dir="rtl">
                  <label className="text-xs font-bold text-slate-600 block mb-1">تاریخ برنامه‌ریزی / انجام (اختیاری)</label>
                  <JalaliDatePicker
                    value={editDate}
                    onChange={setEditDate}
                    placeholder="انتخاب تاریخ برنامه‌ریزی..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  بروزرسانی آرزو
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT PROFILE MODAL --- */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/40">
                <h3 className="text-base font-black text-slate-800">ویرایش پروفایل من 👤</h3>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>

              {cropImageSrc ? (
                <div className="flex flex-col items-center space-y-4 pt-2">
                  <div className="text-center">
                    <h4 className="text-sm font-black text-slate-800">برش تصویر پروفایل ✂️</h4>
                    <p className="text-[10px] text-slate-500 mt-1">
                      تصویر را بکشید تا جابجا شود و از لغزنده زیر برای زوم استفاده کنید
                    </p>
                  </div>

                  {/* Circular Crop Viewport */}
                  <div
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-[240px] h-[240px] rounded-full overflow-hidden border-4 border-white shadow-xl relative bg-slate-100 cursor-move select-none"
                  >
                    <img
                      src={cropImageSrc}
                      alt="Crop preview"
                      className="absolute pointer-events-none max-w-none origin-center"
                      style={{
                        width: imageDimensions.width ? `${imageDimensions.width}px` : 'auto',
                        height: imageDimensions.height ? `${imageDimensions.height}px` : 'auto',
                        transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                        transition: isDraggingCrop ? 'none' : 'transform 0.1s ease-out'
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        const naturalWidth = img.naturalWidth;
                        const naturalHeight = img.naturalHeight;
                        const ratio = naturalWidth / naturalHeight;
                        let w = 240;
                        let h = 240;
                        if (ratio > 1) {
                          h = 240;
                          w = 240 * ratio;
                        } else {
                          w = 240;
                          h = 240 / ratio;
                        }
                        setImageDimensions({ width: w, height: h });
                        setCropOffset({
                          x: (240 - w) / 2,
                          y: (240 - h) / 2
                        });
                        setCropScale(1);
                      }}
                    />
                    <div className="absolute inset-0 rounded-full border border-dashed border-white/50 pointer-events-none flex items-center justify-center">
                      <div className="w-12 h-12 border border-white/30 rounded-full" />
                    </div>
                  </div>

                  {/* Zoom Control */}
                  <div className="w-full space-y-1 px-4 text-right">
                    <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>بزرگنمایی: {Math.round(cropScale * 100)}%</span>
                      <span>زوم 🔍</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.05"
                      value={cropScale}
                      onChange={(e) => setCropScale(parseFloat(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => setCropImageSrc(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      لغو
                    </button>
                    <button
                      type="button"
                      onClick={handlePerformCrop}
                      className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center shadow-md shadow-rose-100"
                    >
                      برش و تایید آواتار
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-right">
                  {/* Current / Proposed Avatar Preview and Upload Area */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white/30 rounded-2xl border border-white/50 backdrop-blur-sm shadow-sm gap-3">
                    <div className="relative">
                      {(() => {
                        const isEmoji = editPhotoURL && editPhotoURL.length <= 4;
                        const sizeClasses = "w-20 h-20";
                        if (editPhotoURL && !isEmoji) {
                          return (
                            <img
                              src={editPhotoURL}
                              alt="avatar preview"
                              className={`${sizeClasses} rounded-full object-cover border-4 border-white shadow-md`}
                              referrerPolicy="no-referrer"
                            />
                          );
                        } else if (editPhotoURL && isEmoji) {
                          return (
                            <div className={`${sizeClasses} bg-white rounded-full flex items-center justify-center border-4 border-white shadow-md text-4xl`}>
                              {editPhotoURL}
                            </div>
                          );
                        } else {
                          return (
                            <div className={`${sizeClasses} bg-gradient-to-tr from-rose-400 to-pink-500 text-white rounded-full flex items-center justify-center border-4 border-white shadow-md font-black text-2xl`}>
                              {editDisplayName ? editDisplayName.charAt(0) : "👤"}
                            </div>
                          );
                        }
                      })()}
                      
                      <label className="absolute -bottom-1 -right-1 bg-rose-500 hover:bg-rose-600 text-white w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow border-2 border-white transition-all hover:scale-105" title="آپلود و برش عکس جدید">
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      برای آپلود و برش عکس روی آیکون دوربین 📸 کلیک کنید
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">نام نمایشی شما</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="نام یا لقب قشنگت..."
                      className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">جنسیت شما (مرد یا زن):</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditGender('female')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          editGender === 'female' 
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-500 shadow-md shadow-rose-200 ring-2 ring-rose-300' 
                            : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-white/80'
                        }`}
                      >
                        <span className="text-sm">👩</span>
                        <span>زن (خانم)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditGender('male')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          editGender === 'male' 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 shadow-md shadow-indigo-200 ring-2 ring-indigo-300' 
                            : 'bg-white/50 border-slate-200 text-slate-600 hover:bg-white/80'
                        }`}
                      >
                        <span className="text-sm">👨</span>
                        <span>مرد (آقا)</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium text-right">
                      {editGender === 'female'
                        ? '✨ حالت تقویم سلامت و ثبت چرخه قاعدگی برای شما فعال است.'
                        : '✨ حالت راهنمای همراهی و مراقبت عاشقانه از پارتنر برای شما فعال است.'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 block">انتخاب آواتار از ایموجی‌های آماده</label>
                    <div className="grid grid-cols-7 gap-2 bg-white/20 p-2.5 rounded-2xl border border-white/30">
                      {PRESET_AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditPhotoURL(emoji)}
                          className={`text-xl p-2 rounded-xl hover:bg-white/60 transition-all cursor-pointer ${
                            editPhotoURL === emoji ? "bg-rose-500/10 border border-rose-400/50 scale-110" : "border border-transparent"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">یا آدرس تصویر پروفایل دلخواه (URL یا مسیر عکس)</label>
                    <input
                      type="text"
                      value={editPhotoURL && !PRESET_AVATARS.includes(editPhotoURL) ? editPhotoURL : ""}
                      onChange={(e) => setEditPhotoURL(e.target.value)}
                      placeholder="https://toghrool.ir/uploads/avatars/my-avatar.jpg"
                      className="w-full px-3 py-2.5 glass-input rounded-xl text-xs text-left font-mono"
                      dir="ltr"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className={`w-full py-2.5 mt-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      isSavingProfile ? "opacity-75 cursor-wait" : ""
                    }`}
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره تغییرات...</span>
                      </>
                    ) : (
                      <span>ذخیره تغییرات پروفایل</span>
                    )}
                  </button>
                </form>
              )}

              {/* Partner Management Section */}
              {!cropImageSrc && userProfile.partnerUid && (
                <div className="mt-6 pt-4 border-t border-slate-200/50 text-right" dir="rtl">
                  <h4 className="text-xs font-black text-rose-600 mb-2">مدیریت ارتباط زوجین 💞</h4>
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        {renderAvatar(partnerProfile, "💖", "w-8 h-8 border border-white shadow-sm")}
                        <span 
                          className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm transition-all duration-300 ${
                            isPartnerOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800">{partnerProfile?.displayName || "پارتنر"}</p>
                          <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.2 rounded-md border ${
                            isPartnerOnline 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                              : "bg-slate-100 text-slate-400 border-slate-200"
                          }`}>
                            {isPartnerOnline ? "آنلاین" : "آفلاین"}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">{partnerProfile?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnpairPartner}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 hover:text-rose-800 text-[10px] font-black rounded-xl transition-all cursor-pointer border border-rose-500/10"
                    >
                      قطع اتصال زوج
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD SHELF / CUSTOM CATEGORY MODAL --- */}
      <AnimatePresence>
        {showAddShelfModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/40">
                <h3 className="text-base font-black text-slate-800">افزودن قفسه (دسته‌بندی) جدید 📚</h3>
                <button
                  type="button"
                  onClick={() => setShowAddShelfModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4 text-right">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">عنوان دسته‌بندی جدید</label>
                  <input
                    type="text"
                    value={newShelfLabel}
                    onChange={(e) => setNewShelfLabel(e.target.value)}
                    placeholder="مثال: فیلم‌هایی که باید دید، کافه‌گردی"
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">انتخاب نماد یا ایموجی</label>
                  <div className="flex flex-wrap gap-2 bg-white/20 p-2.5 rounded-2xl border border-white/30">
                    {Object.keys(PRESET_ICONS).map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewShelfIcon(iconName)}
                        className={`p-2 rounded-xl hover:bg-white/60 transition-all cursor-pointer border flex items-center justify-center ${
                          newShelfIcon === iconName 
                            ? "bg-rose-500/10 border-rose-400 scale-115 text-rose-600" 
                            : "border-transparent text-slate-600"
                        }`}
                        title={iconName}
                      >
                        {iconName.length === 1 ? (
                          <span className="text-base">{iconName}</span>
                        ) : (
                          React.createElement(PRESET_ICONS[iconName] || Heart, { className: "w-4 h-4" })
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">انتخاب تم رنگی قفسه</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_COLORS_LIST.map((colorSet) => (
                      <button
                        key={colorSet.name}
                        type="button"
                        onClick={() => setNewShelfColor(colorSet.name)}
                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all cursor-pointer text-center ${colorSet.bg} ${colorSet.color} ${colorSet.border} ${
                          newShelfColor === colorSet.name ? "ring-2 ring-rose-400 scale-[1.03]" : "opacity-80"
                        }`}
                      >
                        {colorSet.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  ایجاد قفسه آرزوی جدید
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* --- ADD SCRAPBOOK NOTE MODAL --- */}
      <AnimatePresence>
        {showAddNoteModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/40">
                <h3 className="text-base font-black text-slate-800">نوشتن یادداشت جدید روی برد 📌</h3>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  بستن
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4 text-right">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">متن یادداشت</label>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="پیام یا یادداشت خودتون رو بنویسید..."
                    className="w-full px-3 py-2.5 glass-input rounded-xl text-sm text-right h-28 resize-none font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">رنگ کاغذ یادداشت چسبان</label>
                  <div className="flex items-center justify-center gap-3 bg-white/20 p-3 rounded-2xl border border-white/30">
                    {[
                      { key: "yellow", name: "زرد", class: "bg-amber-100 border-amber-300" },
                      { key: "pink", name: "صورتی", class: "bg-rose-100 border-rose-300" },
                      { key: "blue", name: "آبی", class: "bg-sky-100 border-sky-300" },
                      { key: "violet", name: "بنفش", class: "bg-purple-100 border-purple-300" },
                      { key: "green", name: "سبز", class: "bg-emerald-100 border-emerald-300" }
                    ].map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setNewNoteColor(col.key)}
                        className={`w-10 h-10 rounded-xl border shadow-sm transition-all cursor-pointer ${col.class} ${
                          newNoteColor === col.key ? "ring-2 ring-rose-500 scale-110" : "opacity-75 hover:opacity-100"
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
                >
                  سنجاق کردن به برد دونفره
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD SWEET MEMORY MODAL --- */}
      <AnimatePresence>
        {showAddMemoryModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 border border-pink-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-5 h-5 text-pink-500" />
                  ثبت خاطره شیرین جدید 📸💖
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddMemoryModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveMemory} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">عنوان خاطره</label>
                  <input
                    type="text"
                    value={memoryFormTitle}
                    onChange={(e) => setMemoryFormTitle(e.target.value)}
                    placeholder="مثال: شام اولین سالگردمون 🎂، سفر شمال بارونی ☔"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">تاریخ خاطره</label>
                  <JalaliDatePicker
                    value={memoryFormDate}
                    onChange={setMemoryFormDate}
                    placeholder="انتخاب تاریخ وقوع خاطره..."
                  />
                </div>

                {/* Image Upload Area with 16:9 Cropper Integration */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 block">تصویر خاطره (قاب ۱۶:۹)</label>
                    <span className="text-[10px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-full">
                      اختیاری با امکان کادربندی دقیق ✂️
                    </span>
                  </div>
                  
                  {memoryFormImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border-2 border-pink-200/80 aspect-video bg-slate-900 shadow-md group">
                        <img
                          src={memoryFormImageUrl}
                          alt="پیش‌نمایش خاطره"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                          <button
                            type="button"
                            onClick={() => {
                              setMemoryCropImageSrc(memoryRawImageSrc || memoryFormImageUrl);
                            }}
                            className="px-3.5 py-1.5 bg-white hover:bg-pink-50 text-slate-800 text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-pink-500" />
                            تنظیم مجدد کادر ✂️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMemoryFormImageUrl("");
                              setMemoryRawImageSrc(null);
                            }}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all cursor-pointer"
                            title="حذف تصویر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold px-1 text-slate-600">
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          عکس متناسب با قاب ۱۶:۹ کادربندی شد
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMemoryCropImageSrc(memoryRawImageSrc || memoryFormImageUrl);
                          }}
                          className="text-pink-600 hover:text-pink-700 underline cursor-pointer"
                        >
                          تغییر برش کادر ↺
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const dataUrl = reader.result as string;
                            setMemoryRawImageSrc(dataUrl);
                            setMemoryCropImageSrc(dataUrl);
                            setMemoryCropScale(1);
                            setMemoryCropOffset({ x: 0, y: 0 });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="border-2 border-dashed border-pink-200 hover:border-pink-400 bg-pink-50/20 hover:bg-pink-50/40 rounded-2xl p-5 text-center transition-all cursor-pointer relative group"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result as string;
                              setMemoryRawImageSrc(dataUrl);
                              setMemoryCropImageSrc(dataUrl);
                              setMemoryCropScale(1);
                              setMemoryCropOffset({ x: 0, y: 0 });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-pink-100 flex items-center justify-center text-pink-500 shadow-sm group-hover:scale-110 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black text-slate-700">انتخاب عکس و برش در قاب ۱۶:۹ خاطرات 🖼️</span>
                        <span className="text-[10px] text-slate-400 font-medium">کلیک کنید یا عکس را بکشید و رها کنید (امکان زوم و کادربندی دلخواه)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">داستان و متن خاطره</label>
                  <textarea
                    value={memoryFormContent}
                    onChange={(e) => setMemoryFormContent(e.target.value)}
                    placeholder="اینجا بنویس چه اتفاقی افتاد و چقدر بهمون خوش گذشت... 📝💞"
                    rows={4}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-right font-semibold leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUploadingMemoryImage}
                  className="w-full py-3 mt-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-100 text-white text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingMemoryImage ? "در حال پردازش و ثبت... ⏳" : "ثبت و ماندگار کردن خاطره 💕"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MEMORY IMAGE CROPPER MODAL (16:9) --- */}
      <AnimatePresence>
        {memoryCropImageSrc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[70]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-pink-100 flex flex-col text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-800">
                      کادربندی تصویر خاطره (نسبت ۱۶:۹) 📸
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      عکس را بکشید تا جابجا شود یا با لغزنده زیر زوم را تنظیم کنید
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoryCropImageSrc(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  title="بستن"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Viewport Frame (16:9 Aspect Ratio) */}
              <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-inner select-none touch-none border-2 border-slate-200">
                <div
                  ref={memoryCropViewportRef}
                  onMouseDown={handleMemoryCropMouseDown}
                  onMouseMove={handleMemoryCropMouseMove}
                  onMouseUp={handleMemoryCropMouseUp}
                  onMouseLeave={handleMemoryCropMouseUp}
                  onTouchStart={handleMemoryCropTouchStart}
                  onTouchMove={handleMemoryCropTouchMove}
                  onTouchEnd={handleMemoryCropTouchEnd}
                  className="w-full h-full relative cursor-grab active:cursor-grabbing flex items-center justify-center"
                >
                  <img
                    src={memoryCropImageSrc}
                    alt="Memory crop preview"
                    className="absolute pointer-events-none max-w-none origin-center"
                    style={{
                      width: memoryImageDimensions.width ? `${memoryImageDimensions.width}px` : 'auto',
                      height: memoryImageDimensions.height ? `${memoryImageDimensions.height}px` : 'auto',
                      transform: `translate(${memoryCropOffset.x}px, ${memoryCropOffset.y}px) scale(${memoryCropScale})`,
                      transition: isDraggingMemoryCrop ? 'none' : 'transform 0.1s ease-out'
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const naturalWidth = img.naturalWidth || 800;
                      const naturalHeight = img.naturalHeight || 600;
                      const imgRatio = naturalWidth / naturalHeight;
                      
                      const rect = memoryCropViewportRef.current?.getBoundingClientRect();
                      const vw = rect?.width || 440;
                      const vh = rect?.height || (vw * 9 / 16);
                      const vpRatio = vw / vh;

                      let w = vw;
                      let h = vh;
                      if (imgRatio > vpRatio) {
                        h = vh;
                        w = vh * imgRatio;
                      } else {
                        w = vw;
                        h = vw / imgRatio;
                      }
                      setMemoryImageDimensions({ width: w, height: h });
                      setMemoryCropOffset({
                        x: (vw - w) / 2,
                        y: (vh - h) / 2
                      });
                      setMemoryCropScale(1);
                    }}
                  />

                  {/* Rule-of-thirds grid overlay */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/30 rounded-2xl">
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div className="border-r border-b border-white/20" />
                    <div />
                  </div>

                  {/* Badge */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-[10px] text-white font-bold px-2 py-0.5 rounded-lg pointer-events-none flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-pink-400" />
                    قاب استاندارد خاطرات (۱۶:۹)
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>بزرگنمایی: {Math.round(memoryCropScale * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => {
                        const rect = memoryCropViewportRef.current?.getBoundingClientRect();
                        const vw = rect?.width || 440;
                        const vh = rect?.height || (vw * 9 / 16);
                        const w = memoryImageDimensions.width || vw;
                        const h = memoryImageDimensions.height || vh;
                        setMemoryCropOffset({
                          x: (vw - w) / 2,
                          y: (vh - h) / 2
                        });
                        setMemoryCropScale(1);
                      }}
                      className="text-pink-600 hover:text-pink-700 underline text-[11px] cursor-pointer"
                    >
                      بازنشانی موقعیت ↺
                    </button>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.05"
                    value={memoryCropScale}
                    onChange={(e) => setMemoryCropScale(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMemoryCropImageSrc(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handlePerformMemoryCrop}
                    className="flex-[2] py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-xs rounded-xl shadow-md shadow-pink-200 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>برش و ثبت کادر خاطره ✨</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- VIEW SWEET MEMORY DETAIL MODAL --- */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/95 border border-pink-100 rounded-3xl w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] text-right"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-5 h-5 text-pink-500" />
                  خاطره شیرین مشترک 📸💖
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedMemory(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedMemory.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-100 aspect-video bg-slate-50 relative shadow-inner">
                    <img
                      src={selectedMemory.imageUrl}
                      alt={selectedMemory.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    🗓️ {selectedMemory.date}
                  </span>
                  <span className="font-black text-pink-500 bg-pink-50 px-3 py-1.5 rounded-xl flex items-center gap-1">
                    ✍️ ثبت شده توسط: {selectedMemory.createdByName}
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-black text-slate-800 leading-snug">
                  {selectedMemory.title}
                </h2>

                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 max-h-[300px] overflow-y-auto">
                  <p className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-semibold">
                    {selectedMemory.content}
                  </p>
                </div>

                {/* --- MEMORY REACTIONS SECTION --- */}
                <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100/70 space-y-3">
                  <span className="text-xs font-black text-slate-700 block">ری‌اکشن‌های عاشقانه به این خاطره 💕:</span>
                  
                  {/* Reaction Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {["❤️", "😍", "🥹", "😂", "🔥", "🌸", "✨"].map(emoji => {
                      const reactions = selectedMemory.reactions || [];
                      const count = reactions.filter(r => r.emoji === emoji).length;
                      const userReacted = reactions.some(r => r.emoji === emoji && r.uid === userProfile.uid);

                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleMemoryReaction(selectedMemory.id, emoji)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border ${
                            userReacted
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-500 shadow-md shadow-rose-200 scale-105'
                              : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200 hover:border-pink-200'
                          }`}
                        >
                          <span className="text-base">{emoji}</span>
                          {count > 0 && <span>{toPersianDigits(count)}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Reaction Authors summary */}
                  {(() => {
                    const reactions = selectedMemory.reactions || [];
                    if (reactions.length === 0) return null;
                    return (
                      <div className="text-[11px] font-bold text-slate-500 pt-1 flex flex-wrap gap-2">
                        {reactions.map((r, i) => (
                          <span key={i} className="bg-white/90 px-2 py-0.5 rounded-lg border border-rose-100 text-slate-700">
                            {r.userName}: {r.emoji}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* --- MEMORY COMMENTS SECTION --- */}
                <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <MessageCircleHeart className="w-4 h-4 text-pink-500" />
                      <span>نظرات و گفتگوهای دونفره روی این خاطره</span>
                      <span className="text-xs font-bold text-slate-400">
                        ({toPersianDigits((selectedMemory.comments || []).length)})
                      </span>
                    </h4>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {(selectedMemory.comments || []).length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-xs font-bold bg-white/60 rounded-xl border border-dashed border-slate-200">
                        هنوز نظری ثبت نشده است. اولین نفری باش که برای این خاطره یادداشت می‌نویسه! 💌
                      </div>
                    ) : (
                      (selectedMemory.comments || []).map((comm) => (
                        <div
                          key={comm.id}
                          className="bg-white p-3 rounded-xl border border-slate-100 shadow-xs flex items-start justify-between gap-2 text-right"
                        >
                          <div className="flex items-start gap-2.5 flex-1">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-400 to-rose-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {comm.userName ? comm.userName.charAt(0) : "💕"}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black text-slate-800">{comm.userName}</span>
                                {comm.createdAt && (
                                  <span className="text-[10px] text-slate-400 font-semibold">
                                    {formatPersianDate(comm.createdAt.slice(0, 10))}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap break-words">
                                {comm.text}
                              </p>
                            </div>
                          </div>

                          {comm.uid === userProfile.uid && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMemoryComment(selectedMemory.id, comm.id)}
                              className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                              title="حذف نظر من"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input Form */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                    <input
                      type="text"
                      value={memoryCommentText}
                      onChange={(e) => setMemoryCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddMemoryComment(selectedMemory.id);
                        }
                      }}
                      placeholder="نظر یا حرف دلت درباره این خاطره رو بنویس... 💬"
                      className="flex-1 px-3 py-2 bg-white rounded-xl text-xs font-bold border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-300"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingComment || !memoryCommentText.trim()}
                      onClick={() => handleAddMemoryComment(selectedMemory.id)}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingComment ? "در حال ثبت..." : "ارسال"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t border-slate-100/60">
                <button
                  onClick={() => {
                    if (window.confirm("آیا از حذف این خاطره مطمئن هستید؟")) {
                      handleDeleteMemory(selectedMemory.id);
                      setSelectedMemory(null);
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف خاطره</span>
                </button>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:shadow-lg hover:shadow-pink-100 text-white text-xs sm:text-sm font-black rounded-xl transition-all cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PERIOD TRACKER: DAILY LOG MODAL --- */}
      <AnimatePresence>
        {showLogPeriodModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[90] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white/90 backdrop-blur-md border border-pink-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-rose-500 fill-rose-500" />
                  ثبت وضعیت سلامت روزانه 🩸
                </h3>
                <button 
                  onClick={() => setShowLogPeriodModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePeriodLog} className="space-y-4 text-right">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Log Date picker */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">تاریخ گزارش:</label>
                    <JalaliDatePicker
                      value={logFormDate}
                      onChange={(dateVal) => {
                        setLogFormDate(dateVal);
                        // If log exists for this date, prefill
                        const existing = periodLogs.find(l => l.date === dateVal);
                        if (existing) {
                          setLogFormFlow(existing.flow || "medium");
                          setLogFormMood(existing.mood || "neutral");
                          setLogFormSymptoms(existing.symptoms || []);
                          setLogFormNotes(existing.notes || "");
                          setLogFormIsPeriodStart(existing.isPeriodStart || false);
                        } else {
                          setLogFormFlow("medium");
                          setLogFormMood("neutral");
                          setLogFormSymptoms([]);
                          setLogFormNotes("");
                          setLogFormIsPeriodStart(false);
                        }
                      }}
                      placeholder="انتخاب تاریخ گزارش..."
                    />
                  </div>

                  {/* Period Start Toggle Switch */}
                  <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 rounded-xl px-4 py-2 mt-4 sm:mt-5">
                    <span className="text-xs font-black text-rose-700">شروع دوره جدید پریود؟</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={logFormIsPeriodStart}
                        onChange={(e) => setLogFormIsPeriodStart(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
                    </label>
                  </div>
                </div>

                {/* Bleeding flow levels */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">میزان خونریزی:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: "none", name: "هیچ‌کدام" },
                      { key: "light", name: "کم / سبک" },
                      { key: "medium", name: "متوسط" },
                      { key: "heavy", name: "زیاد / شدید" }
                    ].map((flow) => (
                      <button
                        key={flow.key}
                        type="button"
                        onClick={() => setLogFormFlow(flow.key)}
                        className={`py-2 px-1 text-center rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                          logFormFlow === flow.key
                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {flow.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Emotional/Mood levels */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">وضعیت روحی و عاطفی:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "happy", name: "خوشحال 😊" },
                      { key: "sensitive", name: "حساس 🥺" },
                      { key: "tired", name: "خسته 😴" },
                      { key: "crampy", name: "کلافه 🌪️" },
                      { key: "anxious", name: "مضطرب 😰" },
                      { key: "neutral", name: "معمولی 😐" }
                    ].map((mood) => (
                      <button
                        key={mood.key}
                        type="button"
                        onClick={() => setLogFormMood(mood.key)}
                        className={`py-2 text-center rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                          logFormMood === mood.key
                            ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {mood.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Physical Symptoms */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">نشانه‌ها و علائم بدنی (چندگزینه‌ای):</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "cramps", name: "درد شکم 💥" },
                      { key: "headache", name: "سردرد 🤕" },
                      { key: "bloating", name: "نفخ بدنی 🎈" },
                      { key: "backache", name: "کمردرد 🪵" },
                      { key: "fatigue", name: "خستگی 🥱" },
                      { key: "tender_breasts", name: "حساسیت سینه‌ها 🍒" },
                      { key: "insomnia", name: "بی‌خوابی 🦉" }
                    ].map((sym) => {
                      const isChecked = logFormSymptoms.includes(sym.key);
                      return (
                        <button
                          key={sym.key}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setLogFormSymptoms(logFormSymptoms.filter(s => s !== sym.key));
                            } else {
                              setLogFormSymptoms([...logFormSymptoms, sym.key]);
                            }
                          }}
                          className={`py-1.5 px-3 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                              : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                          }`}
                        >
                          {sym.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text Notes */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-1.5">یادداشت شخصی یا احساسات:</label>
                  <textarea
                    value={logFormNotes}
                    onChange={(e) => setLogFormNotes(e.target.value)}
                    placeholder="می‌توانید بنویسید چه حسی دارید یا پارتنرتان چطور می‌تواند کمکتان کند..."
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 h-20 resize-none font-medium"
                  />
                </div>

                {/* Submit action */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ذخیره و به اشتراک‌گذاری با یار 💕
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PERIOD TRACKER: SETTINGS MODAL --- */}
      <AnimatePresence>
        {showPeriodSettingsModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[90] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-md border border-slate-100 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-slate-500" />
                  تنظیمات ردیاب عادت ماهانه ⚙️
                </h3>
                <button 
                  onClick={() => setShowPeriodSettingsModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tab Selector inside Modal */}
              <div className="flex border-b border-slate-100 mb-4">
                <button
                  type="button"
                  onClick={() => setSettingsModalTab("general")}
                  className={`flex-1 pb-2 text-xs font-black transition-all border-b-2 text-center ${
                    settingsModalTab === "general" 
                      ? "border-rose-500 text-rose-600 font-extrabold" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  تنظیمات مشترک (زوجین) 👥
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsModalTab("advanced")}
                  className={`flex-1 pb-2 text-xs font-black transition-all border-b-2 text-center ${
                    settingsModalTab === "advanced" 
                      ? "border-purple-500 text-purple-600 font-extrabold" 
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  تنظیمات پیشرفته (شخصی) 🔐
                </button>
              </div>

              {settingsModalTab === "general" ? (
                <form onSubmit={handleSavePeriodSettings} className="space-y-4 text-right">
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1.5">تاریخ شروع آخرین دوره پریود:</label>
                    <JalaliDatePicker
                      value={settingsFormLastPeriodStartDate}
                      onChange={setSettingsFormLastPeriodStartDate}
                      placeholder="انتخاب تاریخ شروع..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1.5">طول چرخه (روز):</label>
                      <input
                        type="number"
                        min="15"
                        max="50"
                        required
                        value={settingsFormCycleLength}
                        onChange={(e) => setSettingsFormCycleLength(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1.5">طول خونریزی (روز):</label>
                      <input
                        type="number"
                        min="2"
                        max="15"
                        required
                        value={settingsFormPeriodLength}
                        onChange={(e) => setSettingsFormPeriodLength(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {personalUseAdvanced && (
                    <p className="text-[10px] text-purple-600 font-bold bg-purple-50 p-2 rounded-xl leading-relaxed">
                      💡 در حال حاضر تنظیمات پیشرفته و شخصی شما فعال است. تقویم از داده‌های شخصی شما استفاده می‌کند. برای استفاده از داده‌های مشترک زوجین بالا، در تب تنظیمات پیشرفته گزینه انصراف را کلیک کنید.
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPeriodSettingsModal(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      لغو
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-rose-100"
                    >
                      به‌روزرسانی تنظیمات
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSavePersonalPeriodSettings} className="space-y-4 text-right">
                  {/* Personal advanced settings info */}
                  <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3 text-[11px] text-purple-800 font-semibold leading-relaxed">
                    با تکمیل این بخش، بازه‌های پیش‌بینی تقویم عادت ماهانه منحصراً برای حساب شما شخصی‌سازی می‌شود و اطلاعات مشترک زوجین نادیده گرفته خواهد شد. 🔐
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-xs font-black text-slate-700">فعال‌سازی تنظیمات پیشرفته شخصی</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={personalUseAdvanced}
                        onChange={(e) => setPersonalUseAdvanced(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Date picker for personal starting date */}
                  <div>
                    <label className="block text-xs font-black text-slate-600 mb-1">تاریخ شروع آخرین قاعدگی شما:</label>
                    <JalaliDatePicker
                      value={personalLastPeriodStartDate}
                      onChange={setPersonalLastPeriodStartDate}
                      placeholder="اگر خالی باشد از تاریخ مشترک استفاده می‌شود..."
                    />
                  </div>

                  {/* Cycle Ranges (Min, Max, Typical) */}
                  <div className="space-y-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[11px] font-black text-slate-500 block">بازه طول چرخه قاعدگی (روز):</span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 mb-1">حداقل:</label>
                        <input
                          type="number"
                          min="15"
                          max="45"
                          required
                          value={personalCycleMin}
                          onChange={(e) => setPersonalCycleMin(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 mb-1">متوسط (اصلی):</label>
                        <input
                          type="number"
                          min="15"
                          max="50"
                          required
                          value={personalCycleTypical}
                          onChange={(e) => setPersonalCycleTypical(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-600 mb-1">حداکثر:</label>
                        <input
                          type="number"
                          min="20"
                          max="55"
                          required
                          value={personalCycleMax}
                          onChange={(e) => setPersonalCycleMax(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Period length */}
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">متوسط مدت قاعدگی (روز):</label>
                      <input
                        type="number"
                        min="2"
                        max="15"
                        required
                        value={personalPeriodLength}
                        onChange={(e) => setPersonalPeriodLength(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    {/* Show PMS predictions */}
                    <div>
                      <label className="block text-xs font-black text-slate-600 mb-1">نمایش پیش‌بینی PMS:</label>
                      <select
                        value={personalShowPmsPredictions ? "true" : "false"}
                        onChange={(e) => setPersonalShowPmsPredictions(e.target.value === "true")}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="true">بله، نشان بده</option>
                        <option value="false">خیر، فاز لوتئال معمولی</option>
                      </select>
                    </div>
                  </div>

                  {/* PMS Notification Preferences */}
                  <div className="bg-purple-50/40 p-3 rounded-2xl border border-purple-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-purple-900">اعلان پیش‌بینی شروع PMS 🔔</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={personalPmsNotificationEnabled}
                          onChange={(e) => setPersonalPmsNotificationEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {personalPmsNotificationEnabled && (
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[11px] font-black text-slate-500">ارسال یادآور چند روز قبل از PMS؟</span>
                        <select
                          value={personalPmsNotificationDaysBefore}
                          onChange={(e) => setPersonalPmsNotificationDaysBefore(Number(e.target.value))}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        >
                          <option value="1">۱ روز قبل</option>
                          <option value="2">۲ روز قبل</option>
                          <option value="3">۳ روز قبل</option>
                          <option value="4">۴ روز قبل</option>
                          <option value="5">۵ روز قبل</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalUseAdvanced(false);
                        setShowPeriodSettingsModal(false);
                        triggerAlert("تنظیمات ردیاب شما به حالت زوجین مشترک بازگشت. 👥");
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      حالت مشترک زوجین
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer text-center shadow-md shadow-purple-100"
                    >
                      ذخیره تنظیمات پیشرفته
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CUSTOM CONFIRM MODAL --- */}
      <AnimatePresence>
        {customConfirm?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/85 backdrop-blur-md border border-white/60 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              <h3 className="text-base font-black text-slate-800 mb-2">تایید عملیات ⚠️</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                {customConfirm.message}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100"
                >
                  تایید و ادامه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CUSTOM ALERT MODAL --- */}
      <AnimatePresence>
        {customAlert?.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white/85 backdrop-blur-md border border-white/60 rounded-3xl w-full max-w-sm p-6 shadow-2xl"
            >
              <h3 className="text-base font-black text-slate-800 mb-2">پیام سیستم 💬</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium">
                {customAlert.message}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCustomAlert(null)}
                  className="px-6 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-100"
                >
                  فهمیدم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 py-2.5 px-3 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] pb-4">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-between w-full">
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "wishlist"
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="ویش‌لیست مشترک"
          >
            <Heart className={`w-5 h-5 ${activeTab === "wishlist" ? "fill-white text-white" : "text-slate-400"}`} />
          </button>

          <button
            onClick={() => setActiveTab("hall")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "hall"
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md shadow-amber-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="تالار افتخارات"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab("calendar")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "calendar"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md shadow-violet-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="تقویم دو نفره"
          >
            <CalendarIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab("memories")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "memories"
                ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="خاطرات مشترک"
          >
            <Camera className={`w-5 h-5 ${activeTab === "memories" ? "fill-white text-white" : "text-pink-500"}`} />
          </button>

          <button
            onClick={() => setActiveTab("period")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "period"
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="ردیاب پریود"
          >
            <Droplet className={`w-5 h-5 ${activeTab === "period" ? "fill-white text-white" : "text-rose-500"}`} />
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
              activeTab === "finance"
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200 scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="مدیریت مالی"
          >
            <Wallet className="w-5 h-5" />
          </button>

          {customTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(`tab-${tab.id}`)}
              className={`p-2.5 rounded-xl transition-all flex flex-col items-center justify-center shrink-0 ${
                activeTab === `tab-${tab.id}`
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200 scale-105"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
              title={tab.title}
            >
              <span className="text-base sm:text-lg leading-none">{tab.icon || "✨"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
