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
      className="bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_4px_0_#141414] rounded-[28px] p-4 sm:p-5 text-right relative overflow-hidden text-[#141414]"
      dir="rtl"
    >
      <div className="relative z-10 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] text-[#141414] flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-[#141414]">کوپایلوت همدلی طغرل</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white border-2 border-[#141414] text-[#141414] whitespace-nowrap">
                  {phaseTitle}
                </span>
              </div>
              <h3 className="text-sm font-black text-[#141414] mt-0.5 truncate">
                هوای {partnerName} رو داشته باش! {isPMS ? "🌙" : "🌸"}
              </h3>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="بستن یادآور همدلی"
              className="w-8 h-8 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] text-[#141414] flex items-center justify-center text-xs font-black shrink-0 cursor-pointer transition-transform active:translate-y-0.5"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-xs text-[#141414]/85 leading-relaxed font-bold">
          {partnerTip ||
            (isPMS
              ? "تغییرات طبیعی هورمونی در روزهای قبل از قاعدگی ممکنه باعث افت انرژی، خستگی یا حساسیت بشه. بهترین هدیه، صبر و گوش دادن بدون قضاوت است."
              : "در روزهای پریود، آرامش، استراحت، نوشیدنی گرم و مراقبت بدون بحث به پارتنرتان حس امنیت و حال خوب می‌دهد.")}
        </p>

        {suggestedWish ? (
          <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[20px] p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#B5F285] border-2 border-[#141414] flex items-center justify-center text-[#141414] shrink-0">
                <Gift className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold text-[#141414]/75 block">پیشنهاد سورپرایز از ویش‌لیست او:</span>
                <p className="text-xs font-black text-[#141414] truncate">{suggestedWish.title}</p>
              </div>
            </div>
            {onViewWishlist && (
              <button
                type="button"
                onClick={onViewWishlist}
                className="px-3.5 py-1.5 rounded-full bg-[#242424] text-white border-2 border-[#141414] text-[11px] font-black shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>مشاهده</span>
                <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-black text-[#141414]">
            <span className="bg-white border-2 border-[#141414] px-3 py-1 rounded-full">☕ دم کردن دمنوش بابونه</span>
            <span className="bg-white border-2 border-[#141414] px-3 py-1 rounded-full">🍫 خوراکی مورد علاقه</span>
            <span className="bg-white border-2 border-[#141414] px-3 py-1 rounded-full">🫂 آغوش گرم و بدون توقع</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
