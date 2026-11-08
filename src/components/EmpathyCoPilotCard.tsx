import React from "react";
import { motion } from "motion/react";
import { Moon, Gift, ChevronLeft } from "lucide-react";
import { WishlistItem } from "../types";

interface EmpathyCoPilotCardProps {
  phase: string; // 'pms' | 'period'
  phaseTitle: string;
  partnerTip?: string;
  partnerName: string;
  partnerWishlistItems?: WishlistItem[];
  onOpenWishlistItem?: (item: WishlistItem) => void;
  onViewWishlist?: () => void;
  onDismiss?: () => void;
}

export default function EmpathyCoPilotCard({
  phase,
  phaseTitle,
  partnerTip,
  partnerName,
  partnerWishlistItems = [],
  onViewWishlist,
  onDismiss
}: EmpathyCoPilotCardProps) {
  const suggestedWish =
    partnerWishlistItems.find(
      (item) => !item.isCompleted && (item.category === "place" || item.category === "buy" || item.category === "movie")
    ) || partnerWishlistItems.find((item) => !item.isCompleted);

  const isPMS = phase === "pms";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-4 sm:p-5 text-right relative overflow-hidden text-[#1C1C1C]"
      dir="rtl"
    >
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 stroke-[1.9]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-bold text-[#1C1C1C]">کوپایلوت همدلی طغرل</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] whitespace-nowrap">
                  {phaseTitle}
                </span>
              </div>
              <h3 className="text-sm font-black text-[#1C1C1C] mt-0.5 truncate">
                هوای {partnerName} رو داشته باش! {isPMS ? "🌙" : "🌸"}
              </h3>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="بستن یادآور همدلی"
              className="w-8 h-8 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer transition-transform active:translate-y-0.5"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-xs text-[#1C1C1C]/85 leading-relaxed font-medium">
          {partnerTip ||
            (isPMS
              ? "تغییرات طبیعی هورمونی در روزهای قبل از قاعدگی ممکنه باعث افت انرژی، خستگی یا حساسیت بشه. بهترین هدیه، صبر و گوش دادن بدون قضاوت است."
              : "در روزهای پریود، آرامش، استراحت، نوشیدنی گرم و مراقبت بدون بحث به پارتنرتان حس امنیت و حال خوب می‌دهد.")}
        </p>

        {suggestedWish ? (
          <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                <Gift className="w-4 h-4 stroke-[1.9]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#1C1C1C]/75 block">پیشنهاد سورپرایز از ویش‌لیست او:</span>
                <p className="text-xs font-bold text-[#1C1C1C] truncate">{suggestedWish.title}</p>
              </div>
            </div>
            {onViewWishlist && (
              <button
                type="button"
                onClick={onViewWishlist}
                className="px-3.5 py-1.5 rounded-full bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>مشاهده</span>
                <ChevronLeft className="w-3.5 h-3.5 stroke-[1.9]" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-[#1C1C1C]">
            <span className="bg-white border-[1.5px] border-[#1C1C1C] px-3 py-1 rounded-full">☕ دم کردن دمنوش بابونه</span>
            <span className="bg-white border-[1.5px] border-[#1C1C1C] px-3 py-1 rounded-full">🍫 خوراکی مورد علاقه</span>
            <span className="bg-white border-[1.5px] border-[#1C1C1C] px-3 py-1 rounded-full">🫂 آغوش گرم و بدون توقع</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
