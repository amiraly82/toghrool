import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Heart, Plus, Trash2, Calendar as CalendarIcon, BookOpen, Film, ShoppingBag, MapPin, Compass, 
  Send, ExternalLink, Flame, Sparkles, LogOut, CheckCircle, Bell, BellOff, RefreshCw, ChevronLeft, ChevronRight, 
  MessageCircleHeart, X, Edit2, User, Palette, Layers, Pizza, Coffee, Music, Smile, Camera, Gift, Settings,
  Droplet, HeartHandshake, Search, Wallet, Smartphone, Download, Maximize2, Lock, Unlock,
  Copy, Check, Key, Share2, MoreHorizontal, Zap, SlidersHorizontal, Minus, MessageCircle
} from "lucide-react";

import FinanceSection from "./FinanceSection";
import ImpoPeriodTracker from "./ImpoPeriodTracker";
import JalaliDatePicker from "./JalaliDatePicker";
import DateRouletteModal from "./DateRouletteModal";
import EmotionalStatusSheet from "./EmotionalStatusSheet";
import EmpathyCoPilotCard from "./EmpathyCoPilotCard";
import DailyQuestionCard from "./DailyQuestionCard";
import DailyQuestionModal from "./DailyQuestionModal";
import PartnerCheatSheetModal from "./PartnerCheatSheetModal";
import WhiteFlagModal from "./WhiteFlagModal";
import WhiteFlagReceivedModal from "./WhiteFlagReceivedModal";
import AnniversaryModal, { calculateDaysBetween } from "./AnniversaryModal";
import PartnerHubSheet from "./PartnerHubSheet";
import { LexGuidanceCard } from "./LexGuidanceCard";
import { LexUnderlineTabs, LexEmptyState, LexSectionHeader, LexWaveStrip } from "./LexUI";
import { getGenderTheme } from "../utils/genderTheme";
import { NeoWishSticker, NeoCoolHeartMascot, NeoSparkle } from "./NeoBrutalStickers";
import { getTehranDateString } from "../utils/dailyQuestions";
import {
  triggerDeviceNotification,
  triggerHardwareVibration,
  requestDeviceNotificationPermission,
  subscribeUserToPushNotifications,
  playHeartbeatAudio,
  HEARTBEAT_VIBRATION_PATTERN
} from "../utils/deviceNotifications";
import { getNeedStatusOption, getBatteryVisual } from "../utils/emotionalStatus";
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
import { WishlistItem, UserProfile, LinkPreview, Poke, Memory, MemoryComment, MemoryReaction, ImpoPeriodSettings, WishlistBudget } from "../types";
import { calculateCycleStatus } from "../utils/impoCycleEngine";
import { fetchFromPhpApi, clearAuthSession } from "../apiClient";

interface DashboardProps {
  userProfile: UserProfile;
  onRefreshProfile: () => void;
  onUpdateUserProfile?: (updated: UserProfile) => void;
  onOpenPairingModal?: () => void;
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
  { name: "rose", label: "صورتی پاستلی", bg: "bg-[#EBA2F8]", border: "border-[#E5ADD2]", color: "text-[#1C1C1C]", barHex: "#EBA2F8" },
  { name: "pink", label: "گلبهی ملایم", bg: "bg-[#F9C6B8]", border: "border-[#EAAC9C]", color: "text-[#1C1C1C]", barHex: "#F9C6B8" },
  { name: "emerald", label: "سبز مریم‌گلی", bg: "bg-[#A7B86C]", border: "border-[#94A659]", color: "text-[#1C1C1C]", barHex: "#A7B86C" },
  { name: "blue", label: "آبی پودری", bg: "bg-[#A9ABEE]", border: "border-[#9EB9E8]", color: "text-[#1C1C1C]", barHex: "#A9ABEE" },
  { name: "violet", label: "یاسی ملایم", bg: "bg-[#E2C9F4]", border: "border-[#CEB0E4]", color: "text-[#1C1C1C]", barHex: "#E2C9F4" },
  { name: "amber", label: "زرد کره‌ای", bg: "bg-[#FFFF66]", border: "border-[#E5C954]", color: "text-[#1C1C1C]", barHex: "#FFFF66" },
  { name: "indigo", label: "سبز روشن", bg: "bg-[#DCE6B5]", border: "border-[#C6D49A]", color: "text-[#1C1C1C]", barHex: "#DCE6B5" },
  { name: "teal", label: "شنی گرم", bg: "bg-[#E9E7E1]", border: "border-[#DED9C8]", color: "text-[#1C1C1C]", barHex: "#A7B86C" }
];

const PRESET_AVATARS = ["🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🦄", "💖", "✨", "🧸", "🐣", "🥑", "🍕"];

// Default shelves (categories)
const DEFAULT_CATEGORIES = [
  { id: "place", label: "جاهایی که بریم", iconName: "MapPin", color: "text-[#1C1C1C]", bg: "bg-[#A7B86C]", border: "border-[#94A659]", barHex: "#A7B86C", icon: MapPin },
  { id: "buy", label: "خریدنی‌ها", iconName: "ShoppingBag", color: "text-[#1C1C1C]", bg: "bg-[#A9ABEE]", border: "border-[#9EB9E8]", barHex: "#A9ABEE", icon: ShoppingBag },
  { id: "trip", label: "سفرهامون", iconName: "Compass", color: "text-[#1C1C1C]", bg: "bg-[#EBA2F8]", border: "border-[#E5ADD2]", barHex: "#EBA2F8", icon: Compass },
  { id: "book", label: "کتاب‌هایی که بخونیم", iconName: "BookOpen", color: "text-[#1C1C1C]", bg: "bg-[#FFFF66]", border: "border-[#E5C954]", barHex: "#FFFF66", icon: BookOpen },
  { id: "movie", label: "فیلم‌هایی که ببینیم", iconName: "Film", color: "text-[#1C1C1C]", bg: "bg-[#F9C6B8]", border: "border-[#EAAC9C]", barHex: "#F9C6B8", icon: Film }
];

// Helper to render Neobrutalist user avatars with crisp 2px solid #1C1C1C border & lip shadow
const renderAvatar = (profile: UserProfile | null, fallbackLetter = "❤️", sizeClasses = "w-10 h-10", ringClasses = "") => {
  if (!profile) {
    return (
      <div className={`${sizeClasses} ${ringClasses} bg-[#A9ABEE] rounded-full flex items-center justify-center border-[1.5px] border-[#1C1C1C] text-xs font-bold text-[#1C1C1C]`}>
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
        className={`${sizeClasses} ${ringClasses} rounded-full object-cover border-[1.5px] border-[#1C1C1C] bg-[#A9ABEE]`}
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as any).src = "https://api.dicebear.com/7.x/adventurer/svg?seed=" + profile.uid;
        }}
      />
    );
  } else if (profile.photoURL && isEmoji) {
    return (
      <div className={`${sizeClasses} ${ringClasses} bg-[#A9ABEE] rounded-full flex items-center justify-center border-[1.5px] border-[#1C1C1C] text-lg`}>
        {profile.photoURL}
      </div>
    );
  } else {
    const initial = profile.displayName ? profile.displayName.charAt(0) : "💕";
    return (
      <div className={`${sizeClasses} ${ringClasses} bg-[#EBA2F8] text-[#1C1C1C] rounded-full flex items-center justify-center border-[1.5px] border-[#1C1C1C] font-bold text-sm`}>
        {initial}
      </div>
    );
  }
};

export default function Dashboard({ userProfile, onRefreshProfile, onUpdateUserProfile, onOpenPairingModal }: DashboardProps) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [pokes, setPokes] = useState<Poke[]>([]);
  const [activeTab, setActiveTab] = useState<string>("wishlist");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [periodLogTrigger, setPeriodLogTrigger] = useState<number>(0);

  // Dynamic Gender Theme (Male: Sky Blue #38BDF8 | Female: Blossom Pink #FB7185)
  const [currentGender, setCurrentGender] = useState<"female" | "male">(
    () => userProfile?.gender || "male"
  );

  useEffect(() => {
    if (userProfile?.gender) {
      setCurrentGender(userProfile.gender);
    }
  }, [userProfile?.gender]);

  const theme = getGenderTheme(currentGender);

  const handleToggleGender = async () => {
    const nextGender = currentGender === "male" ? "female" : "male";
    setCurrentGender(nextGender);
    if (onUpdateUserProfile) {
      onUpdateUserProfile({
        ...userProfile,
        gender: nextGender
      });
    }
    try {
      await fetchFromPhpApi("updateProfile", { gender: nextGender });
    } catch (err) {
      console.warn("Could not persist gender update:", err);
    }
  };

  // Memories states
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [memoryFormTitle, setMemoryFormTitle] = useState("");
  const [memoryFormDate, setMemoryFormDate] = useState("");
  const [memoryFormContent, setMemoryFormContent] = useState("");
  const [memoryFormImageUrl, setMemoryFormImageUrl] = useState("");
  const [memoryFormIsTimeCapsule, setMemoryFormIsTimeCapsule] = useState(false);
  const [memoryFormUnlockDate, setMemoryFormUnlockDate] = useState("");
  const [isUploadingMemoryImage, setIsUploadingMemoryImage] = useState(false);
  const [memoryCommentText, setMemoryCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showDailyQuestionModal, setShowDailyQuestionModal] = useState(false);
  const [dailyQuestionRefreshTrigger, setDailyQuestionRefreshTrigger] = useState(0);
  const hasCheckedDailyAutoPopup = useRef(false);
  const [copiedCoupleCode, setCopiedCoupleCode] = useState(false);
  const notifiedPokeIds = useRef<Set<string>>(new Set());
  const hasInitializedPokes = useRef(false);

  const handleCopyCoupleCode = () => {
    if (userProfile?.coupleCode) {
      navigator.clipboard.writeText(userProfile.coupleCode);
      setCopiedCoupleCode(true);
      triggerHardwareVibration([80, 50, 80]);
      setTimeout(() => setCopiedCoupleCode(false), 2000);
    }
  };

  const handleShareCoupleCode = async () => {
    if (!userProfile?.coupleCode) return;
    const shareText = `سلام عزیزم! با این کد در اپلیکیشن دونفره طغرل به من وصل شو:\nکد اتصال شما: ${userProfile.coupleCode}\nورود مستقیم: https://toghrool.ir`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "کد اتصال در اپلیکیشن طغرل",
          text: shareText,
          url: "https://toghrool.ir"
        });
      } catch (e) {
        handleCopyCoupleCode();
      }
    } else {
      handleCopyCoupleCode();
    }
  };

  const [activeLovePingAlert, setActiveLovePingAlert] = useState<Poke | null>(null);
  const [activeWhiteFlagAlert, setActiveWhiteFlagAlert] = useState<Poke | null>(null);
  const [showPartnerCheatSheetModal, setShowPartnerCheatSheetModal] = useState(false);
  const [showWhiteFlagModal, setShowWhiteFlagModal] = useState(false);
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showPartnerHub, setShowPartnerHub] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showMemoriesSearch, setShowMemoriesSearch] = useState(false);
  const [openWishMenuId, setOpenWishMenuId] = useState<string | null>(null);
  const [openReactionMemoryId, setOpenReactionMemoryId] = useState<string | null>(null);
  const [empathyDismissed, setEmpathyDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("empathy_copilot_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const getNotifiedPokeIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem("toghrool_notified_poke_ids");
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  const markPokeIdNotified = (id: string) => {
    try {
      const set = getNotifiedPokeIds();
      set.add(id);
      const arr = Array.from(set).slice(-150);
      localStorage.setItem("toghrool_notified_poke_ids", JSON.stringify(arr));
    } catch {}
  };

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
  const [isStandalone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  });

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

  // Lightbox modal state for full-size uncropped memory preview
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; date?: string } | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const [newBudget, setNewBudget] = useState<WishlistBudget>("medium");
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
  const [editBudget, setEditBudget] = useState<WishlistBudget>("medium");
  const [editDesc, setEditDesc] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editDate, setEditDate] = useState("");
  const [fetchingEditPreview, setFetchingEditPreview] = useState(false);
  const [editPreviewData, setEditPreviewData] = useState<LinkPreview | null>(null);

  // Phase 1: Emotional Status & Date Roulette States
  const [myBatteryLevel, setMyBatteryLevel] = useState<number>(userProfile.batteryLevel ?? 80);
  const [myNeedStatus, setMyNeedStatus] = useState<string>(userProfile.needStatus ?? "calm");
  const [showEmotionalStatusSheet, setShowEmotionalStatusSheet] = useState(false);
  const [isSendingLovePing, setIsSendingLovePing] = useState(false);
  const [showDateRoulette, setShowDateRoulette] = useState(false);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'economy' | 'medium' | 'luxury'>('all');

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

  // Period Tracker State (for Shared Calendar overlay)
  const [periodSettings, setPeriodSettings] = useState<{
    cycleLength: number;
    periodLength: number;
    lastPeriodStartDate: string;
  } | null>(null);
  const [periodLogs, setPeriodLogs] = useState<any[]>([]);

  // Notification permission check and background Web Push auto-registration
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const isGranted = Notification.permission === "granted";
      setNotificationsEnabled(isGranted);
      if (isGranted && userProfile?.uid) {
        subscribeUserToPushNotifications().catch(() => {});
      }
    }
  }, [userProfile?.uid]);

  // Continuous Data Synchronization with Host PHP API (MySQL)
  useEffect(() => {
    if (!userProfile?.coupleId && !userProfile?.uid) return;
    let isMounted = true;

    const syncWithHost = async () => {
      const effectiveCoupleId = userProfile.coupleId || userProfile.uid;

      // 1. Wishlist Items
      try {
        const wishRes = await fetchFromPhpApi('getWishlist', { coupleId: effectiveCoupleId });
        if (isMounted && wishRes && wishRes.status === 'success' && Array.isArray(wishRes.items)) {
          setItems(wishRes.items);
          setLoading(false);
        }
      } catch (e) {}

      // 2. Shared Memories (Persisted in MySQL on Host)
      try {
        const memRes = await fetchFromPhpApi('getMemories', { coupleId: effectiveCoupleId });
        if (isMounted && memRes && memRes.status === 'success' && Array.isArray(memRes.memories)) {
          setMemories(memRes.memories);
        }
      } catch (e) {}

      // 3. Pokes (Only when paired with partner)
      if (userProfile.coupleId) {
        try {
          const pokeRes = await fetchFromPhpApi('getPokes', { 
            coupleId: userProfile.coupleId,
            recipientUid: userProfile.uid
          });
          if (isMounted && pokeRes && pokeRes.status === 'success' && Array.isArray(pokeRes.pokes)) {
            const unread = pokeRes.pokes.filter((p: Poke) => !p.read);
            setPokes(unread);

            const seenSet = getNotifiedPokeIds();

            unread.forEach((newPoke: Poke) => {
              if (!seenSet.has(newPoke.id) && !notifiedPokeIds.current.has(newPoke.id)) {
                notifiedPokeIds.current.add(newPoke.id);
                markPokeIdNotified(newPoke.id);

                const isLovePing =
                  newPoke.itemId === 'love_ping' ||
                  (newPoke.itemTitle && newPoke.itemTitle.includes('به یادتم')) ||
                  (newPoke.message && newPoke.message.includes('به یادتم'));

                const isWhiteFlag =
                  newPoke.itemId === 'white_flag' ||
                  (newPoke.itemTitle && newPoke.itemTitle.includes('پرچم سفید'));

                const isWhiteFlagAccepted =
                  newPoke.itemId === 'white_flag_accepted';

                triggerDeviceNotification({
                  title: isWhiteFlag
                    ? `🕊️ پرچم سفید از طرف ${newPoke.senderName || 'پارتنرت'}`
                    : isWhiteFlagAccepted
                    ? `💖 آشتی پذیرفته شد از طرف ${newPoke.senderName || 'پارتنرت'}!`
                    : isLovePing
                    ? `💖 ${newPoke.senderName || 'پارتنرت'} الان به یادته!`
                    : `💌 پیام از ${newPoke.senderName || 'پارتنرت'}`,
                  body: newPoke.message || 'یک پیام محبت‌آمیز برات فرستاد 💕',
                  tag: `poke_${newPoke.id}`,
                  isLovePing: isLovePing || isWhiteFlag || isWhiteFlagAccepted
                });

                if (isWhiteFlag) {
                  setActiveWhiteFlagAlert(newPoke);
                } else if (isLovePing) {
                  setActiveLovePingAlert(newPoke);
                }
              }
            });
          }
        } catch (e) {}
      }
        // 4. Period Data for Shared Calendar
        try {
          const periodRes = await fetchFromPhpApi('getPeriodData', {
            coupleId: userProfile.coupleId || '',
            uid: userProfile.uid
          });
          if (isMounted && periodRes && periodRes.status === 'success') {
            if (periodRes.settings) {
              const targetId = userProfile.coupleId || userProfile.uid;
              const localRaw = localStorage.getItem(`impo_period_settings_${targetId}`) || localStorage.getItem(`impo_period_settings_${userProfile.uid}`);
              let localBirthDate: string | undefined;
              if (localRaw) {
                try {
                  const parsedLocal = JSON.parse(localRaw);
                  if (parsedLocal?.birthDate && parsedLocal.birthDate !== '2000-01-01') {
                    localBirthDate = parsedLocal.birthDate;
                  }
                } catch {}
              }
              const mergedPeriodSettings = {
                ...periodRes.settings,
                birthDate: (periodRes.settings.birthDate && periodRes.settings.birthDate !== '2000-01-01')
                  ? periodRes.settings.birthDate
                  : (localBirthDate || periodRes.settings.birthDate || '2000-01-01')
              };
              setImpoSettings(mergedPeriodSettings);
              setPeriodSettings(mergedPeriodSettings);
              localStorage.setItem(`impo_period_settings_${targetId}`, JSON.stringify(mergedPeriodSettings));
            }
            if (Array.isArray(periodRes.logs)) {
              setPeriodLogs(periodRes.logs);
            }
          }
        } catch (e) {}

      // 4. Heartbeat & Partner Status
      if (userProfile.uid) {
        try {
          const hbRes = await fetchFromPhpApi('heartbeat', {
            uid: userProfile.uid,
            partnerUid: userProfile.partnerUid || ''
          });
          if (isMounted && hbRes && hbRes.status === 'success') {
            if (hbRes.partner) {
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
                lastActiveAt: hbRes.partner.lastActiveAt,
                gender: hbRes.partner.gender,
                batteryLevel: hbRes.partner.batteryLevel,
                needStatus: hbRes.partner.needStatus,
                needUpdatedAt: hbRes.partner.needUpdatedAt
              }));
            }
            if (hbRes.user) {
              if (typeof hbRes.user.batteryLevel === 'number') {
                setMyBatteryLevel(hbRes.user.batteryLevel);
              }
              if (hbRes.user.needStatus) {
                setMyNeedStatus(hbRes.user.needStatus);
              }
            }
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
        barHex: styles.barHex,
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

  // Helper to ensure cropped image stays strictly inside viewport with zero empty margins/borders
  const clampMemoryCropOffset = (
    rawOffset: { x: number; y: number },
    scale: number,
    baseDims: { width: number; height: number },
    vpDims: { width: number; height: number }
  ) => {
    if (!vpDims.width || !vpDims.height || !baseDims.width || !baseDims.height) {
      return rawOffset;
    }
    const scaledW = baseDims.width * scale;
    const scaledH = baseDims.height * scale;
    const maxOffsetX = Math.max(0, (scaledW - vpDims.width) / 2);
    const maxOffsetY = Math.max(0, (scaledH - vpDims.height) / 2);

    return {
      x: Math.min(maxOffsetX, Math.max(-maxOffsetX, rawOffset.x)),
      y: Math.min(maxOffsetY, Math.max(-maxOffsetY, rawOffset.y))
    };
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
    const rawX = e.clientX - memoryDragStart.x;
    const rawY = e.clientY - memoryDragStart.y;
    const rect = memoryCropViewportRef.current?.getBoundingClientRect();
    const vw = rect?.width || 440;
    const vh = rect?.height || (vw * 9) / 16;
    const clamped = clampMemoryCropOffset(
      { x: rawX, y: rawY },
      memoryCropScale,
      memoryImageDimensions,
      { width: vw, height: vh }
    );
    setMemoryCropOffset(clamped);
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
    const rawX = e.touches[0].clientX - memoryDragStart.x;
    const rawY = e.touches[0].clientY - memoryDragStart.y;
    const rect = memoryCropViewportRef.current?.getBoundingClientRect();
    const vw = rect?.width || 440;
    const vh = rect?.height || (vw * 9) / 16;
    const clamped = clampMemoryCropOffset(
      { x: rawX, y: rawY },
      memoryCropScale,
      memoryImageDimensions,
      { width: vw, height: vh }
    );
    setMemoryCropOffset(clamped);
  };

  const handleMemoryCropTouchEnd = () => {
    setIsDraggingMemoryCrop(false);
  };

  const handlePerformMemoryCrop = () => {
    if (!memoryCropImageSrc) return;

    const canvas = document.createElement("canvas");
    const targetW = 1280;
    const targetH = 720;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, targetW, targetH);

    const img = new Image();
    img.onload = () => {
      const rect = memoryCropViewportRef.current?.getBoundingClientRect();
      const vw = rect?.width || 440;
      const vh = rect?.height || (vw * 9 / 16);

      const baseW = memoryImageDimensions.width || vw;
      const baseH = memoryImageDimensions.height || vh;

      // Scaled dimensions in viewport
      const scaledW = baseW * memoryCropScale;
      const scaledH = baseH * memoryCropScale;

      // Ensure clamped offset matching the viewport preview
      const clampedOffset = clampMemoryCropOffset(
        memoryCropOffset,
        memoryCropScale,
        { width: baseW, height: baseH },
        { width: vw, height: vh }
      );

      // In viewport coords, image center is at (vw/2 + clampedOffset.x, vh/2 + clampedOffset.y)
      const centerX = vw / 2 + clampedOffset.x;
      const centerY = vh / 2 + clampedOffset.y;

      // Top-left of image in viewport:
      const imageLeft = centerX - scaledW / 2;
      const imageTop = centerY - scaledH / 2;

      // Ratio from viewport to high-res canvas (16:9)
      const scaleFactor = targetW / vw;

      // Canvas destination coordinates
      const canvasX = imageLeft * scaleFactor;
      const canvasY = imageTop * scaleFactor;
      const canvasW = scaledW * scaleFactor;
      const canvasH = scaledH * scaleFactor;

      ctx.drawImage(img, canvasX, canvasY, canvasW, canvasH);

      const croppedDataURL = canvas.toDataURL("image/jpeg", 0.92);
      setMemoryFormImageUrl(croppedDataURL);
      setMemoryCropImageSrc(null);
      triggerAlert("تصویر خاطره با موفقیت و کادربندی دقیق ۱۶:۹ برش داده شد! 📸✨");
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
        colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
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
      colors: ["#A7B86C", "#A9ABEE", "#FFFF66"]
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
      colors: ["#EBA2F8", "#FFFF66", "#A9ABEE"]
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

  // Request browser & mobile device notification permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      triggerAlert("دستگاه یا مرورگر شما از اعلان‌های سیستمی پشتیبانی نمی‌کند.");
      return;
    }
    try {
      const granted = await requestDeviceNotificationPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);
        playHeartbeatAudio();
        await subscribeUserToPushNotifications();
        triggerAlert("نوتیفیکیشن موبایل و ویبره ضربان قلب با موفقیت فعال شد! حتی در زمان بسته بودن برنامه، اعلان‌ها برای شما ارسال می‌شوند. 🔔💖");
      } else {
        triggerAlert("دسترسی نوتیفیکیشن داده نشد یا در تنظیمات مسدود است.");
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
        budget: newBudget,
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
      setNewBudget("medium");
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
        colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
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
      const colors = ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE", "#F9C6B8", "#1C1C1C"];

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
    setEditBudget(item.budget || "medium");
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
      budget: editBudget,
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
      colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
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

  const handleSaveEmotionalStatus = async (battery: number, need: string) => {
    setMyBatteryLevel(battery);
    setMyNeedStatus(need);
    try {
      await fetchFromPhpApi('updateEmotionalStatus', {
        batteryLevel: battery,
        needStatus: need
      });
      if (onUpdateUserProfile) {
        onUpdateUserProfile({
          ...userProfile,
          batteryLevel: battery,
          needStatus: need
        });
      }
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
        colors: ["#EBA2F8", "#A7B86C", "#FFFF66"]
      });
    } catch (e) {
      console.error("Failed to update emotional status", e);
    }
  };

  const handleSendLovePing = async (customMsg?: string) => {
    if (!userProfile.coupleId || !userProfile.partnerUid) {
      triggerAlert("برای فرستادن یادآوری عاشقانه، ابتدا باید پارتنرتان را متصل کنید.");
      return;
    }
    if (isSendingLovePing) return;

    setIsSendingLovePing(true);

    triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.7 },
      colors: ["#EBA2F8", "#FF8DA1", "#F6F4F0", "#FF6B8B"]
    });

    const msg = customMsg || "الان به یادتم بود دلم برات پر کشید! 💖✨";

    try {
      await fetchFromPhpApi('sendLovePing', {
        message: msg
      });
      setShowNotificationAlert("یادآوری عاشقانه با عشق برای پارتنرت ارسال شد! 💕");
    } catch (e) {
      console.error(e);
      setShowNotificationAlert("ارسال با خطا مواجه شد.");
    } finally {
      setTimeout(() => {
        setIsSendingLovePing(false);
      }, 1000);
    }
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
      let processedRawImg = memoryRawImageSrc || memoryFormImageUrl;

      const uploadTasks: Promise<void>[] = [];

      if (processedImg && processedImg.startsWith("data:image")) {
        uploadTasks.push((async () => {
          try {
            const comp = await compressImage(processedImg);
            const uploadRes = await fetchFromPhpApi('uploadImage', {
              image: comp,
              folder: 'memories'
            });
            if (uploadRes && uploadRes.status === 'success' && uploadRes.url) {
              processedImg = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn("Cropped memory image upload note:", uploadErr);
          }
        })());
      }

      if (processedRawImg && processedRawImg.startsWith("data:image")) {
        uploadTasks.push((async () => {
          try {
            const comp = await compressImage(processedRawImg);
            const uploadRes = await fetchFromPhpApi('uploadImage', {
              image: comp,
              folder: 'memories'
            });
            if (uploadRes && uploadRes.status === 'success' && uploadRes.url) {
              processedRawImg = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn("Raw memory image upload note:", uploadErr);
          }
        })());
      }

      if (uploadTasks.length > 0) {
        await Promise.all(uploadTasks);
      }

      const memoryPayload = {
        coupleId: userProfile.coupleId,
        title: memoryFormTitle.trim(),
        date: memoryFormDate,
        imageUrl: processedImg || "",
        rawImageUrl: processedRawImg || processedImg || "",
        content: memoryFormContent.trim(),
        isTimeCapsule: memoryFormIsTimeCapsule,
        unlockDate: memoryFormIsTimeCapsule ? (memoryFormUnlockDate || null) : null,
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
        colors: ["#EBA2F8", "#FFFF66", "#A7B86C", "#A9ABEE"]
      });
      // Clear state and close modal
      setMemoryFormTitle("");
      setMemoryFormDate("");
      setMemoryFormContent("");
      setMemoryFormImageUrl("");
      setMemoryFormIsTimeCapsule(false);
      setMemoryFormUnlockDate("");
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

  const handleDeleteMemory = (memoryId: string) => {
    triggerConfirm("آیا از حذف این خاطره قشنگ مطمئن هستید؟ 🥺", async () => {
      try {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        if (selectedMemory?.id === memoryId) {
          setSelectedMemory(null);
        }
        await fetchFromPhpApi('deleteMemory', { id: memoryId });
        triggerAlert("خاطره با موفقیت حذف شد. 🕊️");
      } catch (err) {
        console.error("Error deleting memory:", err);
        triggerAlert("خطایی در حذف خاطره به وجود آمد.");
      }
    });
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
    const matchesBudget = budgetFilter === "all" || (item.budget || "medium") === budgetFilter;
    return !item.isCompleted && matchesCategory && matchesSearch && matchesBudget;
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

  const currentPartnerCycleStatus = React.useMemo(() => {
    if (!impoSettings && !periodSettings) return null;
    try {
      const today = getTehranDate();
      return getMenstrualPhaseForDate(today);
    } catch {
      return null;
    }
  }, [impoSettings, periodSettings]);

  const currentActualToday = getTehranDate();
  const [actualTodayJy, actualTodayJm] = gregorianToJalali(
    currentActualToday.getFullYear(),
    currentActualToday.getMonth() + 1,
    currentActualToday.getDate()
  );

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

  const daysTogether = userProfile.coupleInfo?.relationshipStartDate
    ? calculateDaysBetween(userProfile.coupleInfo.relationshipStartDate)
    : null;

  // Lex Colorful Design Canvas: Calm warm porcelain (#F5F3EF)
  const canvasBgClass = "bg-[#F5F3EF]";

  const partnerBattery = partnerProfile?.batteryLevel ?? 80;
  const batteryTone = (lvl: number) => (lvl > 60 ? "bg-[#5ED46A]" : lvl > 25 ? "bg-[#FFFF66]" : "bg-[#F29B47]");

  const NAV_ITEMS = [
    { id: "wishlist", label: "آرزوها", Icon: Heart, isActive: activeTab === "wishlist" || activeTab === "hall" },
    { id: "calendar", label: "تقویم", Icon: CalendarIcon, isActive: activeTab === "calendar" },
    { id: "period", label: "سلامت", Icon: Droplet, isActive: activeTab === "period" },
    { id: "memories", label: "خاطرات", Icon: Camera, isActive: activeTab === "memories" || activeTab.startsWith("tab-") },
    { id: "finance", label: "مالی", Icon: Wallet, isActive: activeTab === "finance" }
  ];

  const handleFabClick = () => {
    if (activeTab === "period") {
      setPeriodLogTrigger((prev) => prev + 1);
    } else if (activeTab === "memories") {
      setMemoryFormDate("");
      setMemoryFormTitle("");
      setMemoryFormContent("");
      setMemoryFormImageUrl("");
      setShowAddMemoryModal(true);
    } else if (activeTab.startsWith("tab-")) {
      setShowAddNoteModal(true);
    } else if (activeTab === "calendar") {
      setShowAnniversaryModal(true);
    } else if (activeTab === "finance") {
      const el = document.getElementById("finance-transaction-form");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const firstInput = el.querySelector("input");
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }
    } else {
      setShowAddModal(true);
    }
  };

  const fabLabel =
    activeTab === "period"
      ? "ثبت حال امروز"
      : activeTab === "memories"
      ? "خاطره جدید"
      : activeTab.startsWith("tab-")
      ? "یادداشت جدید"
      : activeTab === "calendar"
      ? "روز مهم"
      : activeTab === "finance"
      ? "تراکنش جدید"
      : "آرزوی جدید";

  return (
    <div className="min-h-screen pb-32 md:pb-16 bg-[#F5F3EF] text-[#1C1C1C] relative" dir="rtl">
      {/* ===== Lex App Bar: flat, edge-to-edge, gender colored (blue = him, pink = her) ===== */}
      <header className={`sticky top-0 z-30 ${theme.headerBg} transition-colors duration-300`} dir="rtl">
        <div className="max-w-5xl mx-auto pr-4 pl-2 h-[60px] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => (userProfile.partnerUid ? setShowPartnerHub(true) : onOpenPairingModal?.())}
            className="flex items-center gap-2 min-w-0 cursor-pointer text-right"
            title="فضای دونفره"
          >
            <svg viewBox="0 0 32 32" className="w-7 h-7 shrink-0" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <line
                  key={i}
                  x1="16"
                  y1="16"
                  x2={16 + 13 * Math.cos((i * Math.PI) / 6)}
                  y2={16 + 13 * Math.sin((i * Math.PI) / 6)}
                  stroke="#1C1C1C"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ))}
              <circle cx="16" cy="16" r="7" fill="#FFFF66" stroke="#1C1C1C" strokeWidth="1.6" />
            </svg>
            <span className="text-[19px] font-bold text-[#1C1C1C] truncate">
              {userProfile.partnerUid
                ? `${userProfile.displayName} و ${partnerProfile?.displayName || "پارتنر"}`
                : userProfile.displayName}
            </span>
          </button>

          {/* Desktop text navigation */}
          <nav className="hidden md:flex items-center gap-1 mx-auto">
            {NAV_ITEMS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setActiveTab(n.id)}
                className={`px-3 py-1.5 rounded-full text-[14px] cursor-pointer transition-colors ${
                  n.isActive ? "bg-[#1C1C1C] text-white font-bold" : "text-[#1C1C1C] hover:bg-white/40"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center shrink-0">
            {!userProfile.partnerUid && !userProfile.coupleId && (
              <button
                type="button"
                onClick={onOpenPairingModal}
                className="w-11 h-11 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
                aria-label="اتصال پارتنر"
                title="اتصال پارتنر"
              >
                <Key className="w-[26px] h-[26px] stroke-[1.6]" />
              </button>
            )}

            <button
              type="button"
              onClick={requestNotificationPermission}
              className="relative w-11 h-11 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
              aria-label="اعلان‌ها"
              title={notificationsEnabled ? "اعلان‌ها فعال است" : "فعال‌سازی اعلان‌ها"}
            >
              <Bell className="w-[26px] h-[26px] stroke-[1.6]" />
              {!notificationsEnabled && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F0626A] text-white text-[11px] font-bold flex items-center justify-center">
                  ۱
                </span>
              )}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeaderMenu((v) => !v)}
                className="w-11 h-11 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
                aria-label="منو"
                title="منو و تنظیمات"
              >
                <SlidersHorizontal className="w-[26px] h-[26px] stroke-[1.6]" />
              </button>

              <AnimatePresence>
                {showHeaderMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 top-12 w-64 bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[20px] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] z-50 overflow-hidden text-right py-1.5"
                      dir="rtl"
                    >
                      {[
                        { key: "profile", Icon: User, label: "پروفایل و تنظیمات", onClick: () => setShowProfileModal(true) },
                        {
                          key: "gender",
                          Icon: Palette,
                          label: theme.isMale ? "تم: ساید آقا (آبی)" : "تم: ساید خانم (صورتی)",
                          hint: "تغییر",
                          onClick: handleToggleGender
                        },
                        {
                          key: "notif",
                          Icon: notificationsEnabled ? Bell : BellOff,
                          label: "اعلان‌ها",
                          hint: notificationsEnabled ? "فعال" : "روشن کن",
                          onClick: requestNotificationPermission
                        },
                        {
                          key: "tips",
                          Icon: Sparkles,
                          label: "نمایش دوباره نکته‌ها",
                          onClick: () => {
                            try {
                              Object.keys(localStorage)
                                .filter((k) => k.startsWith("lex_tip_dismissed_"))
                                .forEach((k) => localStorage.removeItem(k));
                            } catch {}
                            window.dispatchEvent(new CustomEvent("lex-tips-reset"));
                          }
                        },
                        ...(!isStandalone
                          ? [
                              {
                                key: "pwa",
                                Icon: Smartphone,
                                label: "نصب اپ روی گوشی",
                                onClick: () => window.dispatchEvent(new CustomEvent("open-pwa-install"))
                              }
                            ]
                          : [])
                      ].map((item: any) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setShowHeaderMenu(false);
                            item.onClick();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#E9E7E1] text-[15px] text-[#1C1C1C] cursor-pointer transition-colors"
                        >
                          <item.Icon className="w-5 h-5 stroke-[1.7]" />
                          <span className="flex-1">{item.label}</span>
                          {item.hint && <span className="text-[12px] text-[#6E6B66]">{item.hint}</span>}
                        </button>
                      ))}
                      <div className="my-1 h-px bg-[#1C1C1C]/15" />
                      <button
                        type="button"
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#E9E7E1] text-[15px] text-[#C2410C] cursor-pointer transition-colors"
                      >
                        <LogOut className="w-5 h-5 stroke-[1.7]" />
                        <span>خروج از حساب</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Couple avatars with tiny battery badges */}
            <div className="flex items-center mr-1 pl-1">
              <button
                type="button"
                onClick={() => setShowEmotionalStatusSheet(true)}
                className="relative z-10 rounded-full cursor-pointer active:scale-95 transition-transform"
                title="حال دل و باتری من"
                aria-label="پروفایل و باتری من"
              >
                {renderAvatar(userProfile, "❤️", "w-[38px] h-[38px]", theme.myAvatarRing)}
                <span
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full border border-[#1C1C1C] text-[9px] leading-[13px] font-bold whitespace-nowrap ${batteryTone(myBatteryLevel)}`}
                >
                  {toPersianDigits(myBatteryLevel)}٪
                </span>
              </button>
              {userProfile.partnerUid && (
                <button
                  type="button"
                  onClick={() => setShowPartnerHub(true)}
                  className="relative z-0 -mr-3 rounded-full cursor-pointer active:scale-95 transition-transform"
                  title="حال دل و باتری پارتنر"
                  aria-label="فضای پارتنر و باتری"
                >
                  {renderAvatar(partnerProfile, "💖", "w-[38px] h-[38px]", theme.partnerAvatarRing)}
                  <span
                    className={`absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${
                      isPartnerOnline ? "bg-[#5ED46A]" : "bg-[#C9C5BD]"
                    }`}
                  />
                  <span
                    className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full border border-[#1C1C1C] text-[9px] leading-[13px] font-bold whitespace-nowrap ${batteryTone(partnerBattery)}`}
                  >
                    {toPersianDigits(partnerBattery)}٪
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Real-time Poke Notification Alert Toaster */}
      <AnimatePresence>
        {pokes.length > 0 && (
          <div className="fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50" dir="rtl">
            {pokes.map((poke) => {
              const isLovePing = poke.itemId === 'love_ping';
              return (
                <motion.div
                  key={poke.id}
                  initial={{ opacity: 0, y: -16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="rounded-[28px] p-4 mb-3 bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-start gap-3 relative overflow-hidden"
                >
                  <div className="w-11 h-11 rounded-full bg-white border-[1.5px] border-[#1C1C1C] flex items-center justify-center shrink-0 relative z-10">
                    {isLovePing ? (
                      <Heart className="w-5 h-5 text-[#FF4D6D] fill-current animate-pulse" />
                    ) : (
                      <MessageCircleHeart className="w-5 h-5 text-[#1C1C1C] stroke-[1.9]" />
                    )}
                  </div>
                  <div className="flex-1 relative z-10">
                    <h4 className="text-[11px] font-bold text-[#1C1C1C]/75">
                      {isLovePing ? "تپش قلب و یادآوری آنی پارتنر" : "یادآوری عاشقانه از پارتنر"}
                    </h4>
                    <p className="text-sm font-bold mt-0.5 leading-snug">{poke.message}</p>
                    {!isLovePing && (
                      <p className="text-[11px] text-[#1C1C1C]/80 mt-1 font-medium">مربوط به: {poke.itemTitle}</p>
                    )}
                    {isLovePing && (
                      <div className="flex items-center gap-2 mt-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleDismissAlert(poke.id);
                            handleSendLovePing("منم همین الان داشتم بهت فکر می‌کردم عزیزدلم! 💕");
                          }}
                          className="px-3.5 py-1.5 bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          منم به یادتم! 🥰
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissAlert(poke.id)}
                          className="px-3.5 py-1.5 bg-white text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          بستن
                        </button>
                      </div>
                    )}
                  </div>
                  {!isLovePing && (
                    <button
                      onClick={() => handleDismissAlert(poke.id)}
                      className="px-3.5 py-1.5 bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-[11px] font-bold cursor-pointer shrink-0 relative z-10 transition-colors"
                    >
                      فهمیدم
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-3xl mx-auto px-4">
        {/* Home section tabs (Lex underline tabs) */}
        {(activeTab === "wishlist" || activeTab === "hall") && (
          <LexUnderlineTabs
            className="mb-3"
            tabs={[
              { id: "wishlist", label: "آرزوها", count: wishlistItems.length },
              { id: "hall", label: "افتخارات", count: hallOfFameItems.length }
            ]}
            active={activeTab}
            onChange={(id) => setActiveTab(id)}
          />
        )}

        {/* Spacer for tabs without the home underline tabs */}
        {!(activeTab === "wishlist" || activeTab === "hall") && <div className="h-4" />}

        {/* Lex Tip for every section except home (home shows it inline in the feed) */}
        {activeTab !== "wishlist" && activeTab !== "hall" && !activeTab.startsWith("tab-") && (
          <LexGuidanceCard
            activeTab={activeTab}
            theme={theme}
            partnerName={partnerProfile?.displayName || "پارتنرت"}
            onActionClick={handleFabClick}
          />
        )}

        {/* --- EMPATHY CO-PILOT CARD (HOME TAB ONLY + DISMISSIBLE) --- */}
        {activeTab === "wishlist" &&
          !empathyDismissed &&
          currentPartnerCycleStatus &&
          (currentPartnerCycleStatus.phase === 'pms' || currentPartnerCycleStatus.phase === 'period') &&
          (userProfile.gender === 'male' || partnerProfile?.gender === 'female') && (
          <div className="mb-4">
            <EmpathyCoPilotCard
              partnerName={partnerProfile?.displayName || 'پارتنر شما'}
              phase={currentPartnerCycleStatus.phase}
              phaseTitle={currentPartnerCycleStatus.phase === 'pms' ? 'فاز PMS' : 'دوره قاعدگی'}
              partnerWishlistItems={items.filter(i => !i.isCompleted)}
              onDismiss={() => {
                setEmpathyDismissed(true);
                try { sessionStorage.setItem("empathy_copilot_dismissed", "1"); } catch {}
              }}
              onViewWishlist={() => {
                setActiveTab("wishlist");
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* Sub-Navigation Bar inside Memories & Sticky Notes Pillar (Screen 3 Pill Tabs: White & Mint) */}
        {(activeTab === "memories" || activeTab.startsWith("tab-")) && (
          <div className="flex items-center justify-between gap-2 mb-4 overflow-x-auto no-scrollbar pb-0.5" dir="rtl">
            <div className="inline-flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("memories")}
                className={`px-4 py-2 rounded-full text-xs border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === "memories"
                    ? "bg-[#5ED46A] text-[#1C1C1C] font-bold"
                    : "bg-white text-[#1C1C1C] font-medium"
                }`}
              >
                <Camera className="w-3.5 h-3.5 stroke-[1.9]" />
                <span>خاطرات ({toPersianDigits(memories.length)})</span>
              </button>

              {customTabs.map((tab) => (
                <div key={tab.id} className="relative group/tab flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab(`tab-${tab.id}`)}
                    className={`px-4 py-2 rounded-full text-xs border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === `tab-${tab.id}`
                        ? "bg-[#5ED46A] text-[#1C1C1C] font-bold"
                        : "bg-white text-[#1C1C1C] font-medium"
                    }`}
                  >
                    <span>{tab.icon || "📌"}</span>
                    <span>{tab.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteTab(tab.id, e)}
                    className="-top-1 -left-1 absolute bg-[#F29B47] text-[#1C1C1C] rounded-full p-0.5 border-[1.5px] border-[#1C1C1C] cursor-pointer z-10"
                    title="حذف برد یادداشت"
                  >
                    <X className="w-2.5 h-2.5 stroke-[1.9]" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setShowAddTabModal(true)}
                className="px-3.5 py-2 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-xs font-bold text-[#1C1C1C] hover:bg-[#FFFF66] transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="ساخت برد یادداشت چسبان جدید"
              >
                <Plus className="w-3.5 h-3.5 stroke-[1.9]" />
                <span>برد جدید</span>
              </button>
            </div>

            {activeTab === "memories" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMemoriesSearch((v) => !v)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border-[1.5px] border-[#1C1C1C] ${
                    showMemoriesSearch || searchQuery
                      ? "bg-[#FFFF66] text-[#1C1C1C]"
                      : "bg-white text-[#1C1C1C] hover:bg-[#FFFF66]"
                  }`}
                  aria-label="جستجو در خاطرات"
                >
                  <Search className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 1: WISHLIST (Lex feed) --- */}
        {activeTab === "wishlist" && (
          <div dir="rtl">
            {/* Lex pill row: filter circle + category pills */}
            <div className="-mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
              <button
                type="button"
                onClick={() => setShowFilterDrawer((v) => !v)}
                className={`w-10 h-10 rounded-full border-[1.5px] border-[#1C1C1C] flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                  showFilterDrawer || searchQuery || budgetFilter !== "all" ? "bg-[#1C1C1C] text-white" : "bg-transparent text-[#1C1C1C]"
                }`}
                aria-label="جستجو و فیلتر"
                title="جستجو و فیلتر"
              >
                {showFilterDrawer ? <X className="w-5 h-5 stroke-[1.8]" /> : <Search className="w-[18px] h-[18px] stroke-[1.8]" />}
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`h-10 px-4 rounded-full text-[15px] transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  categoryFilter === "all"
                    ? `${theme.chipGradient} text-[#1C1C1C] font-medium`
                    : "bg-transparent border-[1.5px] border-[#1C1C1C]/35 text-[#1C1C1C]"
                }`}
              >
                همه
              </button>

              {allCategories.map((cat) => {
                const isCustom = customCategories.some((c) => c.id === cat.id);
                const isSelected = categoryFilter === cat.id;
                const catCount = items.filter((i) => !i.isCompleted && i.category === cat.id).length;
                return (
                  <div key={cat.id} className="relative flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`h-10 px-4 rounded-full text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                        isSelected
                          ? `${theme.chipGradient} text-[#1C1C1C] font-medium`
                          : "bg-transparent border-[1.5px] border-[#1C1C1C]/35 text-[#1C1C1C]"
                      }`}
                    >
                      <span>{cat.label}</span>
                      {catCount > 0 && <span className="text-[12px] opacity-60">{toPersianDigits(catCount)}</span>}
                    </button>
                    {isCustom && isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(cat.id, e)}
                        className="absolute -top-1 -left-1 bg-white text-[#1C1C1C] rounded-full p-0.5 border border-[#1C1C1C] cursor-pointer z-10"
                        title="حذف دسته‌بندی"
                      >
                        <X className="w-3 h-3 stroke-[2]" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAddShelfModal(true)}
                className="h-10 px-4 rounded-full border-[1.5px] border-dashed border-[#1C1C1C]/45 text-[#1C1C1C]/80 text-[15px] flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[1.8]" />
                <span>دسته جدید</span>
              </button>
            </div>

            <div className="mb-3">
              {/* Expandable Search & Budget Drawer */}
              <AnimatePresence>
                {(showFilterDrawer || searchQuery || budgetFilter !== "all") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <input
                            type="text"
                            placeholder="جستجو در بین آرزوها..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-9 py-2 bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-medium text-[#1C1C1C] placeholder-[#1C1C1C]/50 focus:outline-none text-right"
                          />
                          <Search className="w-3.5 h-3.5 text-[#1C1C1C] absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none stroke-[1.9]" />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              className="absolute top-1/2 left-2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#1C1C1C] rounded-full cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5 stroke-[1.9]" />
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowDateRoulette(true)}
                          className="px-3.5 py-2 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold rounded-full flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C] stroke-[1.9]" />
                          <span>پیشنهاد شانسی</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[11px] font-bold text-[#1C1C1C] ml-1 shrink-0">بودجه:</span>
                        {[
                          { id: "all", label: "همه" },
                          { id: "economy", label: "اقتصادی" },
                          { id: "medium", label: "میان‌رده" },
                          { id: "luxury", label: "لوکس" }
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBudgetFilter(b.id as any)}
                            className={`px-3 py-1 rounded-full text-[11px] border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                              budgetFilter === b.id
                                ? "bg-[#5ED46A] text-[#1C1C1C] font-bold"
                                : "bg-white text-[#1C1C1C] font-medium"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Daily question — Lex "Welcome" card */}
            <div className="mb-4">
              <DailyQuestionCard
                userProfile={userProfile}
                partnerProfile={partnerProfile}
                onOpenModal={() => setShowDailyQuestionModal(true)}
                refreshKey={dailyQuestionRefreshTrigger}
                embeddedInHero={false}
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#6E6B66] gap-3">
                <RefreshCw className="w-6 h-6 animate-spin stroke-[1.7]" />
                <p className="text-[14px]">در حال بارگذاری آرزوها...</p>
              </div>
            ) : wishlistItems.length === 0 ? (
              <>
                <LexEmptyState
                  title={categoryFilter !== "all" || searchQuery ? "اینجا چیزی پیدا نشد" : "هنوز آرزویی ندارید"}
                  body={
                    categoryFilter !== "all" || searchQuery
                      ? "فیلتر خیلی محدوده! یه کم بازترش کنید تا آرزوها پیدا بشن."
                      : "اولین آرزوی دونفره‌تون رو بنویسید؛ یه سفر، یه خرید یا یه فیلم که می‌خواید با هم ببینید."
                  }
                  actionLabel={categoryFilter !== "all" || searchQuery ? "حذف فیلترها" : "نوشتن اولین آرزو"}
                  onAction={() => {
                    if (categoryFilter !== "all" || searchQuery) {
                      setCategoryFilter("all");
                      setSearchQuery("");
                      setBudgetFilter("all" as any);
                    } else {
                      setShowAddModal(true);
                    }
                  }}
                  accent={theme.primaryColor}
                />
                <div className="mt-4">
                  <LexGuidanceCard activeTab="wishlist" theme={theme} onActionClick={() => setShowAddModal(true)} />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wishlistItems.map((item, idx) => {
                  const catConfig = allCategories.find((c) => c.id === item.category) || allCategories[0];
                  const budgetText =
                    item.budget === "economy"
                      ? "اقتصادی"
                      : item.budget === "luxury"
                      ? "لوکس"
                      : item.budget === "medium"
                      ? "میان‌رده"
                      : "";
                  const isMenuOpen = openWishMenuId === item.id;
                  const tagBg =
                    item.category === "trip"
                      ? "bg-[#F4C6FA]"
                      : item.category === "place"
                      ? "bg-[#BDEFC2]"
                      : item.category === "buy"
                      ? "bg-[#A8DBF4]"
                      : item.category === "book"
                      ? "bg-[#FFFF99]"
                      : item.category === "movie"
                      ? "bg-[#F9CFA4]"
                      : "bg-[#E9E7E1]";

                  return (
                    <React.Fragment key={item.id}>
                      <motion.article
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[24px] px-5 pt-4 pb-1 text-[#1C1C1C] relative"
                      >
                        {/* Meta row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[15px] leading-tight truncate">
                              <span className="font-bold">{item.createdByName || "شما"}</span>
                              <span className="text-[#6E6B66] text-[14px]"> · {catConfig.label}</span>
                            </p>
                            <p className="text-[13px] text-[#4A4744] mt-1">
                              {item.date ? toPersianDigits(formatPersianDate(item.date)) : "بدون تاریخ"}
                              {budgetText ? ` • ${budgetText}` : ""}
                            </p>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => setOpenWishMenuId((prev) => (prev === item.id ? null : item.id))}
                              className="w-9 h-9 -ml-2 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
                              aria-label="گزینه‌های کارت"
                            >
                              <MoreHorizontal className="w-6 h-6 stroke-[2.4]" />
                            </button>
                            {isMenuOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setOpenWishMenuId(null)} />
                                <div className="absolute left-0 top-9 z-30 w-44 bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[16px] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] py-1 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWishMenuId(null);
                                      handleOpenEditModal(item);
                                    }}
                                    className="w-full px-4 py-2.5 text-[14px] hover:bg-[#E9E7E1] flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4 stroke-[1.7]" />
                                    <span>ویرایش</span>
                                  </button>
                                  {item.progress > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenWishMenuId(null);
                                        handleUpdateProgress(item.id, item.progress, -25);
                                      }}
                                      className="w-full px-4 py-2.5 text-[14px] hover:bg-[#E9E7E1] flex items-center gap-2.5 cursor-pointer"
                                    >
                                      <Minus className="w-4 h-4 stroke-[1.7]" />
                                      <span>کم کردن ۲۵٪</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenWishMenuId(null);
                                      handleDeleteItem(item.id);
                                    }}
                                    className="w-full px-4 py-2.5 text-[14px] text-[#C2410C] hover:bg-[#E9E7E1] flex items-center gap-2.5 cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 stroke-[1.7]" />
                                    <span>حذف</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Display title + body */}
                        <h3 className="text-[24px] font-black leading-[1.45] mt-3">{item.title}</h3>
                        {item.description && (
                          <p className="text-[16px] leading-[1.8] text-[#1C1C1C] mt-1 line-clamp-3">{item.description}</p>
                        )}

                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-[14px] text-[#1C1C1C] underline underline-offset-4 decoration-[#1C1C1C]/30"
                          >
                            <ExternalLink className="w-4 h-4 stroke-[1.7]" />
                            <span className="truncate max-w-[220px]">{item.linkPreview?.title || "لینک همراه"}</span>
                          </a>
                        )}

                        {/* Shared progress */}
                        <div className="mt-4 flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-[#1C1C1C]/[0.07] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(item.progress, item.progress > 0 ? 6 : 0)}%`,
                                backgroundColor: theme.primaryColor
                              }}
                            />
                          </div>
                          <span className="text-[14px] font-bold tabular-nums">{toPersianDigits(item.progress)}٪</span>
                        </div>

                        {/* Tags + primary action (Lex "Chat" button) */}
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-[6px] text-[13px] ${tagBg}`}>{catConfig.label}</span>
                            {budgetText && (
                              <span className="px-2.5 py-1 rounded-[6px] text-[13px] bg-[#E9E7E1]">{budgetText}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateProgress(item.id, item.progress, 100 - item.progress)}
                            className="shrink-0 px-4 h-10 rounded-[10px] border-[1.5px] border-[#1C1C1C] text-[15px] font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#F5F3EF] active:scale-[0.98] transition-all"
                          >
                            انجام شد
                          </button>
                        </div>

                        {/* Reaction row */}
                        <div className="mt-4 border-t border-[#1C1C1C]/12 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSendPoke(item)}
                              className="w-10 h-10 -mr-2 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                              title="یادآوری عاشقانه به پارتنر"
                              aria-label="یادآوری عاشقانه"
                            >
                              <Heart className="w-[26px] h-[26px] stroke-[1.6]" />
                            </button>
                            {item.progress < 100 && (
                              <button
                                type="button"
                                onClick={() => handleUpdateProgress(item.id, item.progress, 25)}
                                className="h-9 px-3 rounded-full border border-[#1C1C1C]/15 text-[14px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                                style={{ backgroundColor: theme.primaryBgSoft }}
                                title="یه قدم جلوتر"
                              >
                                <span>+۲۵٪</span>
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="w-10 h-10 -ml-2 flex items-center justify-center cursor-pointer"
                            title="ویرایش"
                            aria-label="ویرایش"
                          >
                            <Edit2 className="w-[22px] h-[22px] stroke-[1.6]" />
                          </button>
                        </div>
                      </motion.article>

                      {/* Lex Tip inline in the feed, right after the first post */}
                      {idx === 0 && (
                        <div className="md:col-span-2 -mb-4">
                          <LexGuidanceCard activeTab="wishlist" theme={theme} onActionClick={() => setShowAddModal(true)} />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: HALL OF FAME (HERO TROPHY STAGE + CALM CARDS) --- */}
        {activeTab === "hall" && (
          <div dir="rtl" className="space-y-5">
            {/* Lex Hero Banner for Hall of Fame */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] overflow-hidden">
              <div className="border-b-[1.5px] border-[#1C1C1C]">
                <LexWaveStrip className="h-6" />
              </div>
              <div className="p-5 sm:p-6 text-[#1C1C1C] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[12px] font-bold text-[#6E6B66]">تالار افتخارات دونفره</span>
                    <h2 className="text-[24px] sm:text-[28px] font-black tracking-tight mt-1 text-[#1C1C1C]">
                      {toPersianDigits(items.filter((i) => i.isCompleted).length)} رویای برآورده‌شده
                    </h2>
                    <p className="text-[14px] text-[#6E6B66] mt-1">
                      آرزوهایی که با هم به ۱۰۰٪ رسوندید و خاطره شدند ✨
                    </p>
                  </div>
                </div>

                {items.some((i) => i.isCompleted) && (
                  <div className="relative pt-1">
                    <input
                      type="text"
                      placeholder="جستجو در بین افتخارات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-9 py-2.5 bg-[#F5F3EF] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-medium text-[#1C1C1C] placeholder-[#1C1C1C]/55 focus:outline-none text-right"
                    />
                    <Search className="w-3.5 h-3.5 text-[#1C1C1C] absolute top-1/2 right-3.5 -translate-y-1/2 pointer-events-none stroke-[1.9]" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[#1C1C1C] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 stroke-[1.9]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {hallOfFameItems.length === 0 ? (
              <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-10 sm:p-14 text-center">
                <div className="w-14 h-14 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] rounded-full flex items-center justify-center text-[#1C1C1C] mx-auto mb-3.5">
                  <Sparkles className="w-6 h-6 stroke-[1.9]" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">هنوز موردی ثبت نشده</h3>
                <p className="text-[#1C1C1C]/75 text-xs sm:text-sm font-medium mt-1.5 max-w-xs mx-auto leading-relaxed">
                  هر زمان یکی از آرزوهای لیست مشترک را تکمیل کنید، به عنوان خاطره ماندگار اینجا ثبت می‌شود.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {allCategories.map((cat) => {
                  const catItems = groupedHallOfFame[cat.id] || [];
                  if (catItems.length === 0) return null;
                  const Icon = cat.icon;

                  return (
                    <div key={cat.id} className="space-y-3.5">
                      <div className="flex items-center justify-between border-b-[1.5px] border-[#1C1C1C] pb-2.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 stroke-[1.9] text-[#1C1C1C]" />
                          <h3 className="text-sm sm:text-base font-black text-[#1C1C1C]">{cat.label}</h3>
                        </div>
                        <span className="text-[11px] text-[#1C1C1C] font-bold bg-white border-[1.5px] border-[#1C1C1C] px-2.5 py-0.5 rounded-full">
                          {toPersianDigits(catItems.length)} مورد
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {catItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 sm:p-5 relative flex flex-col justify-between text-[#1C1C1C]"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2.5">
                                <span className="px-2.5 py-0.5 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] font-bold text-[10px]">
                                  ✓ برآورده‌شده
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#F29B47] flex items-center justify-center transition-colors cursor-pointer"
                                  title="حذف از تالار افتخارات"
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[1.9]" />
                                </button>
                              </div>

                              <h4 className="text-base font-bold text-[#1C1C1C] leading-snug">{item.title}</h4>
                              {item.description && (
                                <p className="text-xs text-[#1C1C1C]/80 font-medium mt-1 line-clamp-3 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t-[1.5px] border-[#1C1C1C]/20 flex items-center justify-between text-[11px] text-[#1C1C1C] font-bold">
                              <span>ثبت با {item.createdByName}</span>
                              <span>
                                {item.completedAt?.seconds
                                  ? new Date(item.completedAt.seconds * 1000).toLocaleDateString("fa-IR")
                                  : "تکمیل‌شده"}
                              </span>
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

        {/* --- TAB 3: CALENDAR (NEOBRUTALIST CALENDAR STAGE) --- */}
        {activeTab === "calendar" && (
          <div className="max-w-lg mx-auto" dir="rtl">
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-4 sm:p-7 mb-5 space-y-4 sm:space-y-6">
              {/* Top Toggle for Cycle Overlay */}
              <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <h3 className="text-xs sm:text-base font-black text-[#1C1C1C] flex items-center gap-2">
                  <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <CalendarIcon className="w-4 h-4 stroke-[1.9]" />
                  </span>
                  <span>تقویم مشترک زوجین</span>
                </h3>
                <button
                  onClick={() => setShowCycleOnCalendar((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 border-[1.5px] border-[#1C1C1C] ${
                    showCycleOnCalendar
                      ? "bg-[#EBA2F8] text-[#1C1C1C]"
                      : "bg-white text-[#1C1C1C]"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full border border-[#1C1C1C] ${showCycleOnCalendar ? "bg-[#F29B47]" : "bg-[#D4D4D4]"}`} />
                  <span>چرخه سلامت: {showCycleOnCalendar ? "نمایان" : "مخفی"}</span>
                </button>
              </div>

              {/* Calendar Header: < Month Year > with Clean Circular Nav Buttons */}
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={prevMonth}
                  className="w-10 h-10 rounded-full border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#F5F3EF] flex items-center justify-center text-[#1C1C1C] transition-colors cursor-pointer"
                  title="ماه قبل"
                >
                  <ChevronRight className="w-5 h-5 stroke-[1.9]" />
                </button>

                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-[#1C1C1C]">
                    {JALALI_MONTHS[currentJalaliMonth - 1]} {toPersianDigits(currentJalaliYear)}
                  </h3>
                  {(currentJalaliYear !== actualTodayJy || currentJalaliMonth !== actualTodayJm) && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      type="button"
                      onClick={() => {
                        setCurrentJalaliYear(actualTodayJy);
                        setCurrentJalaliMonth(actualTodayJm);
                      }}
                      className="px-3 py-1 bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap"
                      title="بازگشت به تاریخ امروز"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 stroke-[1.9]" />
                      <span>برو به امروز</span>
                    </motion.button>
                  )}
                </div>

                <button
                  onClick={nextMonth}
                  className="w-10 h-10 rounded-full border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#F5F3EF] flex items-center justify-center text-[#1C1C1C] transition-colors cursor-pointer"
                  title="ماه بعد"
                >
                  <ChevronLeft className="w-5 h-5 stroke-[1.9]" />
                </button>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#1C1C1C]">
                <div>شنبه</div>
                <div>یک</div>
                <div>دو</div>
                <div>سه</div>
                <div>چهار</div>
                <div>پنج</div>
                <div>جمعه</div>
              </div>

              {/* Squircle Day Tiles with Neobrutalist Borders */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="aspect-square" />;
                  }

                  const dayItems = getItemsForDay(day);
                  const hasItems = dayItems.length > 0;

                  const [gy, gm, gd] = jalaliToGregorian(currentJalaliYear, currentJalaliMonth, day);
                  const targetDate = new Date(gy, gm - 1, gd);
                  const todayNow = getTehranDate();
                  const [tJy, tJm, tJd] = gregorianToJalali(todayNow.getFullYear(), todayNow.getMonth() + 1, todayNow.getDate());
                  const isToday = currentJalaliYear === tJy && currentJalaliMonth === tJm && day === tJd;

                  const phaseInfo = showCycleOnCalendar ? getMenstrualPhaseForDate(targetDate) : null;

                  let tileColorClass = "bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]/25 hover:border-[#1C1C1C]";
                  let phaseLabel = "";

                  if (phaseInfo && !isToday) {
                    if (phaseInfo.phase === "period" || phaseInfo.phase === "due" || phaseInfo.phase === "delayed") {
                      tileColorClass = "bg-[#F29B47] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                      phaseLabel = "دوره پریود";
                    } else if (phaseInfo.phase === "pms") {
                      tileColorClass = "bg-[#6BCFEA] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                      phaseLabel = "دوره PMS";
                    } else if (phaseInfo.phase === "ovulation") {
                      tileColorClass = "bg-[#5ED46A] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                      phaseLabel = "روز تخمک‌گذاری";
                    } else if (phaseInfo.phase === "fertile") {
                      tileColorClass = "bg-[#5ED46A] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]";
                      phaseLabel = "دوره باروری";
                    }
                  }

                  if (isToday) {
                    tileColorClass = "bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C]";
                  }

                  return (
                    <div
                      key={`day-${day}`}
                      className={`aspect-square rounded-[14px] sm:rounded-[16px] flex flex-col items-center justify-center transition-colors relative select-none cursor-pointer ${tileColorClass}`}
                      title={`${phaseLabel ? `[${phaseLabel}] ` : ""}${hasItems ? `(${dayItems.length} برنامه: ${dayItems.map((i) => i.title).join("، ")})` : ""}`}
                    >
                      <span className="text-sm sm:text-base font-bold leading-none">
                        {toPersianDigits(day)}
                      </span>

                      {isToday && (
                        <span className="text-[9px] font-bold leading-none mt-1 text-[#FFFF66]">
                          امروز
                        </span>
                      )}

                      {hasItems && !isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1C1C1C] mt-1" />
                      )}

                      {hasItems && isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FFFF66] absolute top-1.5 left-1.5" title="دارای برنامه مشترک" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom 4-Dot Legend */}
              {showCycleOnCalendar && (
                <div className="pt-4 border-t-[1.5px] border-[#1C1C1C]/15 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-[#1C1C1C]">
                  <span className="flex items-center gap-1.5 bg-[#F29B47]/35 px-2.5 py-1 rounded-full border border-[#1C1C1C]">
                    <span className="w-3 h-3 rounded-full bg-[#F29B47] border border-[#1C1C1C] inline-block" />
                    <span>دوره پریود</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#6BCFEA]/35 px-2.5 py-1 rounded-full border border-[#1C1C1C]">
                    <span className="w-3 h-3 rounded-full bg-[#6BCFEA] border border-[#1C1C1C] inline-block" />
                    <span>دوره PMS</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#5ED46A]/45 px-2.5 py-1 rounded-full border border-[#1C1C1C]">
                    <span className="w-3 h-3 rounded-full bg-[#5ED46A] border border-[#1C1C1C] inline-block" />
                    <span>دوره باروری</span>
                  </span>
                  <span className="flex items-center gap-1.5 bg-[#5ED46A]/45 px-2.5 py-1 rounded-full border border-[#1C1C1C]">
                    <span className="w-3 h-3 rounded-full bg-[#5ED46A] border border-[#1C1C1C] inline-block" />
                    <span>روز تخمک‌گذاری</span>
                  </span>
                </div>
              )}
            </div>

            {/* List of items scheduled for current month */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-base font-bold text-[#1C1C1C]">برنامه‌ها و سفرهای این ماه</h4>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 rounded-full bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[1.9]" />
                  <span>برنامه جدید</span>
                </button>
              </div>
              {itemsInCurrentJalaliMonth.length === 0 ? (
                <div className="text-center py-8 px-4 text-[#1C1C1C] bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] text-xs font-medium">
                  هیچ برنامه یا سفری برای این ماه تنظیم نشده است. از دکمه «برنامه جدید» آرزویی با تاریخ ثبت کنید.
                </div>
              ) : (
                <div className="space-y-3">
                  {itemsInCurrentJalaliMonth.map((item) => {
                    const catConfig = allCategories.find((c) => c.id === item.category) || allCategories[0];
                    const CatIcon = catConfig.icon;
                    return (
                      <div
                        key={item.id}
                        className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center shrink-0">
                            {typeof catConfig.iconName === "string" && !PRESET_ICONS[catConfig.iconName] ? (
                              <span className="text-sm">{catConfig.iconName}</span>
                            ) : (
                              <CatIcon className="w-4.5 h-4.5 stroke-[1.9]" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-[#1C1C1C]">{item.title}</h5>
                            <span className="text-xs text-[#1C1C1C]/75 font-medium flex items-center gap-1 mt-0.5">
                              <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
                              <span>{toPersianDigits(formatPersianDate(item.date))}</span>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveTab("wishlist");
                            setCategoryFilter(item.category);
                          }}
                          className="px-3.5 py-1.5 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                          مشاهده
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 4: PERIOD TRACKER (TOGHROOL CYCLE ENGINE & NEOBRUTALIST UI) --- */}
        {activeTab === "period" && (
          <div className="max-w-xl mx-auto pb-28 sm:pb-12" dir="rtl">
            <ImpoPeriodTracker
              userProfile={userProfile}
              onSendPoke={handleSendPeriodSupportPoke}
              openLogTrigger={periodLogTrigger}
              onUpdateGender={(gender) => {
                setEditGender(gender);
                if (onUpdateUserProfile) {
                  onUpdateUserProfile({ ...userProfile, gender });
                }
              }}
            />
          </div>
        )}

        {/* --- TAB 5: MEMORIES (EXACT SCREEN 3 BUBBLEGUM PINK WORLD + MASCOT + DARK PILL CTA) --- */}
        {activeTab === "memories" && (
          <div className="space-y-4" dir="rtl">
            {/* Expandable Search Drawer */}
            <AnimatePresence>
              {(showMemoriesSearch || searchQuery) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="جستجو در عنوان یا متن خاطرات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-medium text-[#1C1C1C] placeholder-[#1C1C1C]/55 focus:outline-none text-right"
                    />
                    <Search className="w-3.5 h-3.5 text-[#1C1C1C] absolute top-1/2 right-3.5 -translate-y-1/2 pointer-events-none stroke-[1.9]" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute top-1/2 left-2.5 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#1C1C1C] rounded-full cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5 stroke-[1.9]" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lex Hero Banner for Memories */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] overflow-hidden text-[#1C1C1C]">
              <div className="border-b-[1.5px] border-[#1C1C1C]">
                <LexWaveStrip className="h-6" />
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[12px] font-bold text-[#6E6B66]">آلبوم دونفره ما ✦</span>
                    <h2 className="text-[24px] sm:text-[28px] font-black tracking-tight truncate mt-1 text-[#1C1C1C]">
                      {toPersianDigits(memories.length)} خاطره ماندگار
                    </h2>
                    <p className="text-[14px] text-[#6E6B66] mt-1 leading-relaxed">
                      لحظه‌ها، عکس‌ها و کپسول‌های زمان مشترک {userProfile.displayName} و {partnerProfile?.displayName || "پارتنر"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMemoryFormDate("");
                    setMemoryFormTitle("");
                    setMemoryFormContent("");
                    setMemoryFormImageUrl("");
                    setShowAddMemoryModal(true);
                  }}
                  className="w-full py-3 rounded-full text-[15px] font-bold text-white bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  <span>ثبت خاطره جدید</span>
                </button>
              </div>
            </div>

            {/* Memories List */}
            {(() => {
              const filteredMemories = memories.filter(
                (m) =>
                  m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.content.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredMemories.length === 0) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-10 text-center"
                  >
                    <div className="w-16 h-16 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] rounded-full flex items-center justify-center text-[#1C1C1C] mx-auto mb-4">
                      <HeartHandshake className="w-7 h-7 stroke-[1.9]" />
                    </div>
                    <h3 className="text-base font-black text-[#1C1C1C]">هنوز خاطره‌ای ثبت نشده است</h3>
                    <p className="text-[#1C1C1C]/75 text-xs sm:text-sm font-medium mt-1.5 leading-relaxed max-w-md mx-auto">
                      {searchQuery
                        ? "هیچ خاطره‌ای با عبارت جستجو شده پیدا نشد."
                        : "اولین خاطره مشترک خودتان را ثبت کنید تا آلبوم خاطراتتان شکل بگیرد."}
                    </p>
                  </motion.div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredMemories.map((memory, idx) => {
                    const isCapsule = !!memory.isTimeCapsule;
                    const todayIso = new Date().toISOString().split("T")[0];
                    const isLocked = isCapsule && !!memory.unlockDate && memory.unlockDate > todayIso;
                    const formatIsoToJalaliLabel = (raw?: string | null) => {
                      if (!raw) return "";
                      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
                      if (m && parseInt(m[1], 10) >= 1900) {
                        const [jy, jm, jd] = gregorianToJalali(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
                        return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
                      }
                      return toPersianDigits(raw);
                    };

                    return (
                      <motion.div
                        key={memory.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => {
                          if (isLocked) {
                            triggerAlert(`این خاطره به عنوان یک کپسول زمان تا تاریخ ${formatIsoToJalaliLabel(memory.unlockDate)} قفل است و محتوای آن برای هر دوی شما محفوظ و مهروموم شده است! ⏳🔒`);
                            return;
                          }
                          setSelectedMemory(memory);
                        }}
                        className="group bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] overflow-hidden transition-all flex flex-col text-right relative cursor-pointer"
                      >
                        {/* Optional Memory Image Cover or Locked Capsule Banner */}
                        {isLocked ? (
                          <div className="relative h-32 bg-[#A9ABEE] border-b-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center text-center p-4 overflow-hidden">
                            <div className="w-10 h-10 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mb-1.5">
                              <Lock className="w-4 h-4 stroke-[1.9]" />
                            </div>
                            <span className="text-xs font-bold text-[#1C1C1C]">کپسول زمان مهروموم‌شده</span>
                            <span className="text-[10px] text-[#1C1C1C]/80 mt-0.5 font-bold">
                              بازگشایی در {memory.unlockDate ? formatIsoToJalaliLabel(memory.unlockDate) : "موعد مقرر"}
                            </span>
                          </div>
                        ) : memory.imageUrl ? (
                          <div className="relative h-40 overflow-hidden bg-[#E9E7E1]">
                            <img
                              src={memory.imageUrl}
                              alt={memory.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        ) : null}

                        <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            {/* Quiet Monochrome Date & Author Metadata */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#8A8479]">
                                <span>
                                  {(() => {
                                    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(memory.date || "");
                                    if (m && parseInt(m[1], 10) >= 1900) {
                                      const [jy, jm, jd] = gregorianToJalali(parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10));
                                      return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
                                    }
                                    return toPersianDigits(memory.date);
                                  })()}
                                </span>
                                <span className="text-[#D0C9B8]">·</span>
                                <span className="text-[#5C5850]">{memory.createdByName}</span>
                              </div>
                              {isCapsule && !isLocked && (
                                <span className="text-[10px] font-medium text-[#5D7C2B] bg-[#EEF4E3] px-2 py-0.5 rounded-full">
                                  گشوده‌شده
                                </span>
                              )}
                            </div>

                            {/* Bold Editorial Memory Title */}
                            <h3 className="text-[17px] sm:text-lg font-black text-[#191817] leading-snug mb-1.5 tracking-tight">
                              {memory.title}
                            </h3>

                            {/* Memory Content */}
                            {isLocked ? (
                              <p className="text-[#A6A297] text-xs font-medium italic select-none blur-[3px]">
                                این متن تا روز بازگشایی کپسول زمان مخفی و محفوظ است و سپس نمایان خواهد شد.
                              </p>
                            ) : (
                              <p className="text-[#6E6A61] text-xs leading-relaxed whitespace-pre-wrap break-words font-medium line-clamp-3">
                                {memory.content}
                              </p>
                            )}

                            {!isLocked && memory.content && memory.content.length > 100 && (
                              <span className="text-[11px] font-bold text-[#191817] mt-2 inline-block underline decoration-[#D8D1C0] decoration-2 underline-offset-4">
                                مطالعه کامل خاطره
                              </span>
                            )}
                          </div>

                        {/* Calm Reactions & Comments Footer (Emoji Picker Progressive on Tap!) */}
                        {(() => {
                          const groupedReactions: { [emoji: string]: { count: number; userReacted: boolean } } = {};
                          (memory.reactions || []).forEach((r) => {
                            if (!groupedReactions[r.emoji]) {
                              groupedReactions[r.emoji] = { count: 0, userReacted: false };
                            }
                            groupedReactions[r.emoji].count += 1;
                            if (r.uid === userProfile.uid) {
                              groupedReactions[r.emoji].userReacted = true;
                            }
                          });
                          const isPickerOpen = openReactionMemoryId === memory.id;

                          return (
                            <div className="pt-3 border-t border-[#E9E7E1] space-y-2">
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleMemoryReaction(memory.id, emoji);
                                      }}
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 border ${
                                        data.userReacted
                                          ? "bg-[#FFFFFF] text-[#191817] border-[#191817]"
                                          : "bg-[#F4F0E6] text-[#5C5850] border-transparent hover:bg-[#EAE4D7]"
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-[10px]">{toPersianDigits(data.count)}</span>
                                    </button>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenReactionMemoryId((prev) => (prev === memory.id ? null : memory.id));
                                    }}
                                    className="px-2.5 py-1 rounded-full text-[11px] font-medium text-[#6E6B66] hover:text-[#191817] bg-[#F4F0E6] hover:bg-[#EAE4D7] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Smile className="w-3.5 h-3.5 stroke-[1.8]" />
                                    <span>واکنش</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-[#6E6B66] hover:text-[#191817] px-2 py-1 rounded-full">
                                    <MessageCircleHeart className="w-3.5 h-3.5 stroke-[1.7]" />
                                    <span>
                                      {(memory.comments || []).length > 0
                                        ? `${toPersianDigits((memory.comments || []).length)} نظر`
                                        : "نظر"}
                                    </span>
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMemory(memory.id);
                                    }}
                                    className="w-7 h-7 rounded-full text-[#A6A297] hover:text-[#D94E4E] hover:bg-[#FFF2F2] flex items-center justify-center transition-colors cursor-pointer"
                                    title="حذف خاطره"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 stroke-[1.7]" />
                                  </button>
                                </div>
                              </div>

                              {isPickerOpen && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 bg-[#F6F4F0] border border-[#EAE4D7] rounded-full px-2.5 py-1 w-fit"
                                >
                                  {["❤️", "😍", "🥹", "😂", "🔥", "🌸"].map((emoji) => (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleMemoryReaction(memory.id, emoji);
                                        setOpenReactionMemoryId(null);
                                      }}
                                      className="w-7 h-7 rounded-full hover:bg-white transition-colors text-sm cursor-pointer flex items-center justify-center"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              );
            })()}
          </div>
        )}

        {/* --- TAB 6: PRIVATE FINANCIAL MANAGEMENT --- */}
        {activeTab === "finance" && <FinanceSection userProfile={userProfile} />}

        {/* --- CUSTOM SCRAPBOOK BOARD TAB VIEW --- */}
        {activeTab.startsWith("tab-") && (
          <div className="space-y-8" dir="rtl">
            {(() => {
              const currentTabId = activeTab.replace("tab-", "");
              const tab = customTabs.find((t) => t.id === currentTabId);
              if (!tab) return <p className="text-center text-[#1C1C1C]/70 font-bold">تب پیدا نشد یا حذف شده است.</p>;

              return (
                <div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-6">
                    <div>
                      <h2 className="text-xl font-black text-[#1C1C1C] flex items-center gap-2.5">
                        <span className="w-11 h-11 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-lg">
                          {tab.icon || "✨"}
                        </span>
                        <span>{tab.title}</span>
                      </h2>
                      <p className="text-[#1C1C1C]/75 text-xs mt-1.5 font-medium">
                        برد یادداشت‌ها، برنامه‌ها و پیام‌های دونفره مخصوص «{tab.title}»
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddNoteModal(true)}
                      className="py-2.5 px-5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs sm:text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer self-start md:self-center active:translate-y-0.5"
                    >
                      <Plus className="w-4 h-4 stroke-[1.9]" />
                      <span>افزودن یادداشت جدید</span>
                    </button>
                  </div>

                  {notes.length === 0 ? (
                    <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px] p-14 text-center max-w-lg mx-auto">
                      <div className="w-16 h-16 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] rounded-full flex items-center justify-center text-[#1C1C1C] mx-auto mb-4">
                        <Edit2 className="w-7 h-7 stroke-[1.9]" />
                      </div>
                      <h3 className="text-base font-black text-[#1C1C1C]">این برد هنوز خالیه</h3>
                      <p className="text-[#1C1C1C]/75 font-medium text-xs mt-2 leading-relaxed">
                        اولین پیام عاشقانه یا یادداشت روزانه‌تان را روی این برد سنجاق کنید تا پارتنرتان ببیند.
                      </p>
                      <button
                        onClick={() => setShowAddNoteModal(true)}
                        className="mt-6 inline-flex items-center py-2.5 px-6 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold rounded-full gap-2 transition-all cursor-pointer active:translate-y-0.5"
                      >
                        <Plus className="w-4 h-4 stroke-[1.9]" />
                        <span>نوشتن اولین یادداشت</span>
                      </button>
                    </div>
                  ) : (
                    /* Neobrutalist Sticky Note Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {notes.map((note) => {
                        const noteBgClasses: Record<string, string> = {
                          yellow: "bg-[#FFFF66] text-[#1C1C1C]",
                          pink: "bg-[#EBA2F8] text-[#1C1C1C]",
                          blue: "bg-[#6BCFEA] text-[#1C1C1C]",
                          violet: "bg-[#A9ABEE] text-[#1C1C1C]",
                          green: "bg-[#5ED46A] text-[#1C1C1C]"
                        };
                        const bgClass = noteBgClasses[note.color] || noteBgClasses.yellow;

                        return (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] relative group/note flex flex-col justify-between min-h-[165px] transition-transform hover:-translate-y-0.5 ${bgClass}`}
                          >
                            <div className="relative">
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="absolute top-0 left-0 w-8 h-8 rounded-full bg-white border-[1.5px] border-[#1C1C1C] hover:bg-[#F29B47] text-[#1C1C1C] flex items-center justify-center opacity-100 sm:opacity-0 group-hover/note:opacity-100 transition-all cursor-pointer"
                                title="حذف یادداشت"
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[1.9]" />
                              </button>

                              <p className="text-sm font-bold whitespace-pre-wrap leading-relaxed pl-9 text-right">
                                {note.content}
                              </p>
                            </div>

                            <div className="mt-6 pt-3 border-t-[1.5px] border-[#1C1C1C]/20 flex items-center justify-between text-[11px] text-[#1C1C1C] font-bold">
                              <div className="flex items-center gap-1.5">
                                {note.photoURL ? (
                                  note.photoURL.length <= 4 ? (
                                    <span className="text-sm">{note.photoURL}</span>
                                  ) : (
                                    <img
                                      src={note.photoURL}
                                      alt=""
                                      className="w-5 h-5 rounded-full object-cover border border-[#1C1C1C]"
                                      referrerPolicy="no-referrer"
                                    />
                                  )
                                ) : (
                                  <span className="text-xs">👤</span>
                                )}
                                <span>{note.createdByName}</span>
                              </div>
                              <span>
                                {note.createdAt?.seconds
                                  ? new Date(note.createdAt.seconds * 1000).toLocaleDateString("fa-IR")
                                  : "ثبت‌شده"}
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Heart className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">افزودن آرزوی جدید</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">عنوان آرزو</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: سفر به شیراز، خرید کادو تولد، فیلم اینسپشن"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/45 font-medium focus:outline-none transition-colors text-right"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">دسته‌بندی (قفسه آرزو)</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-right font-bold text-[#1C1C1C] focus:outline-none transition-colors"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">سطح بودجه / برآورد هزینه</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewBudget('economy')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        newBudget === 'economy'
                          ? 'bg-[#5ED46A] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟢</span>
                      <span>اقتصادی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBudget('medium')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        newBudget === 'medium'
                          ? 'bg-[#FFFF66] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟡</span>
                      <span>میان‌رده</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBudget('luxury')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        newBudget === 'luxury'
                          ? 'bg-[#A9ABEE] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟣</span>
                      <span>لاکچری</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">توضیحات (اختیاری)</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="جزییات، حس خوب یا برنامه‌ریزی اولیه..."
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/45 font-medium text-right h-22 resize-none focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">لینک مرتبط / آدرس خرید (اختیاری)</label>
                  <input
                    type="url"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://example.com/item"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/45 font-medium text-left focus:outline-none transition-colors"
                    dir="ltr"
                  />
                  {fetchingPreview && (
                    <span className="text-[11px] text-[#1C1C1C] flex items-center gap-1.5 mt-1 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال بارگذاری پیش‌نمایش لینک...</span>
                    </span>
                  )}
                  {previewData && (
                    <div className="border-[1.5px] border-[#1C1C1C] bg-white p-2.5 rounded-2xl mt-2 flex gap-2.5 items-center">
                      {previewData.image && (
                        <img
                          src={previewData.image}
                          alt="preview"
                          className="w-11 h-11 object-cover rounded-xl shrink-0 border-[1.5px] border-[#1C1C1C]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#1C1C1C] truncate">{previewData.title}</h5>
                        <p className="text-[10px] font-medium text-[#1C1C1C]/70 line-clamp-1 mt-0.5">{previewData.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="text-xs font-bold text-[#1C1C1C] block">تاریخ برنامه‌ریزی / انجام (اختیاری)</label>
                  <JalaliDatePicker
                    value={newDate}
                    onChange={setNewDate}
                    placeholder="انتخاب تاریخ برنامه‌ریزی..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer active:translate-y-0.5"
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-right text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Edit2 className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">ویرایش آرزو</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditWishModal(false);
                    setEditingWish(null);
                  }}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleUpdateWish} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">عنوان آرزو</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="مثال: سفر به شیراز، خرید کادو تولد، فیلم اینسپشن"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right font-bold focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">دسته‌بندی (قفسه آرزو)</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-right font-bold text-[#1C1C1C] focus:outline-none transition-colors"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">سطح بودجه / برآورد هزینه</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditBudget('economy')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editBudget === 'economy'
                          ? 'bg-[#5ED46A] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟢</span>
                      <span>اقتصادی</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBudget('medium')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editBudget === 'medium'
                          ? 'bg-[#FFFF66] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟡</span>
                      <span>میان‌رده</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBudget('luxury')}
                      className={`py-2 px-3 rounded-2xl text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        editBudget === 'luxury'
                          ? 'bg-[#A9ABEE] text-[#1C1C1C]'
                          : 'bg-white text-[#1C1C1C]/70 hover:bg-[#FFFFFF]'
                      }`}
                    >
                      <span>🟣</span>
                      <span>لاکچری</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">توضیحات (اختیاری)</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="جزییات، حس خوب یا برنامه‌ریزی اولیه..."
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right h-22 resize-none font-medium focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">لینک مرتبط / آدرس خرید (اختیاری)</label>
                  <input
                    type="url"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://example.com/item"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] font-medium text-left focus:outline-none transition-colors"
                    dir="ltr"
                  />
                  {fetchingEditPreview && (
                    <span className="text-[11px] text-[#1C1C1C] flex items-center gap-1.5 mt-1 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال بارگذاری پیش‌نمایش لینک...</span>
                    </span>
                  )}
                  {editPreviewData && (
                    <div className="border-[1.5px] border-[#1C1C1C] bg-white p-2.5 rounded-2xl mt-2 flex gap-2.5 items-center">
                      {editPreviewData.image && (
                        <img
                          src={editPreviewData.image}
                          alt="preview"
                          className="w-11 h-11 object-cover rounded-xl shrink-0 border-[1.5px] border-[#1C1C1C]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-[#1C1C1C] truncate">{editPreviewData.title}</h5>
                        <p className="text-[10px] font-medium text-[#1C1C1C]/70 line-clamp-1 mt-0.5">{editPreviewData.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-right" dir="rtl">
                  <label className="text-xs font-bold text-[#1C1C1C] block">تاریخ برنامه‌ریزی / انجام (اختیاری)</label>
                  <JalaliDatePicker
                    value={editDate}
                    onChange={setEditDate}
                    placeholder="انتخاب تاریخ برنامه‌ریزی..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer active:translate-y-0.5"
                >
                  به‌روزرسانی آرزو
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT PROFILE MODAL --- */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <User className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">ویرایش پروفایل من</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              {cropImageSrc ? (
                <div className="flex flex-col items-center space-y-4 pt-2">
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-[#1C1C1C]">برش تصویر پروفایل</h4>
                    <p className="text-[11px] font-medium text-[#1C1C1C]/75 mt-1">
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
                    className="w-[240px] h-[240px] rounded-full overflow-hidden border-[1.5px] border-[#1C1C1C] relative bg-white cursor-move select-none"
                  >
                    <img
                      src={cropImageSrc}
                      alt="Crop preview"
                      className="absolute pointer-events-none max-w-none origin-center"
                      style={{
                        width: imageDimensions.width ? `${imageDimensions.width}px` : "auto",
                        height: imageDimensions.height ? `${imageDimensions.height}px` : "auto",
                        transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropScale})`,
                        transition: isDraggingCrop ? "none" : "transform 0.1s ease-out"
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
                    <div className="absolute inset-0 rounded-full border border-dashed border-white/60 pointer-events-none flex items-center justify-center">
                      <div className="w-12 h-12 border border-white/40 rounded-full" />
                    </div>
                  </div>

                  {/* Zoom Control */}
                  <div className="w-full space-y-1 px-4 text-right">
                    <label className="text-[11px] font-bold text-[#1C1C1C] flex justify-between">
                      <span>بزرگنمایی: {toPersianDigits(Math.round(cropScale * 100))}٪</span>
                      <span>زوم</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.05"
                      value={cropScale}
                      onChange={(e) => setCropScale(parseFloat(e.target.value))}
                      className="w-full accent-[#1C1C1C]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2.5 w-full pt-2">
                    <button
                      type="button"
                      onClick={() => setCropImageSrc(null)}
                      className="flex-1 py-3 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      لغو
                    </button>
                    <button
                      type="button"
                      onClick={handlePerformCrop}
                      className="flex-1 py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      برش و تایید آواتار
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4 text-right">
                  {/* Avatar Preview and Upload Area */}
                  <div className="flex flex-col items-center justify-center p-5 bg-white rounded-[24px] border-[1.5px] border-[#1C1C1C] gap-3">
                    <div className="relative">
                      {(() => {
                        const isEmoji = editPhotoURL && editPhotoURL.length <= 4;
                        const sizeClasses = "w-20 h-20";
                        if (editPhotoURL && !isEmoji) {
                          return (
                            <img
                              src={editPhotoURL}
                              alt="avatar preview"
                              className={`${sizeClasses} rounded-full object-cover border-[1.5px] border-[#1C1C1C]`}
                              referrerPolicy="no-referrer"
                            />
                          );
                        } else if (editPhotoURL && isEmoji) {
                          return (
                            <div className={`${sizeClasses} bg-[#FFFF66] rounded-full flex items-center justify-center border-[1.5px] border-[#1C1C1C] text-4xl`}>
                              {editPhotoURL}
                            </div>
                          );
                        } else {
                          return (
                            <div className={`${sizeClasses} bg-[#EBA2F8] text-[#1C1C1C] rounded-full flex items-center justify-center border-[1.5px] border-[#1C1C1C] font-bold text-2xl`}>
                              {editDisplayName ? editDisplayName.charAt(0) : "👤"}
                            </div>
                          );
                        }
                      })()}

                      <label
                        className="absolute -bottom-1 -right-1 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-[1.5px] border-[#1C1C1C] transition-all"
                        title="آپلود و برش عکس جدید"
                      >
                        <Camera className="w-4 h-4 stroke-[1.9]" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-[#1C1C1C]/75 font-medium">
                      برای آپلود و برش عکس روی آیکون دوربین کلیک کنید
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1C1C] block">نام نمایشی شما</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="نام یا لقب شما..."
                      className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right font-bold focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1C1C] block">نقش و تم شما در طغرل</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditGender("female")}
                        className={`py-2.5 px-3 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          editGender === "female"
                            ? "bg-[#FF7EB6] text-[#1C1C1C]"
                            : "bg-white text-[#1C1C1C]/70 hover:bg-[#FFEAF3]"
                        }`}
                      >
                        <span>خانم (تم صورتی 💖)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditGender("male")}
                        className={`py-2.5 px-3 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          editGender === "male"
                            ? "bg-[#4FA9F6] text-[#1C1C1C]"
                            : "bg-white text-[#1C1C1C]/70 hover:bg-[#E8F3FE]"
                        }`}
                      >
                        <span>آقا (تم آبی 💙)</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#1C1C1C]/75 font-medium text-right px-1">
                      {editGender === "female"
                        ? "ساید صورتی: تقویم سلامت و ثبت چرخه قاعدگی، پیش‌بینی روزهای حساس و احوالات روزانه."
                        : "ساید آبی: راهنمای همراهی عاشقانه، هوای پارتنر رو داشتن و هشدارهای همدلی."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#1C1C1C] block">انتخاب آواتار از ایموجی‌ها</label>
                    <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 bg-white p-3 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
                      {PRESET_AVATARS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditPhotoURL(emoji)}
                          className={`text-xl p-2 rounded-2xl transition-all cursor-pointer flex items-center justify-center ${
                            editPhotoURL === emoji
                              ? "bg-[#FFFF66] border-[1.5px] border-[#1C1C1C]"
                              : "hover:bg-[#F6F4F0]/40 border-[1.5px] border-transparent"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className={`w-full py-3.5 mt-2 bg-[#FFFF66] hover:bg-[#F5F55A] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
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

              {/* --- COUPLE PAIRING & INVITE CODE (Always accessible) --- */}
              {!cropImageSrc && (
                <div className="mt-6 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      <span>کد اتصال دونفره شما</span>
                    </h4>
                    <span className="text-[10px] font-bold text-[#1C1C1C] bg-[#FFFF66] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#1C1C1C]">
                      اختصاصی
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-[#1C1C1C]/75 mb-3 leading-relaxed">
                    این کد اختصاصی شماست. پارتنر شما در صفحه ورود یا اتصال می‌تواند این کد را وارد کند تا حساب‌های شما فوراً به یکدیگر متصل شوند:
                  </p>

                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base sm:text-lg font-bold tracking-widest text-[#1C1C1C] select-all bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] px-3.5 py-1.5 rounded-xl">
                        {userProfile.coupleCode || "---"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyCoupleCode}
                        className="px-3 py-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 active:translate-y-0.5"
                        title="کپی کردن کد"
                      >
                        {copiedCoupleCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#5ED46A]" />
                            <span>کپی شد!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>کپی کد</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleShareCoupleCode}
                        className="p-2 bg-[#EBA2F8] hover:brightness-95 border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-xl transition-all cursor-pointer flex items-center justify-center active:translate-y-0.5"
                        title="ارسال مستقیم برای پارتنر"
                      >
                        <Share2 className="w-4 h-4 text-[#1C1C1C]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- MOBILE NOTIFICATIONS & HEARTBEAT VIBRATION --- */}
              {!cropImageSrc && (
                <div className="mt-5 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      <span>نوتیفیکیشن موبایل و ویبره ضربان قلب</span>
                    </h4>
                    <span
                      className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border-[1.5px] border-[#1C1C1C] ${
                        notificationsEnabled
                          ? "bg-[#5ED46A] text-[#1C1C1C]"
                          : "bg-[#F29B47] text-[#1C1C1C]"
                      }`}
                    >
                      {notificationsEnabled ? "فعال" : "غیرفعال"}
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-[#1C1C1C]/75 mb-3 leading-relaxed">
                    با فعال بودن این بخش، هنگام دریافت «الان به یادتم» و پیام‌های عاشقانه، نوتیفیکیشن در نوار اعلانات گوشی شما همراه با لرزش طبیعی ضربان قلب پخش می‌شود.
                  </p>

                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3 flex items-center justify-between gap-2.5">
                    {notificationsEnabled ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5ED46A] border border-[#1C1C1C] animate-ping" />
                          <span className="text-xs font-bold text-[#1C1C1C]">اعلان‌های گوشی فعال است</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);
                            playHeartbeatAudio();
                            triggerDeviceNotification({
                              title: "💖 تست نوتیفیکیشن و ضربان قلب طغرل",
                              body: "ویبره ضربان قلب با موفقیت تست شد!",
                              isLovePing: true
                            });
                            try {
                              await fetchFromPhpApi('testPushNotification', {}, 'POST');
                            } catch (e) {}
                          }}
                          className="px-3 py-1.5 bg-[#EBA2F8] hover:brightness-95 border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>💓 تست ضربان قلب</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] text-[#1C1C1C]/75 font-medium">دسترسی نوتیفیکیشن هنوز تایید نشده است.</span>
                        <button
                          type="button"
                          onClick={requestNotificationPermission}
                          className="px-3.5 py-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Bell className="w-3.5 h-3.5 text-[#FFFF66]" />
                          <span>فعال‌سازی نوتیفیکیشن</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Partner Cheat-Sheet Card */}
              {!cropImageSrc && (
                <div className="mt-5 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      <span>تقلب‌نامه شناخت پارتنر</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      setShowPartnerCheatSheetModal(true);
                    }}
                    className="w-full p-3.5 bg-white hover:bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-2xl flex items-center justify-between text-right cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1C1C1C]">مشاهده و ویرایش تقلب‌نامه 📝</p>
                        <p className="text-[10px] text-[#1C1C1C]/70 font-medium mt-0.5">
                          سایز لباس، قهوه محبوب، گل مورد علاقه و فانتزی‌های کوچک
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#1C1C1C] bg-[#FFFF66] px-2.5 py-1 rounded-full border-[1.5px] border-[#1C1C1C] shrink-0">
                      مشاهده
                    </span>
                  </button>
                </div>
              )}

              {/* Anniversary & Love Days Counter Card */}
              {!cropImageSrc && userProfile.coupleId && (
                <div className="mt-4 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#1C1C1C] fill-current" />
                      <span>روزشمار عشق و سالگردها</span>
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      setShowAnniversaryModal(true);
                    }}
                    className="w-full p-3.5 bg-white hover:bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-2xl flex items-center justify-between text-right cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] group-hover:scale-105 transition-transform">
                        <span className="text-base">💍</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#1C1C1C]">
                          {userProfile.coupleInfo?.relationshipStartDate
                            ? `${toPersianDigits(calculateDaysBetween(userProfile.coupleInfo.relationshipStartDate))} روز عاشقی در کنار هم ❤️`
                            : "تنظیم تاریخ آشنایی و سالگردها"}
                        </p>
                        <p className="text-[10px] text-[#1C1C1C]/70 font-medium mt-0.5">
                          {userProfile.coupleInfo?.relationshipStartDate
                            ? `شروع از ${toPersianDigits(formatPersianDate(userProfile.coupleInfo.relationshipStartDate))}`
                            : "ثبت تاریخ آشنایی، ازدواج و شمارش روزهای دونفره"}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#1C1C1C] bg-[#5ED46A] px-2.5 py-1 rounded-full border-[1.5px] border-[#1C1C1C] shrink-0">
                      {userProfile.coupleInfo?.relationshipStartDate ? "مشاهده" : "تنظیم"}
                    </span>
                  </button>
                </div>
              )}

              {/* Partner Management Section */}
              {!cropImageSrc && userProfile.partnerUid && (
                <div className="mt-6 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <h4 className="text-xs font-bold text-[#1C1C1C] mb-2.5">مدیریت ارتباط زوجین</h4>
                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        {renderAvatar(partnerProfile, "💖", "w-9 h-9")}
                        <span
                          className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-[#1C1C1C] ${
                            isPartnerOnline ? "bg-[#5ED46A]" : "bg-[#D1CCC0]"
                          }`}
                        />
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-[#1C1C1C]">{partnerProfile?.displayName || "پارتنر"}</p>
                          <span
                            className={`inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border border-[#1C1C1C] ${
                              isPartnerOnline
                                ? "bg-[#5ED46A] text-[#1C1C1C]"
                                : "bg-[#F6F4F0] text-[#1C1C1C]"
                            }`}
                          >
                            {isPartnerOnline ? "آنلاین" : "آفلاین"}
                          </span>
                        </div>
                        <p className="text-[10px] font-medium text-[#1C1C1C]/65 mt-0.5">{partnerProfile?.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnpairPartner}
                      className="px-3.5 py-1.5 bg-[#F29B47] hover:brightness-95 border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold rounded-full transition-all cursor-pointer"
                    >
                      قطع اتصال
                    </button>
                  </div>
                </div>
              )}

              {/* PWA App Installation Section */}
              {!cropImageSrc && !isStandalone && (
                <div className="mt-6 pt-4 border-t-[1.5px] border-[#1C1C1C]/15 text-right" dir="rtl">
                  <h4 className="text-xs font-bold text-[#1C1C1C] mb-2.5">نسخه وب‌اپلیکیشن (PWA)</h4>
                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                        <Smartphone className="w-4 h-4 stroke-[1.9]" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-[#1C1C1C]">نصب اپلیکیشن روی گوشی</p>
                        <p className="text-[10px] font-medium text-[#1C1C1C]/70 mt-0.5">اجرای تمام‌صفحه و دسترسی سریع بدون مرورگر</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false);
                        window.dispatchEvent(new CustomEvent("open-pwa-install"));
                      }}
                      className="px-3.5 py-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-[11px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:translate-y-0.5"
                    >
                      <Download className="w-3.5 h-3.5 text-[#FFFF66]" />
                      <span>نصب برنامه</span>
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Layers className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">افزودن دسته‌بندی جدید</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddShelfModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">عنوان دسته‌بندی جدید</label>
                  <input
                    type="text"
                    value={newShelfLabel}
                    onChange={(e) => setNewShelfLabel(e.target.value)}
                    placeholder="مثال: فیلم‌هایی که باید دید، کافه‌گردی"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right font-bold focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">انتخاب نماد</label>
                  <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
                    {Object.keys(PRESET_ICONS).map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewShelfIcon(iconName)}
                        className={`w-9 h-9 rounded-full border-[1.5px] transition-all cursor-pointer flex items-center justify-center ${
                          newShelfIcon === iconName
                            ? "bg-[#1C1C1C] text-white border-[#1C1C1C]"
                            : "bg-[#F6F4F0]/40 hover:bg-[#F6F4F0] text-[#1C1C1C] border-transparent"
                        }`}
                        title={iconName}
                      >
                        {iconName.length === 1 ? (
                          <span className="text-base">{iconName}</span>
                        ) : (
                          React.createElement(PRESET_ICONS[iconName] || Heart, { className: "w-4 h-4 stroke-[2]" })
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">انتخاب تم رنگی پاستلی</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_COLORS_LIST.map((colorSet) => (
                      <button
                        key={colorSet.name}
                        type="button"
                        onClick={() => setNewShelfColor(colorSet.name)}
                        className={`px-3 py-2 rounded-full border-[1.5px] border-[#1C1C1C] text-xs font-bold transition-all cursor-pointer text-center ${colorSet.bg} ${colorSet.color} ${
                          newShelfColor === colorSet.name
                            ? " scale-[1.02]"
                            : "opacity-80 hover:opacity-100"
                        }`}
                      >
                        {colorSet.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer active:translate-y-0.5"
                >
                  ایجاد دسته‌بندی آرزو
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD CUSTOM SCRAPBOOK BOARD TAB MODAL --- */}
      <AnimatePresence>
        {showAddTabModal && (
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Plus className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">ساخت برد یادداشت جدید</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTabModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleCreateTab} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">نام برد یادداشت</label>
                  <input
                    type="text"
                    value={newTabTitle}
                    onChange={(e) => setNewTabTitle(e.target.value)}
                    placeholder="مثال: حرف‌های عاشقانه، لیست خرید خونه"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right font-bold focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">نماد برد</label>
                  <div className="flex flex-wrap gap-2 bg-white p-3 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
                    {["✨", "💌", "📌", "🌸", "🏡", "🎬", "✈️", "🍯"].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewTabIcon(em)}
                        className={`w-10 h-10 rounded-full text-lg flex items-center justify-center transition-all cursor-pointer ${
                          newTabIcon === em ? "bg-[#FFFF66] border-[1.5px] border-[#1C1C1C]" : "bg-[#F6F4F0]/40 hover:bg-[#F6F4F0]"
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer active:translate-y-0.5"
                >
                  ایجاد برد جدید
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD SCRAPBOOK NOTE MODAL --- */}
      <AnimatePresence>
        {showAddNoteModal && (
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-md p-6 sm:p-7 text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <h3 className="text-base font-black text-[#1C1C1C]">نوشتن یادداشت جدید روی برد</h3>
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleCreateNote} className="space-y-4 text-right">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">متن یادداشت</label>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="پیام یا یادداشت خودتان را بنویسید..."
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] text-right h-28 resize-none font-medium focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">رنگ کاغذ پاستلی</label>
                  <div className="flex items-center justify-center gap-3 bg-white p-3.5 rounded-[24px] border-[1.5px] border-[#1C1C1C]">
                    {[
                      { key: "yellow", name: "زرد لیمویی", class: "bg-[#FFFF66]" },
                      { key: "pink", name: "صورتی آبنباتی", class: "bg-[#EBA2F8]" },
                      { key: "blue", name: "آبی آسمانی", class: "bg-[#6BCFEA]" },
                      { key: "violet", name: "بنفش یاسی", class: "bg-[#A9ABEE]" },
                      { key: "green", name: "سبز نعنایی", class: "bg-[#5ED46A]" }
                    ].map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setNewNoteColor(col.key)}
                        className={`w-10 h-10 rounded-full border-[1.5px] border-[#1C1C1C] transition-transform cursor-pointer ${col.class} ${
                          newNoteColor === col.key
                            ? " scale-110"
                            : "opacity-80 hover:opacity-100"
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all cursor-pointer active:translate-y-0.5"
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-lg p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-right text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Camera className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">ثبت خاطره شیرین جدید</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMemoryModal(false)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <form onSubmit={handleSaveMemory} className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">عنوان خاطره</label>
                  <input
                    type="text"
                    value={memoryFormTitle}
                    onChange={(e) => setMemoryFormTitle(e.target.value)}
                    placeholder="مثال: شام اولین سالگردمون، سفر شمال بارونی"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs sm:text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/45 text-right font-bold focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">تاریخ خاطره</label>
                  <JalaliDatePicker
                    value={memoryFormDate}
                    onChange={setMemoryFormDate}
                    placeholder="انتخاب تاریخ وقوع خاطره..."
                  />
                </div>

                {/* Image Upload Area with 16:9 Cropper Integration */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1C1C1C] block">تصویر خاطره (قاب ۱۶:۹)</label>
                    <span className="text-[10px] text-[#1C1C1C] font-bold bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] px-2.5 py-0.5 rounded-full">
                      اختیاری با کادربندی دقیق
                    </span>
                  </div>

                  {memoryFormImageUrl ? (
                    <div className="space-y-2">
                      <div className="relative rounded-2xl overflow-hidden border-[1.5px] border-[#1C1C1C] aspect-video bg-[#1C1C1C] group">
                        <img
                          src={memoryFormImageUrl}
                          alt="پیش‌نمایش خاطره"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-[#1C1C1C]/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMemoryCropImageSrc(memoryRawImageSrc || memoryFormImageUrl);
                            }}
                            className="px-4 py-2 bg-[#FFFF66] hover:brightness-95 border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 stroke-[1.9]" />
                            <span>تنظیم مجدد کادر</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMemoryFormImageUrl("");
                              setMemoryRawImageSrc(null);
                            }}
                            className="w-9 h-9 bg-[#F29B47] hover:brightness-95 border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] rounded-full flex items-center justify-center transition-all cursor-pointer"
                            title="حذف تصویر"
                          >
                            <Trash2 className="w-4 h-4 stroke-[1.9]" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-bold px-1 text-[#1C1C1C]">
                        <span className="text-[#1C1C1C] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 stroke-[1.9] text-[#1C1C1C]" />
                          <span>عکس متناسب با قاب ۱۶:۹ آماده شد</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setMemoryCropImageSrc(memoryRawImageSrc || memoryFormImageUrl);
                          }}
                          className="text-[#1C1C1C] underline cursor-pointer font-bold"
                        >
                          تغییر برش کادر
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
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
                      className="border-[1.5px] border-[#1C1C1C] bg-white hover:bg-[#FFFFFF] rounded-[24px] p-6 text-center transition-all cursor-pointer relative group"
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
                      <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <div className="w-11 h-11 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                          <Camera className="w-5 h-5 stroke-[1.9]" />
                        </div>
                        <span className="text-xs font-bold text-[#1C1C1C]">انتخاب عکس و برش در قاب ۱۶:۹ خاطرات</span>
                        <span className="text-[11px] text-[#1C1C1C]/70 font-medium">کلیک کنید یا عکس را بکشید و رها کنید</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block">داستان و متن خاطره</label>
                  <textarea
                    value={memoryFormContent}
                    onChange={(e) => setMemoryFormContent(e.target.value)}
                    placeholder="اینجا بنویس چه اتفاقی افتاد و چقدر بهمون خوش گذشت..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs sm:text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/45 text-right font-medium leading-relaxed resize-none focus:outline-none transition-colors"
                    required
                  />
                </div>

                {/* Phase 2: Time Capsule Option */}
                <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏳</span>
                      <div>
                        <span className="text-xs font-bold text-[#1C1C1C] block">کپسول زمان (نامه به آینده)</span>
                        <span className="text-[10px] font-medium text-[#1C1C1C]/70">قفل کردن محتوای این خاطره تا تاریخی معین</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMemoryFormIsTimeCapsule(!memoryFormIsTimeCapsule)}
                      className={`w-12 h-7 rounded-full border-[1.5px] border-[#1C1C1C] transition-colors cursor-pointer relative p-0.5 ${
                        memoryFormIsTimeCapsule ? 'bg-[#5ED46A]' : 'bg-[#E9E7E1]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-[#1C1C1C] transition-transform ${
                          memoryFormIsTimeCapsule ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {memoryFormIsTimeCapsule && (
                    <div className="pt-2 border-t-[1.5px] border-[#1C1C1C]/15 space-y-1.5">
                      <label className="text-xs font-bold text-[#1C1C1C] block">تاریخ بازگشایی و گشودن کپسول</label>
                      <JalaliDatePicker
                        value={memoryFormUnlockDate}
                        onChange={setMemoryFormUnlockDate}
                        placeholder="انتخاب تاریخ بازگشایی..."
                      />
                      <span className="text-[10px] text-[#1C1C1C] font-medium block bg-[#FFFF66] p-2 rounded-xl border border-[#1C1C1C]">
                        🔒 تا این تاریخ، محتوای این خاطره برای هر دو نفر شما مهروموم و قفل خواهد ماند.
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUploadingMemoryImage}
                  className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingMemoryImage ? "در حال پردازش و ثبت..." : "ثبت و ماندگار کردن خاطره"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MEMORY IMAGE CROPPER MODAL (16:9) --- */}
      <AnimatePresence>
        {memoryCropImageSrc && (
          <div className="fixed inset-0 bg-[#1C1C1C]/70 backdrop-blur-[2px] flex items-center justify-center p-4 z-[70]" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-[#F6F4F0] rounded-[28px] w-full max-w-lg p-6 border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] flex flex-col text-right text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#1C1C1C]/15 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center">
                    <Camera className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#1C1C1C]">
                      کادربندی تصویر خاطره (۱۶:۹)
                    </h3>
                    <p className="text-[11px] text-[#1C1C1C]/75 font-medium">
                      عکس را بکشید تا جابجا شود یا با لغزنده زیر زوم کنید
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoryCropImageSrc(null)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                  title="بستن"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              {/* Viewport Frame (16:9 Aspect Ratio) */}
              <div className="relative w-full aspect-video bg-[#1C1C1C] rounded-2xl overflow-hidden select-none touch-none border-[1.5px] border-[#1C1C1C]">
                <div
                  ref={memoryCropViewportRef}
                  onMouseDown={handleMemoryCropMouseDown}
                  onMouseMove={handleMemoryCropMouseMove}
                  onMouseUp={handleMemoryCropMouseUp}
                  onMouseLeave={handleMemoryCropMouseUp}
                  onTouchStart={handleMemoryCropTouchStart}
                  onTouchMove={handleMemoryCropTouchMove}
                  onTouchEnd={handleMemoryCropTouchEnd}
                  className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden"
                >
                  <img
                    src={memoryCropImageSrc}
                    alt="Memory crop preview"
                    draggable={false}
                    className="absolute pointer-events-none select-none max-w-none"
                    style={{
                      left: "50%",
                      top: "50%",
                      width: memoryImageDimensions.width ? `${memoryImageDimensions.width}px` : "auto",
                      height: memoryImageDimensions.height ? `${memoryImageDimensions.height}px` : "auto",
                      transform: `translate(-50%, -50%) translate(${memoryCropOffset.x}px, ${memoryCropOffset.y}px) scale(${memoryCropScale})`,
                      transformOrigin: "center center",
                      transition: isDraggingMemoryCrop ? "none" : "transform 0.05s ease-out"
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      const naturalWidth = img.naturalWidth || 800;
                      const naturalHeight = img.naturalHeight || 600;
                      const imgRatio = naturalWidth / naturalHeight;

                      const rect = memoryCropViewportRef.current?.getBoundingClientRect();
                      const vw = rect?.width || 440;
                      const vh = rect?.height || (vw * 9) / 16;
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
                      setMemoryCropOffset({ x: 0, y: 0 });
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
                  <div className="absolute bottom-2.5 left-2.5 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[10px] text-[#1C1C1C] font-bold px-2.5 py-1 rounded-full pointer-events-none flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#1C1C1C]" />
                    <span>قاب ۱۶:۹ بدون حاشیه خالی</span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-[#1C1C1C]">
                    <span>بزرگنمایی: {toPersianDigits(Math.round(memoryCropScale * 100))}٪</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMemoryCropOffset({ x: 0, y: 0 });
                        setMemoryCropScale(1);
                      }}
                      className="text-[#1C1C1C] underline text-[11px] cursor-pointer font-bold"
                    >
                      بازنشانی موقعیت و زوم
                    </button>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.02"
                    value={memoryCropScale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      setMemoryCropScale(newScale);
                      const rect = memoryCropViewportRef.current?.getBoundingClientRect();
                      const vw = rect?.width || 440;
                      const vh = rect?.height || (vw * 9) / 16;
                      setMemoryCropOffset((prev) =>
                        clampMemoryCropOffset(prev, newScale, memoryImageDimensions, { width: vw, height: vh })
                      );
                    }}
                    className="w-full accent-[#1C1C1C] cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setMemoryCropImageSrc(null)}
                    className="flex-1 py-3 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full transition-all cursor-pointer text-center"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={handlePerformMemoryCrop}
                    className="flex-[2] py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 stroke-[1.9] text-[#5ED46A]" />
                    <span>برش و ثبت کادر خاطره</span>
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-xl p-6 sm:p-7 overflow-y-auto max-h-[90vh] text-right text-[#1C1C1C]"
            >
              <div className="flex items-center justify-between mb-5 pb-3 border-b-[1.5px] border-[#1C1C1C]/15">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <Camera className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">خاطره شیرین مشترک</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMemory(null)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] hover:brightness-95 flex items-center justify-center text-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <div className="space-y-4">
                {selectedMemory.imageUrl && (
                  <div
                    onClick={() =>
                      setLightboxImage({
                        src: selectedMemory.rawImageUrl || selectedMemory.imageUrl,
                        title: selectedMemory.title,
                        date: selectedMemory.date
                      })
                    }
                    className="rounded-[24px] overflow-hidden border-[1.5px] border-[#1C1C1C] aspect-video bg-white relative cursor-pointer group transition-all"
                    title="برای مشاهده عکس کامل و بدون برش کلیک کنید"
                  >
                    <img
                      src={selectedMemory.imageUrl}
                      alt={selectedMemory.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-[#1C1C1C]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="px-4 py-2 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold rounded-full flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 stroke-[1.9] text-[#1C1C1C]" />
                        <span>مشاهده عکس کامل بدون برش</span>
                      </span>
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 group-hover:opacity-0 transition-opacity pointer-events-none">
                      <Maximize2 className="w-3 h-3 stroke-[1.9]" />
                      <span>اندازه کامل</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[#1C1C1C] bg-white border-[1.5px] border-[#1C1C1C] px-3 py-1.5 rounded-full">
                    {toPersianDigits(selectedMemory.date)}
                  </span>
                  <span className="font-bold text-[#1C1C1C] bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] px-3 py-1.5 rounded-full">
                    ثبت توسط {selectedMemory.createdByName}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-[#1C1C1C] leading-snug">
                  {selectedMemory.title}
                </h2>

                <div className="bg-white p-4 sm:p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] max-h-[300px] overflow-y-auto">
                  <p className="text-[#1C1C1C] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
                    {selectedMemory.content}
                  </p>
                </div>

                {/* --- MEMORY REACTIONS SECTION --- */}
                <div className="bg-white p-4 rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-3">
                  <span className="text-xs font-bold text-[#1C1C1C] block">واکنش‌های عاشقانه به این خاطره</span>

                  <div className="flex flex-wrap items-center gap-2">
                    {["❤️", "😍", "🥹", "😂", "🔥", "🌸", "✨"].map((emoji) => {
                      const reactions = selectedMemory.reactions || [];
                      const count = reactions.filter((r) => r.emoji === emoji).length;
                      const userReacted = reactions.some((r) => r.emoji === emoji && r.uid === userProfile.uid);

                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleMemoryReaction(selectedMemory.id, emoji)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center gap-1.5 ${
                            userReacted
                              ? "bg-[#5ED46A] text-[#1C1C1C]"
                              : "bg-[#F6F4F0]/40 hover:bg-[#F6F4F0] text-[#1C1C1C]"
                          }`}
                        >
                          <span className="text-base">{emoji}</span>
                          {count > 0 && <span>{toPersianDigits(count)}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const reactions = selectedMemory.reactions || [];
                    if (reactions.length === 0) return null;
                    return (
                      <div className="text-[11px] font-bold text-[#1C1C1C] pt-1 flex flex-wrap gap-1.5">
                        {reactions.map((r, i) => (
                          <span key={i} className="bg-[#FFFF66] border border-[#1C1C1C] px-2.5 py-0.5 rounded-full text-[#1C1C1C]">
                            {r.userName}: {r.emoji}
                          </span>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* --- MEMORY COMMENTS SECTION --- */}
                <div className="bg-white p-4 sm:p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] space-y-4">
                  <div className="flex items-center justify-between pb-2.5 border-b-[1.5px] border-[#1C1C1C]/15">
                    <h4 className="text-xs sm:text-sm font-bold text-[#1C1C1C] flex items-center gap-1.5">
                      <MessageCircleHeart className="w-4 h-4 stroke-[1.9]" />
                      <span>گفتگوهای دونفره روی این خاطره</span>
                      <span className="text-xs font-bold text-[#1C1C1C]/70">
                        ({toPersianDigits((selectedMemory.comments || []).length)})
                      </span>
                    </h4>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {(selectedMemory.comments || []).length === 0 ? (
                      <div className="text-center py-5 text-[#1C1C1C]/70 text-xs font-medium bg-[#F6F4F0]/30 rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C]/30">
                        هنوز نظری ثبت نشده است. اولین یادداشت را برای این خاطره بنویسید.
                      </div>
                    ) : (
                      (selectedMemory.comments || []).map((comm) => (
                        <div
                          key={comm.id}
                          className="bg-[#F6F4F0]/35 p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-start justify-between gap-2 text-right"
                        >
                          <div className="flex items-start gap-2.5 flex-1">
                            <div className="w-8 h-8 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] font-bold text-xs flex items-center justify-center shrink-0">
                              {comm.userName ? comm.userName.charAt(0) : "💕"}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-[#1C1C1C]">{comm.userName}</span>
                                {comm.createdAt && (
                                  <span className="text-[10px] text-[#1C1C1C]/65 font-medium">
                                    {toPersianDigits(formatPersianDate(comm.createdAt.slice(0, 10)))}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#1C1C1C] leading-relaxed font-medium whitespace-pre-wrap break-words">
                                {comm.text}
                              </p>
                            </div>
                          </div>

                          {comm.uid === userProfile.uid && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMemoryComment(selectedMemory.id, comm.id)}
                              className="w-7 h-7 rounded-full bg-white border border-[#1C1C1C] hover:bg-[#F29B47] text-[#1C1C1C] flex items-center justify-center transition-colors cursor-pointer"
                              title="حذف نظر من"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input Form */}
                  <div className="flex items-center gap-2 pt-2 border-t-[1.5px] border-[#1C1C1C]/15">
                    <input
                      type="text"
                      value={memoryCommentText}
                      onChange={(e) => setMemoryCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddMemoryComment(selectedMemory.id);
                        }
                      }}
                      placeholder="نظر یا حرف دلت درباره این خاطره..."
                      className="flex-1 px-4 py-2.5 bg-[#F6F4F0]/25 focus:bg-white rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] placeholder-[#1C1C1C]/45 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      disabled={isSubmittingComment || !memoryCommentText.trim()}
                      onClick={() => handleAddMemoryComment(selectedMemory.id)}
                      className="px-4 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] disabled:opacity-40 text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 stroke-[2]" />
                      <span>{isSubmittingComment ? "ثبت..." : "ارسال"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-2 mt-6 pt-4 border-t-[1.5px] border-[#1C1C1C]/15">
                <button
                  onClick={() => handleDeleteMemory(selectedMemory.id)}
                  className="px-4 py-2.5 text-xs font-bold text-[#1C1C1C] bg-[#F29B47] hover:brightness-95 border-[1.5px] border-[#1C1C1C] rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                  <span>حذف خاطره</span>
                </button>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="px-6 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs sm:text-sm font-bold rounded-full transition-all cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FULLSCREEN UNCROPPED LIGHTBOX MODAL --- */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 bg-[#1C1C1C]/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 z-[120]"
            dir="rtl"
            onClick={() => setLightboxImage(null)}
          >
            {/* Top Navigation Bar */}
            <div
              className="w-full max-w-5xl flex items-center justify-between text-white py-2 px-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 truncate ml-3">
                <span className="font-bold text-sm sm:text-base text-white truncate">
                  {lightboxImage.title}
                </span>
                {lightboxImage.date && (
                  <span className="text-[11px] font-bold text-[#1C1C1C] bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] px-2.5 py-0.5 rounded-full shrink-0">
                    {toPersianDigits(lightboxImage.date)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxImage.src}
                  download={`memory-${Date.now()}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center transition-all cursor-pointer"
                  title="دانلود تصویر"
                >
                  <Download className="w-4 h-4 stroke-[1.9]" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center transition-all cursor-pointer"
                  title="بستن (Esc)"
                >
                  <X className="w-5 h-5 stroke-[1.9]" />
                </button>
              </div>
            </div>

            {/* Main Image Container */}
            <div
              className="flex-1 w-full max-w-5xl flex items-center justify-center p-1 sm:p-3 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                src={lightboxImage.src}
                alt={lightboxImage.title}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-2xl select-none"
              />
            </div>

            {/* Bottom Caption Hint */}
            <div
              className="w-full text-center text-[11px] text-white/80 font-medium py-1.5 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span>نمایش عکس کامل و بدون برش خاطره • برای بستن در هر نقطه کلیک کنید یا کلید Esc را بزنید</span>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CUSTOM CONFIRM MODAL --- */}
      <AnimatePresence>
        {customConfirm?.isOpen && (
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-[100] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-sm p-6 text-[#1C1C1C]"
            >
              <h3 className="text-base font-black text-[#1C1C1C] mb-2">تایید عملیات</h3>
              <p className="text-[#1C1C1C] text-sm leading-relaxed mb-6 font-medium bg-white p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                {customConfirm.message}
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={() => setCustomConfirm(null)}
                  className="px-5 py-2.5 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={customConfirm.onConfirm}
                  className="px-5 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer"
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
          <div className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-[100] text-right" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-sm p-6 text-[#1C1C1C]"
            >
              <h3 className="text-base font-black text-[#1C1C1C] mb-2">پیام طغرل</h3>
              <p className="text-[#1C1C1C] text-sm leading-relaxed mb-6 font-medium bg-white p-3.5 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                {customAlert.message}
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCustomAlert(null)}
                  className="px-6 py-2.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  متوجه شدم
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ROMANTIC HEARTBEAT LOVE PING ALERT MODAL --- */}
      <AnimatePresence>
        {activeLovePingAlert && (
          <div
            className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-sm flex items-center justify-center p-4 z-[99] text-center"
            dir="rtl"
            onClick={() => {
              handleDismissAlert(activeLovePingAlert.id);
              setActiveLovePingAlert(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-sm p-6 sm:p-7 relative overflow-hidden text-center text-[#1C1C1C]"
            >
              {/* Beating Heart Icon with Pulsing Halo */}
              <div className="relative w-24 h-24 mx-auto mb-3 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-[#F29B47]/35 animate-ping" />
                <div className="relative z-10 w-16 h-16 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                  <Heart className="w-9 h-9 fill-current animate-pulse text-[#F29B47] stroke-[#1C1C1C] stroke-[2]" />
                </div>
              </div>

              <span className="text-[11px] font-bold text-[#1C1C1C] bg-[#FFFF66] px-3 py-1 rounded-full border-[1.5px] border-[#1C1C1C] inline-block mb-2">
                💓 پالس تپش قلب و یادآوری آنی
              </span>

              <h3 className="text-base sm:text-lg font-black text-[#1C1C1C] mb-2 leading-relaxed">
                {activeLovePingAlert.senderName || "پارتنرت"} همین الان به یادته!
              </h3>

              <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-3.5 mb-5 text-center">
                <p className="text-xs sm:text-sm font-bold text-[#1C1C1C] leading-relaxed whitespace-pre-line">
                  «{activeLovePingAlert.message}»
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const id = activeLovePingAlert.id;
                    handleDismissAlert(id);
                    setActiveLovePingAlert(null);
                    handleSendLovePing("منم همین الان داشتم بهت فکر می‌کردم عزیزدلم! 💕");
                  }}
                  className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5"
                >
                  <Heart className="w-4 h-4 text-[#EBA2F8] fill-current" />
                  <span>منم همین الان به یادتم! 🥰</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDismissAlert(activeLovePingAlert.id);
                    setActiveLovePingAlert(null);
                  }}
                  className="w-full py-2.5 bg-white hover:bg-[#FFFFFF] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  متوجه شدم و بستن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PHASE 1: EMOTIONAL STATUS BOTTOM SHEET --- */}
      <EmotionalStatusSheet
        isOpen={showEmotionalStatusSheet}
        onClose={() => setShowEmotionalStatusSheet(false)}
        currentBattery={myBatteryLevel}
        currentStatus={myNeedStatus}
        onSave={handleSaveEmotionalStatus}
      />

      {/* --- PHASE 1: DATE ROULETTE MODAL --- */}
      <DateRouletteModal
        isOpen={showDateRoulette}
        onClose={() => setShowDateRoulette(false)}
        items={items.filter(i => !i.isCompleted)}
        onSelectWish={(wish) => {
          setActiveTab("wishlist");
        }}
      />

      {/* --- PHASE 2: DAILY INTIMACY ROUTINE MODAL --- */}
      <DailyQuestionModal
        isOpen={showDailyQuestionModal}
        onClose={() => setShowDailyQuestionModal(false)}
        userProfile={userProfile}
        partnerProfile={partnerProfile}
        onAnswerSubmitted={() => setDailyQuestionRefreshTrigger((prev) => prev + 1)}
      />

      {/* --- PHASE 2: PARTNER CHEAT-SHEET MODAL --- */}
      <PartnerCheatSheetModal
        isOpen={showPartnerCheatSheetModal}
        onClose={() => setShowPartnerCheatSheetModal(false)}
        userProfile={userProfile}
        partnerProfile={partnerProfile}
        onCheatSheetUpdated={(updated) => {
          if (onUpdateUserProfile) {
            onUpdateUserProfile({ ...userProfile, cheatSheet: updated });
          }
        }}
        onSendPoke={(msg) => handleSendPoke(msg)}
      />

      {/* --- PHASE 2: WHITE FLAG (PEACE SIGNAL) SENDER MODAL --- */}
      <WhiteFlagModal
        isOpen={showWhiteFlagModal}
        onClose={() => setShowWhiteFlagModal(false)}
        partnerName={partnerProfile?.displayName || "پارتنرت"}
        onSuccess={() => {
          triggerAlert(`پرچم سفید و پیام آشتی با موفقیت برای ${partnerProfile?.displayName || "پارتنرت"} ارسال شد 🕊️🤍`);
        }}
      />

      {/* --- PHASE 2: WHITE FLAG RECEIVED ALERT MODAL --- */}
      <WhiteFlagReceivedModal
        poke={activeWhiteFlagAlert}
        onClose={() => {
          if (activeWhiteFlagAlert) {
            handleDismissAlert(activeWhiteFlagAlert.id);
            setActiveWhiteFlagAlert(null);
          }
        }}
        onAccepted={() => {
          triggerAlert(`آتش‌بس و آشتی با موفقیت پذیرفته شد! 🫂💖`);
        }}
      />

      {/* --- PHASE 3: ANNIVERSARY & LOVE DAYS MODAL --- */}
      <AnniversaryModal
        isOpen={showAnniversaryModal}
        onClose={() => setShowAnniversaryModal(false)}
        relationshipStartDate={userProfile.coupleInfo?.relationshipStartDate}
        marriageDate={userProfile.coupleInfo?.marriageDate}
        onSaved={(relDate, marrDate) => {
          if (onUpdateUserProfile) {
            onUpdateUserProfile({
              ...userProfile,
              coupleInfo: {
                id: userProfile.coupleId || "",
                relationshipStartDate: relDate,
                marriageDate: marrDate,
                createdAt: userProfile.coupleInfo?.createdAt
              }
            });
          }
          triggerAlert("تاریخ‌های سالگرد با موفقیت ذخیره شدند! 💍✨");
        }}
      />

      {/* --- PARTNER HUB BOTTOM SHEET (ALL RELATIONSHIP ACTIONS IN ONE CALM PLACE) --- */}
      <PartnerHubSheet
        isOpen={showPartnerHub}
        onClose={() => setShowPartnerHub(false)}
        partnerProfile={partnerProfile}
        isPartnerOnline={isPartnerOnline}
        daysTogether={daysTogether}
        renderAvatar={renderAvatar}
        onSendLovePing={() => handleSendLovePing()}
        onOpenWhiteFlag={() => setShowWhiteFlagModal(true)}
        onOpenCheatSheet={() => setShowPartnerCheatSheetModal(true)}
        onOpenAnniversary={() => setShowAnniversaryModal(true)}
        onOpenDailyQuestion={() => setShowDailyQuestionModal(true)}
        onOpenDateRoulette={() => setShowDateRoulette(true)}
      />

      {/* ===== Lex FAB (gender colored) ===== */}
      <motion.button
        type="button"
        onClick={handleFabClick}
        whileTap={{ scale: 0.92 }}
        className={`fixed z-40 left-4 bottom-[calc(84px+env(safe-area-inset-bottom))] md:bottom-8 md:left-8 w-[60px] h-[60px] rounded-full ${theme.fabBg} text-[#1C1C1C] flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)] cursor-pointer transition-colors`}
        title={fabLabel}
        aria-label={fabLabel}
      >
        <Plus className="w-7 h-7 stroke-[1.8]" />
      </motion.button>

      {/* ===== Lex bottom tab bar: flat, light, outline icons, filled active ===== */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#F5F3EF] border-t border-[#1C1C1C]/15 pb-[env(safe-area-inset-bottom)]"
        dir="rtl"
        aria-label="ناوبری اصلی"
      >
        <div className="max-w-md mx-auto h-[68px] grid grid-cols-5">
          {NAV_ITEMS.map(({ id, label, Icon, isActive }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setActiveTab(id);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-1 cursor-pointer"
            >
              <Icon
                className={`w-[27px] h-[27px] ${isActive ? "stroke-[1.7]" : "stroke-[1.5]"} text-[#1C1C1C]`}
                fill={isActive ? theme.primaryColor : "none"}
              />
              <span className={`text-[11px] leading-none ${isActive ? "font-bold text-[#1C1C1C]" : "text-[#6E6B66]"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
