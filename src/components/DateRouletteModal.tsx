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
          colors: ["#EBA2F8", "#FFFF66", "#F29B47", "#5ED46A"]
        });
      }
    };

    setTimeout(spinInterval, speed);
  };

  const getBudgetBadge = (budget?: string) => {
    switch (budget) {
      case 'economy':
        return { label: 'اقتصادی و کم‌خرج', bg: 'bg-[#5ED46A]', text: 'text-[#1C1C1C]', emoji: '🟢' };
      case 'luxury':
        return { label: 'لاکچری و خاص', bg: 'bg-[#EBA2F8]', text: 'text-[#1C1C1C]', emoji: '🟣' };
      case 'medium':
      default:
        return { label: 'میان‌رده و معمول', bg: 'bg-[#FFFF66]', text: 'text-[#1C1C1C]', emoji: '🟡' };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-[3px] flex items-center justify-center p-4 z-[90]" dir="rtl" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] w-full max-w-md p-6 relative text-right shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-[1.5px] border-[#1C1C1C]/20 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
              <Sparkles className="w-5 h-5 stroke-[1.9]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">گردونه شانس دیت دونفره 🎰</h3>
              <p className="text-[11px] text-[#1C1C1C]/80 font-bold">نمی‌دونید کجا برید؟ انتخاب رو بسپارید به شانس!</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] transition-transform active:translate-y-0.5 cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[1.9]" />
          </button>
        </div>

        {/* Budget Filter Buttons */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-bold text-[#1C1C1C] block">فیلتر بودجه دیت:</label>
          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-bold">
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
                className={`py-2 rounded-full border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer ${
                  budgetFilter === b.id
                    ? 'bg-[#5ED46A] text-[#1C1C1C]'
                    : 'bg-white text-[#1C1C1C]'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Roulette Display Area */}
        {eligibleItems.length === 0 ? (
          <div className="py-10 px-4 text-center bg-white rounded-[24px] border-[1.5px] border-[#1C1C1C] my-4">
            <p className="text-sm font-bold text-[#1C1C1C] mb-1">هیچ آرزویی با این فیلتر پیدا نشد! 🤷‍♂️</p>
            <p className="text-xs text-[#1C1C1C]/75 font-medium">ابتدا چند ایده کافه، تفریح یا دیت در ویش‌لیست ثبت کنید.</p>
          </div>
        ) : (
          <div className="relative my-4">
            <div className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] text-center transition-all ${
              selectedItem
                ? 'bg-[#5ED46A]'
                : isSpinning
                ? 'bg-[#EBA2F8]'
                : 'bg-white'
            }`}>
              {selectedItem ? (
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C]">
                    <span>🎉 برنده قرعه‌کشی امروز:</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-[#1C1C1C] leading-snug">
                    {selectedItem.title}
                  </h4>
                  {selectedItem.description && (
                    <p className="text-xs text-[#1C1C1C]/80 line-clamp-2 font-medium">
                      {selectedItem.description}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {selectedItem.budget && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border-[1.5px] border-[#1C1C1C] ${getBudgetBadge(selectedItem.budget).bg} ${getBudgetBadge(selectedItem.budget).text}`}>
                        {getBudgetBadge(selectedItem.budget).emoji} {getBudgetBadge(selectedItem.budget).label}
                      </span>
                    )}
                  </div>
                </motion.div>
              ) : isSpinning ? (
                <div className="py-5 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white border-[1.5px] border-[#1C1C1C] mx-auto flex items-center justify-center animate-spin text-[#1C1C1C]">
                    <RotateCw className="w-6 h-6 stroke-[1.9]" />
                  </div>
                  <h4 className="text-base font-bold text-[#1C1C1C] animate-bounce">
                    {eligibleItems[displayIndex]?.title || "در حال چرخش..."}
                  </h4>
                  <p className="text-xs text-[#1C1C1C] font-bold">گردونه در حال چرخشه... 🎲</p>
                </div>
              ) : (
                <div className="py-6 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] mx-auto flex items-center justify-center text-[#1C1C1C]">
                    <Shuffle className="w-6 h-6 stroke-[1.9]" />
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1C1C]">
                    {toPersianDigits(eligibleItems.length)} ایده آماده برای دیت دونفره
                  </h4>
                  <p className="text-xs text-[#1C1C1C]/75 font-medium">روی دکمه زیر بزنید تا گردونه بچرخه!</p>
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
                className="flex-1 py-3 px-4 bg-white hover:bg-[#FFFF66] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5 stroke-[1.9]" />
                <span>دوباره بچرخون</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onSelectWish) onSelectWish(selectedItem);
                  onClose();
                }}
                className="flex-[1.5] py-3 px-4 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[1.9] text-[#5ED46A]" />
                <span>عالیه، برنامه‌ش رو بریزیم! 💖</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSpinning || eligibleItems.length === 0}
              onClick={handleSpin}
              className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-[#FFFF66] stroke-[1.9]" />
              <span>{isSpinning ? "در حال چرخش گردونه..." : "بچرخون و انتخاب کن! 🎲"}</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
