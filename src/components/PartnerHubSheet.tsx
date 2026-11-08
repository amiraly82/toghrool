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
            bg: "bg-[#FFFF66]",
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
            bg: "bg-[#5ED46A]",
            title: "گردونه شانس دیت",
            subtitle: "انتخاب تصادفی یک رویا یا برنامه دونفره",
            onClick: () => run(onOpenDateRoulette)
          }
        ]
      : []),
    {
      key: "flag",
      Icon: Flag,
      bg: "bg-[#6BCFEA]",
      title: "پرچم سفید",
      subtitle: "پیشنهاد آشتی، بدون شکستن غرور",
      onClick: () => run(onOpenWhiteFlag)
    },
    {
      key: "cheat",
      Icon: FileText,
      bg: "bg-[#A9ABEE]",
      title: "تقلب‌نامه شناخت",
      subtitle: "سایزها، نوشیدنی و گل محبوب",
      onClick: () => run(onOpenCheatSheet)
    },
    {
      key: "anniv",
      Icon: CalendarHeart,
      bg: "bg-[#F29B47]",
      title: "روزشمار و سالگردها",
      subtitle: daysTogether ? `${toPersianDigits(daysTogether)} روز با هم` : "ثبت تاریخ آشنایی",
      onClick: () => run(onOpenAnniversary)
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#1C1C1C]/60 flex items-end sm:items-center justify-center sm:p-4 z-[90]"
          dir="rtl"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F6F4F0] border-t-[1.5px] sm:border-[1.5px] border-[#1C1C1C] sm:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] w-full max-w-md max-h-[88vh] overflow-y-auto no-scrollbar rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 text-right"
          >
            <div className="w-12 h-1.5 bg-[#1C1C1C]/30 rounded-full mx-auto mb-4 sm:hidden" />

            {/* Partner identity */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative rounded-full border-[1.5px] border-[#1C1C1C]">
                  {renderAvatar(partnerProfile, "💖", "w-11 h-11")}
                  <span
                    className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-[1.5px] border-white ${
                      isPartnerOnline ? "bg-[#5ED46A]" : "bg-[#C9C5BD]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#1C1C1C]">{partnerName}</h3>
                  <p className="text-[11px] text-[#6E6B66] font-medium mt-0.5">
                    {isPartnerOnline ? "همین الان آنلاین است ✦" : "آفلاین"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white hover:bg-[#F5F3EF] border border-[#1C1C1C]/20 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-4 h-4 stroke-[1.9]" />
              </button>
            </div>

            {/* Partner mood — Lex Tip Style Card */}
            <div className="bg-[#FFEAF3] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3.5 mb-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-full bg-white border border-[#1C1C1C]/20 flex items-center justify-center text-xl shrink-0">
                {need.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-bold text-[#1C1C1C] truncate">{need.label}</p>
                <p className="text-[11px] text-[#6E6B66] font-medium mt-0.5 leading-relaxed line-clamp-2">{need.description}</p>
              </div>
              <div className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-[#1C1C1C]/20 text-[#1C1C1C] shrink-0">
                {toPersianDigits(battery)}٪
              </div>
            </div>

            {/* Primary emotional action */}
            <button
              type="button"
              onClick={() => run(onSendLovePing)}
              className="w-full py-3 mb-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Heart className="w-4 h-4 text-[#FF7EB6] fill-current" />
              <span>ارسال تپش قلب «الان به یادتم»</span>
            </button>

            {/* Secondary actions in crisp White Card */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] divide-y divide-[#1C1C1C]/10 overflow-hidden">
              {secondaryActions.map((a) => {
                const RowIcon = a.Icon;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={a.onClick}
                    className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-[#F5F3EF] transition-colors cursor-pointer text-right"
                  >
                    <span className={`w-9 h-9 rounded-full ${a.bg} border border-[#1C1C1C]/20 flex items-center justify-center text-[#1C1C1C] shrink-0`}>
                      <RowIcon className="w-4 h-4 stroke-[1.9]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-[#1C1C1C] block truncate">{a.title}</span>
                      <span className="text-[11px] text-[#6E6B66] font-medium block truncate mt-0.5">{a.subtitle}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#6E6B66] shrink-0 stroke-[1.9]" />
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
