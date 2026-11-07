import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Sparkles, ChevronLeft } from "lucide-react";
import { UserProfile } from "../types";
import { getNeedStatusOption, getBatteryVisual } from "../utils/emotionalStatus";
import { toPersianDigits } from "../utils/jalali";

interface PartnerHubSheetProps {
  isOpen: boolean;
  onClose: () => void;
  partnerProfile: UserProfile | null;
  isPartnerOnline: boolean;
  daysTogether: number | null;
  renderAvatar: (profile: UserProfile | null, fallback: string, sizeClass: string) => React.ReactNode;
  onSendLovePing: () => void;
  onOpenWhiteFlag: () => void;
  onOpenCheatSheet: () => void;
  onOpenAnniversary: () => void;
  onOpenDailyQuestion?: () => void;
  onOpenDateRoulette?: () => void;
}

/**
 * Partner Hub — one calm place for every relationship action.
 * Replaces scattered header pills, the dove button and profile-buried cards.
 */
export default function PartnerHubSheet({
  isOpen,
  onClose,
  partnerProfile,
  isPartnerOnline,
  daysTogether,
  renderAvatar,
  onSendLovePing,
  onOpenWhiteFlag,
  onOpenCheatSheet,
  onOpenAnniversary,
  onOpenDailyQuestion,
  onOpenDateRoulette
}: PartnerHubSheetProps) {
  const partnerName = partnerProfile?.displayName || "پارتنر";
  const need = getNeedStatusOption(partnerProfile?.needStatus || "calm");
  const battery = partnerProfile?.batteryLevel ?? 80;
  const batteryVisual = getBatteryVisual(battery);

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  const secondaryActions = [
    ...(onOpenDailyQuestion
      ? [
          {
            key: "daily_q",
            emoji: "✨",
            title: "چالش ۳ دقیقه‌ای امروز",
            subtitle: "گفت‌وگوی روزانه برای نزدیکی و صمیمیت بیشتر",
            onClick: () => run(onOpenDailyQuestion)
          }
        ]
      : []),
    ...(onOpenDateRoulette
      ? [
          {
            key: "roulette",
            emoji: "🎰",
            title: "گردونه شانس دیت",
            subtitle: "انتخاب تصادفی یک رویا یا برنامه دونفره",
            onClick: () => run(onOpenDateRoulette)
          }
        ]
      : []),
    {
      key: "flag",
      emoji: "🕊️",
      title: "پرچم سفید",
      subtitle: "پیشنهاد آشتی، بدون شکستن غرور",
      onClick: () => run(onOpenWhiteFlag)
    },
    {
      key: "cheat",
      emoji: "📝",
      title: "تقلب‌نامه شناخت",
      subtitle: "سایزها، نوشیدنی و گل محبوب",
      onClick: () => run(onOpenCheatSheet)
    },
    {
      key: "anniv",
      emoji: "💍",
      title: "روزشمار و سالگردها",
      subtitle: daysTogether ? `${toPersianDigits(daysTogether)} روز با هم` : "ثبت تاریخ آشنایی",
      onClick: () => run(onOpenAnniversary)
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#1B1B1A]/50 flex items-end sm:items-center justify-center sm:p-4 z-[90]"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAF6EC] w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 text-right shadow-2xl"
          >
            <div className="w-10 h-1 bg-[#D5CEBC] rounded-full mx-auto mb-4 sm:hidden" />

            {/* Partner identity */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {renderAvatar(partnerProfile, "💖", "w-12 h-12")}
                  <span
                    className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#FAF6EC] ${
                      isPartnerOnline ? "bg-[#A7B86C]" : "bg-[#C8C3B6]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#1B1B1A]">{partnerName}</h3>
                  <p className="text-xs text-[#78746B] font-medium mt-0.5">
                    {isPartnerOnline ? "همین الان آنلاین است" : "آفلاین"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full hover:bg-[#EFECE2] flex items-center justify-center text-[#78746B] hover:text-[#1B1B1A] transition-colors cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Partner mood — read-only context */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-4 mb-4 flex items-center gap-3">
              <span className="text-2xl shrink-0">{need.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#1B1B1A] truncate">{need.label}</p>
                <p className="text-xs text-[#78746B] mt-0.5 leading-relaxed line-clamp-2">{need.description}</p>
              </div>
              <div
                className="text-xs font-black px-2.5 py-1 rounded-full shrink-0"
                style={{ color: batteryVisual.color, backgroundColor: `${batteryVisual.color}1A` }}
              >
                {toPersianDigits(battery)}٪
              </div>
            </div>

            {/* Primary emotional action */}
            <button
              type="button"
              onClick={() => run(onSendLovePing)}
              className="w-full py-3.5 mb-3 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.99]"
            >
              <Heart className="w-4 h-4 text-[#F6C3E5] fill-current" />
              <span>الان به یادتم</span>
            </button>

            {/* Secondary actions as a calm list */}
            <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl divide-y divide-[#EFECE2] overflow-hidden">
              {secondaryActions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={a.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAF6EC] transition-colors cursor-pointer text-right"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#EFECE2] flex items-center justify-center text-base shrink-0">
                    {a.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-[#1B1B1A]">{a.title}</span>
                    <span className="block text-xs text-[#78746B] mt-0.5 truncate">{a.subtitle}</span>
                  </span>
                  <ChevronLeft className="w-4 h-4 text-[#A6A297] shrink-0" />
                </button>
              ))}
            </div>

            <p className="text-[11px] text-[#9E9A8F] text-center mt-4 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>همه چیزهایی که به {partnerName} مربوط است، یک‌جا</span>
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
