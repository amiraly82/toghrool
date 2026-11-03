import React from "react";
import { motion } from "motion/react";
import { Moon, Heart, Sparkles, Gift, Coffee, ExternalLink, ChevronLeft } from "lucide-react";
import { WishlistItem } from "../types";

interface EmpathyCoPilotCardProps {
  phase: string; // 'pms' | 'period'
  phaseTitle: string;
  partnerTip?: string;
  partnerName: string;
  partnerWishlistItems?: WishlistItem[];
  onOpenWishlistItem?: (item: WishlistItem) => void;
  onViewWishlist?: () => void;
}

export default function EmpathyCoPilotCard({
  phase,
  phaseTitle,
  partnerTip,
  partnerName,
  partnerWishlistItems = [],
  onOpenWishlistItem,
  onViewWishlist
}: EmpathyCoPilotCardProps) {
  // Find wishlist items that make great comfort gifts / dates (food, cafe, comfort items)
  const suggestedWish = partnerWishlistItems.find(
    (item) => !item.isCompleted && (item.category === 'place' || item.category === 'buy' || item.category === 'movie')
  ) || partnerWishlistItems.find((item) => !item.isCompleted);

  const isPMS = phase === 'pms';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FFF0F7] via-[#FAF6EC] to-[#FAF6EC] border border-[#F8BBD0] rounded-[28px] p-5 sm:p-6 text-right relative overflow-hidden shadow-xs mb-6"
      dir="rtl"
    >
      {/* Decorative Moon Glow */}
      <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#F6C3E5]/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#EC407A] text-white flex items-center justify-center shadow-xs">
              <Moon className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#EC407A] block">کوپایلوت همدلی طغرل</span>
              <h3 className="text-sm sm:text-base font-black text-[#1B1B1A]">
                هوای {partnerName} رو داشته باش! {isPMS ? "🌙" : "🌸"}
              </h3>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EC407A]/15 text-[#D81B60]">
            {phaseTitle}
          </span>
        </div>

        <p className="text-xs text-[#78746B] leading-relaxed font-medium">
          {partnerTip || (isPMS 
            ? "تغییرات طبیعی هورمونی در روزهای قبل از قاعدگی ممکنه باعث افت انرژی، خستگی یا حساسیت بشه. بهترین هدیه، صبر و گوش دادن بدون قضاوت است."
            : "در روزهای پریود، آرامش، استراحت، نوشیدنی گرم و مراقبت بدون بحث به پارتنرتان حس امنیت و حال خوب می‌دهد.")}
        </p>

        {/* Actionable Empathy: Connected to Wishlist! */}
        {suggestedWish ? (
          <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#F6DC6B] flex items-center justify-center text-[#1B1B1A] shrink-0">
                <Gift className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#78746B] block">پیشنهاد سورپرایز از ویش‌لیست او:</span>
                <p className="text-xs font-black text-[#1B1B1A] truncate">{suggestedWish.title}</p>
              </div>
            </div>
            {onViewWishlist && (
              <button
                type="button"
                onClick={onViewWishlist}
                className="px-3 py-1.5 rounded-full bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>مشاهده</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-[#1B1B1A]">
            <span className="bg-[#FAF6EC] border border-[#E8E2D4] px-3 py-1 rounded-full">☕ دم کردن دمنوش بابونه</span>
            <span className="bg-[#FAF6EC] border border-[#E8E2D4] px-3 py-1 rounded-full">🍫 خوراکی یا هوسانه مورد علاقه</span>
            <span className="bg-[#FAF6EC] border border-[#E8E2D4] px-3 py-1 rounded-full">🫂 آغوش گرم و بدون توقع</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
