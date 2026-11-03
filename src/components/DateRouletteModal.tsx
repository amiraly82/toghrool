import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Sparkles, 
  X, 
  RotateCw, 
  Heart, 
  MapPin, 
  Film, 
  Coffee, 
  Compass, 
  ShoppingBag, 
  Check, 
  Shuffle,
  ChevronLeft
} from "lucide-react";
import { WishlistItem } from "../types";
import { toPersianDigits } from "../utils/jalali";

interface DateRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: WishlistItem[];
  onSelectWish?: (item: WishlistItem) => void;
}

export default function DateRouletteModal({
  isOpen,
  onClose,
  items,
  onSelectWish
}: DateRouletteModalProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'economy' | 'medium' | 'luxury'>('all');

  // Filter available active items
  const eligibleItems = items.filter((item) => {
    if (item.isCompleted) return false;
    if (budgetFilter === 'all') return true;
    return item.budget === budgetFilter;
  });

  const handleSpin = () => {
    if (isSpinning || eligibleItems.length === 0) return;

    setIsSpinning(true);
    setSelectedItem(null);

    // Haptic feedback if supported
    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 30, 40]);
    }

    let speed = 60; // ms
    let counter = 0;
    const totalSteps = 22 + Math.floor(Math.random() * 8);

    const spinInterval = () => {
      setDisplayIndex((prev) => (prev + 1) % eligibleItems.length);
      counter++;

      if (counter < totalSteps) {
        speed += 12; // decelerate
        setTimeout(spinInterval, speed);
      } else {
        // Final stop
        const randomIndex = Math.floor(Math.random() * eligibleItems.length);
        const winner = eligibleItems[randomIndex];
        setDisplayIndex(randomIndex);
        setSelectedItem(winner);
        setIsSpinning(false);

        // Haptic win feedback
        if (navigator.vibrate) {
          navigator.vibrate([80, 50, 100]);
        }

        // Confetti Celebration
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F6C3E5", "#F6DC6B", "#EC407A", "#A7B86C"]
        });
      }
    };

    setTimeout(spinInterval, speed);
  };

  const getBudgetBadge = (budget?: string) => {
    switch (budget) {
      case 'economy':
        return { label: 'اقتصادی و کم‌خرج', bg: 'bg-[#DCE6B5]', text: 'text-[#1B1B1A]', emoji: '🟢' };
      case 'luxury':
        return { label: 'لاکچری و خاص', bg: 'bg-[#F6C3E5]', text: 'text-[#1B1B1A]', emoji: '🟣' };
      case 'medium':
      default:
        return { label: 'میان‌رده و معمول', bg: 'bg-[#FAF6EC]', text: 'text-[#1B1B1A]', emoji: '🟡' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1B1B1A]/60 backdrop-blur-[3px] flex items-center justify-center p-4 z-[90]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-md p-6 sm:p-7 relative text-right shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D4] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F6DC6B] flex items-center justify-center text-[#1B1B1A] shadow-xs">
              <Sparkles className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1B1B1A]">گردونه شانس دیت دونفره 🎰</h3>
              <p className="text-[11px] text-[#78746B] font-medium">نمی‌دونید کجا برید؟ انتخاب رو بسپارید به شانس!</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A] transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Budget Filter Buttons */}
        <div className="space-y-1.5 mb-5">
          <label className="text-[11px] font-bold text-[#78746B] block">فیلتر بودجه دیت:</label>
          <div className="grid grid-cols-4 gap-1.5 bg-[#EFECE2] p-1 rounded-2xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setBudgetFilter('all')}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                budgetFilter === 'all' ? 'bg-[#1B1B1A] text-[#FAF6EC] shadow-xs' : 'text-[#78746B] hover:text-[#1B1B1A]'
              }`}
            >
              همه
            </button>
            <button
              type="button"
              onClick={() => setBudgetFilter('economy')}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                budgetFilter === 'economy' ? 'bg-[#1B1B1A] text-[#FAF6EC] shadow-xs' : 'text-[#78746B] hover:text-[#1B1B1A]'
              }`}
            >
              🟢 اقتصادی
            </button>
            <button
              type="button"
              onClick={() => setBudgetFilter('medium')}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                budgetFilter === 'medium' ? 'bg-[#1B1B1A] text-[#FAF6EC] shadow-xs' : 'text-[#78746B] hover:text-[#1B1B1A]'
              }`}
            >
              🟡 میان‌رده
            </button>
            <button
              type="button"
              onClick={() => setBudgetFilter('luxury')}
              className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                budgetFilter === 'luxury' ? 'bg-[#1B1B1A] text-[#FAF6EC] shadow-xs' : 'text-[#78746B] hover:text-[#1B1B1A]'
              }`}
            >
              🟣 لاکچری
            </button>
          </div>
        </div>

        {/* Roulette Display Area */}
        {eligibleItems.length === 0 ? (
          <div className="py-12 px-4 text-center bg-[#FFFDF8] rounded-[24px] border border-dashed border-[#C5BDAA] my-4">
            <p className="text-sm font-bold text-[#1B1B1A] mb-1">هیچ آرزویی با این فیلتر پیدا نشد! 🤷‍♂️</p>
            <p className="text-xs text-[#78746B]">ابتدا چند ایده کافه، تفریح یا دیت در ویش‌لیست ثبت کنید.</p>
          </div>
        ) : (
          <div className="relative my-4">
            {/* Spinning Slot Box */}
            <div className={`p-6 rounded-[26px] border-2 text-center transition-all ${
              selectedItem
                ? 'bg-[#FFFDF8] border-[#A7B86C] shadow-lg ring-4 ring-[#A7B86C]/15'
                : isSpinning
                ? 'bg-[#FFF0F7] border-[#EC407A] animate-pulse shadow-md'
                : 'bg-[#FFFDF8] border-[#E8E2D4]'
            }`}>
              {/* Animated Item View */}
              {selectedItem ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#A7B86C] text-[#FAF6EC] shadow-xs">
                    <span>🎉 برنده قرعه‌کشی امروز:</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-[#1B1B1A] leading-snug">
                    {selectedItem.title}
                  </h4>
                  {selectedItem.description && (
                    <p className="text-xs text-[#78746B] line-clamp-2 font-medium">
                      {selectedItem.description}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {selectedItem.budget && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#E8E2D4] ${getBudgetBadge(selectedItem.budget).bg} ${getBudgetBadge(selectedItem.budget).text}`}>
                        {getBudgetBadge(selectedItem.budget).emoji} {getBudgetBadge(selectedItem.budget).label}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EFECE2] text-[#78746B]">
                      دسته: {selectedItem.category}
                    </span>
                  </div>
                </motion.div>
              ) : isSpinning ? (
                <div className="py-5 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F6C3E5] mx-auto flex items-center justify-center animate-spin text-[#1B1B1A]">
                    <RotateCw className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h4 className="text-base font-black text-[#1B1B1A] animate-bounce">
                    {eligibleItems[displayIndex]?.title || "در حال چرخش..."}
                  </h4>
                  <p className="text-xs text-[#EC407A] font-bold">گردونه در حال چرخشه... 🎲</p>
                </div>
              ) : (
                <div className="py-7 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#FAF6EC] border border-[#E8E2D4] mx-auto flex items-center justify-center text-[#EC407A]">
                    <Shuffle className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1B1B1A]">
                    {toPersianDigits(eligibleItems.length)} ایده آماده برای دیت دونفره
                  </h4>
                  <p className="text-xs text-[#78746B]">روی دکمه زیر بزنید تا گردونه بچرخه!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {selectedItem ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSpin}
                className="flex-1 py-3 px-4 bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] font-bold text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 stroke-[2]" />
                <span>دوباره بچرخون</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectWish) onSelectWish(selectedItem);
                  onClose();
                }}
                className="flex-[1.5] py-3 px-4 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] font-black text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4 stroke-[2] text-[#A7B86C]" />
                <span>عالیه، برنامه‌ش رو بریزیم! 💖</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSpinning || eligibleItems.length === 0}
              onClick={handleSpin}
              className="w-full py-3.5 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-[#F6DC6B] stroke-[2]" />
              <span>{isSpinning ? "در حال چرخش گردونه..." : "بچرخون و انتخاب کن! 🎲"}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
