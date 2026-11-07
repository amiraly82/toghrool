import React, { useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Sparkles, X, RotateCw, Check, Shuffle } from "lucide-react";
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

  const eligibleItems = items.filter((item) => {
    if (item.isCompleted) return false;
    if (budgetFilter === 'all') return true;
    return item.budget === budgetFilter;
  });

  const handleSpin = () => {
    if (isSpinning || eligibleItems.length === 0) return;

    setIsSpinning(true);
    setSelectedItem(null);

    if (navigator.vibrate) {
      navigator.vibrate([30, 40, 30, 40]);
    }

    let speed = 60;
    let counter = 0;
    const totalSteps = 22 + Math.floor(Math.random() * 8);

    const spinInterval = () => {
      setDisplayIndex((prev) => (prev + 1) % eligibleItems.length);
      counter++;

      if (counter < totalSteps) {
        speed += 12;
        setTimeout(spinInterval, speed);
      } else {
        const randomIndex = Math.floor(Math.random() * eligibleItems.length);
        const winner = eligibleItems[randomIndex];
        setDisplayIndex(randomIndex);
        setSelectedItem(winner);
        setIsSpinning(false);

        if (navigator.vibrate) {
          navigator.vibrate([80, 50, 100]);
        }

        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FBC2F3", "#F5F97A", "#FF8B6A", "#B5F285"]
        });
      }
    };

    setTimeout(spinInterval, speed);
  };

  const getBudgetBadge = (budget?: string) => {
    switch (budget) {
      case 'economy':
        return { label: 'اقتصادی و کم‌خرج', bg: 'bg-[#B5F285]', text: 'text-[#141414]', emoji: '🟢' };
      case 'luxury':
        return { label: 'لاکچری و خاص', bg: 'bg-[#FBC2F3]', text: 'text-[#141414]', emoji: '🟣' };
      case 'medium':
      default:
        return { label: 'میان‌رده و معمول', bg: 'bg-[#F5F97A]', text: 'text-[#141414]', emoji: '🟡' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#141414]/65 backdrop-blur-[3px] flex items-center justify-center p-4 z-[90]" dir="rtl" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAD074] border-2 border-[#141414] rounded-[34px] w-full max-w-md p-6 relative text-right shadow-[0_6px_0_#141414] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#141414]/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full bg-[#B5F285] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414]">
              <Sparkles className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#141414]">گردونه شانس دیت دونفره 🎰</h3>
              <p className="text-[11px] text-[#141414]/80 font-extrabold">نمی‌دونید کجا برید؟ انتخاب رو بسپارید به شانس!</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] transition-transform active:translate-y-0.5 cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Budget Filter Buttons */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-black text-[#141414] block">فیلتر بودجه دیت:</label>
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-black">
            {[
              { id: 'all', label: 'همه' },
              { id: 'economy', label: '🟢 اقتصادی' },
              { id: 'medium', label: '🟡 میان‌رده' },
              { id: 'luxury', label: '🟣 لاکچری' }
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBudgetFilter(b.id as any)}
                className={`py-2 rounded-full border-2 border-[#141414] transition-all cursor-pointer ${
                  budgetFilter === b.id
                    ? 'bg-[#B5F285] text-[#141414] shadow-[0_2px_0_#141414]'
                    : 'bg-white text-[#141414]'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roulette Display Area */}
        {eligibleItems.length === 0 ? (
          <div className="py-10 px-4 text-center bg-white rounded-[26px] border-2 border-[#141414] shadow-[0_3px_0_#141414] my-4">
            <p className="text-sm font-black text-[#141414] mb-1">هیچ آرزویی با این فیلتر پیدا نشد! 🤷‍♂️</p>
            <p className="text-xs text-[#141414]/75 font-bold">ابتدا چند ایده کافه، تفریح یا دیت در ویش‌لیست ثبت کنید.</p>
          </div>
        ) : (
          <div className="relative my-4">
            <div className={`p-6 rounded-[28px] border-2 border-[#141414] shadow-[0_4px_0_#141414] text-center transition-all ${
              selectedItem
                ? 'bg-[#B5F285]'
                : isSpinning
                ? 'bg-[#FBC2F3]'
                : 'bg-white'
            }`}>
              {selectedItem ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white border-2 border-[#141414] text-[#141414]">
                    <span>🎉 برنده قرعه‌کشی امروز:</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-[#141414] leading-snug">
                    {selectedItem.title}
                  </h4>
                  {selectedItem.description && (
                    <p className="text-xs text-[#141414]/80 line-clamp-2 font-bold">
                      {selectedItem.description}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {selectedItem.budget && (
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border-2 border-[#141414] ${getBudgetBadge(selectedItem.budget).bg} ${getBudgetBadge(selectedItem.budget).text}`}>
                        {getBudgetBadge(selectedItem.budget).emoji} {getBudgetBadge(selectedItem.budget).label}
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : isSpinning ? (
                <div className="py-5 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-[#141414] mx-auto flex items-center justify-center animate-spin text-[#141414]">
                    <RotateCw className="w-6 h-6 stroke-[2.3]" />
                  </div>
                  <h4 className="text-base font-black text-[#141414] animate-bounce">
                    {eligibleItems[displayIndex]?.title || "در حال چرخش..."}
                  </h4>
                  <p className="text-xs text-[#141414] font-black">گردونه در حال چرخشه... 🎲</p>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] mx-auto flex items-center justify-center text-[#141414]">
                    <Shuffle className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h4 className="text-sm font-black text-[#141414]">
                    {toPersianDigits(eligibleItems.length)} ایده آماده برای دیت دونفره
                  </h4>
                  <p className="text-xs text-[#141414]/75 font-bold">روی دکمه زیر بزنید تا گردونه بچرخه!</p>
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
                className="flex-1 py-3 px-4 bg-white hover:bg-[#F5F97A] text-[#141414] border-2 border-[#141414] shadow-[0_3px_0_#141414] font-black text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 stroke-[2.3]" />
                <span>دوباره بچرخون</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectWish) onSelectWish(selectedItem);
                  onClose();
                }}
                className="flex-[1.5] py-3 px-4 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] font-black text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[2.5] text-[#B5F285]" />
                <span>عالیه، برنامه‌ش رو بریزیم! 💖</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSpinning || eligibleItems.length === 0}
              onClick={handleSpin}
              className="w-full py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-[#F5F97A] stroke-[2.3]" />
              <span>{isSpinning ? "در حال چرخش گردونه..." : "بچرخون و انتخاب کن! 🎲"}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
