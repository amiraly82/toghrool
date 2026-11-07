import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Sparkles, ChevronLeft, Dices, Flag, FileText, CalendarHeart } from "lucide-react";
import { UserProfile } from "../types";
import { getNeedStatusOption } from "../utils/emotionalStatus";
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

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  const secondaryActions = [
    ...(onOpenDailyQuestion
      ? [
          {
            key: "daily_q",
            Icon: Sparkles,
            bg: "bg-[#F5F97A]",
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
            Icon: Dices,
            bg: "bg-[#B5F285]",
            title: "گردونه شانس دیت",
            subtitle: "انتخاب تصادفی یک رویا یا برنامه دونفره",
            onClick: () => run(onOpenDateRoulette)
          }
        ]
      : []),
    {
      key: "flag",
      Icon: Flag,
      bg: "bg-[#7FD1F7]",
      title: "پرچم سفید",
      subtitle: "پیشنهاد آشتی، بدون شکستن غرور",
      onClick: () => run(onOpenWhiteFlag)
    },
    {
      key: "cheat",
      Icon: FileText,
      bg: "bg-[#A594F9]",
      title: "تقلب‌نامه شناخت",
      subtitle: "سایزها، نوشیدنی و گل محبوب",
      onClick: () => run(onOpenCheatSheet)
    },
    {
      key: "anniv",
      Icon: CalendarHeart,
      bg: "bg-[#FF8B6A]",
      title: "روزشمار و سالگردها",
      subtitle: daysTogether ? `${toPersianDigits(daysTogether)} روز با هم` : "ثبت تاریخ آشنایی",
      onClick: () => run(onOpenAnniversary)
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#141414]/60 flex items-end sm:items-center justify-center sm:p-4 z-[90]"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FAD074] border-t-3 sm:border-2 border-x-2 border-[#141414] sm:shadow-[0_6px_0_#141414] w-full max-w-md max-h-[88vh] overflow-y-auto no-scrollbar rounded-t-[34px] sm:rounded-[34px] p-5 sm:p-6 text-right"
          >
            <div className="w-12 h-1.5 bg-[#141414] rounded-full mx-auto mb-4 sm:hidden" />

            {/* Partner identity */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative rounded-full border-2 border-[#141414] shadow-[0_2px_0_#141414]">
                  {renderAvatar(partnerProfile, "💖", "w-11 h-11")}
                  <span
                    className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#141414] ${
                      isPartnerOnline ? "bg-[#B5F285]" : "bg-white"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#141414]">{partnerName}</h3>
                  <p className="text-[11px] text-[#141414]/80 font-bold mt-0.5">
                    {isPartnerOnline ? "همین الان آنلاین است ✦" : "آفلاین"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] cursor-pointer active:translate-y-0.5"
                aria-label="بستن"
              >
                <X className="w-4.5 h-4.5 stroke-[2.4]" />
              </button>
            </div>

            {/* Partner mood — Neobrutalist Pink Pop Card */}
            <div className="bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-[24px] p-3.5 mb-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-white border-2 border-[#141414] flex items-center justify-center text-xl shrink-0">
                {need.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-black text-[#141414] truncate">{need.label}</p>
                <p className="text-[11px] text-[#141414]/80 font-bold mt-0.5 leading-relaxed line-clamp-2">{need.description}</p>
              </div>
              <div className="text-xs font-black px-3 py-1 rounded-full bg-[#B5F285] border-2 border-[#141414] text-[#141414] shrink-0">
                {toPersianDigits(battery)}٪
              </div>
            </div>

            {/* Primary emotional action (Screen 3 Dark Pill Style) */}
            <button
              type="button"
              onClick={() => run(onSendLovePing)}
              className="w-full py-3.5 mb-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer active:translate-y-0.5"
            >
              <Heart className="w-4 h-4 text-[#FBC2F3] fill-current" />
              <span>ارسال تپش قلب «الان به یادتم»</span>
            </button>

            {/* Secondary actions in crisp White Neobrutalist Card */}
            <div className="bg-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-[26px] divide-y-2 divide-[#141414] overflow-hidden">
              {secondaryActions.map((a) => {
                const RowIcon = a.Icon;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={a.onClick}
                    className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-[#FFF8E7] transition-colors cursor-pointer text-right"
                  >
                    <span className={`w-10 h-10 rounded-full ${a.bg} border-2 border-[#141414] flex items-center justify-center text-[#141414] shrink-0`}>
                      <RowIcon className="w-4.5 h-4.5 stroke-[2.2]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs sm:text-sm font-black text-[#141414] block truncate">{a.title}</span>
                      <span className="text-[11px] text-[#141414]/70 font-bold block truncate mt-0.5">{a.subtitle}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#141414] shrink-0 stroke-[2.4]" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
