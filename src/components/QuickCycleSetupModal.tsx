import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Droplet, Calendar, Sparkles, Check, Heart } from "lucide-react";
import JalaliDatePicker from "./JalaliDatePicker";
import { toPersianDigits } from "../utils/jalali";

interface QuickCycleSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lastPeriodStartDate: string, cycleLength: number, periodLength: number) => void;
}

export const QuickCycleSetupModal: React.FC<QuickCycleSetupModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [cycleLength, setCycleLength] = useState<number>(28);
  const [periodLength, setPeriodLength] = useState<number>(6);

  if (!isOpen) return null;

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;
    onSave(startDate, cycleLength, periodLength);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#1B1B1A]/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 text-right"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFDF8] border-t sm:border border-[#E8E2D4] rounded-t-[32px] sm:rounded-[36px] w-full max-w-md shadow-2xl overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E8E2D4] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F6C3E5] to-[#F9C6B8] flex items-center justify-center text-[#1B1B1A] shadow-xs">
                <Droplet className="w-5 h-5 text-[#EC407A] fill-current" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1B1B1A]">راه‌اندازی چرخه سلامت بانوان 🩸✨</h3>
                <p className="text-[11px] text-[#78746B] font-medium">تنظیم سریع برای پیش‌بینی هوشمند و همراهی پارتنر</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EFECE2] hover:bg-[#E2DDD0] text-[#1B1B1A] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#78746B] leading-relaxed mb-4">
            برای فعال‌سازی چرخه بیولوژیک، پیش‌بینی روزهای تخمک‌گذاری، PMS و پیام‌های خودکار همراهی برای پارتنرتان، لطفاً ۳ سوال کوتاه زیر را مشخص کنید:
          </p>

          <form onSubmit={handleStart} className="space-y-4">
            {/* Last Period Start Date */}
            <div>
              <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#EC407A]" />
                <span>تاریخ شروع آخرین پریود</span>
              </label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ آخرین پریود..."
              />
            </div>

            {/* Cycle Length */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>طول معمول چرخه (فاصله دو پریود)</span>
                </label>
                <span className="text-xs font-black text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                  {toPersianDigits(cycleLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                {[25, 28, 30, 32].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCycleLength(d)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      cycleLength === d
                        ? "bg-[#1B1B1A] text-[#FAF6EC] border-[#1B1B1A]"
                        : "bg-[#FAF6EC] text-[#78746B] border-[#E8E2D4] hover:bg-[#EFECE2]"
                    }`}
                  >
                    {toPersianDigits(d)} روز
                  </button>
                ))}
              </div>
              <input
                type="range"
                min="20"
                max="45"
                value={cycleLength}
                onChange={(e) => setCycleLength(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[#EFECE2] rounded-lg appearance-none cursor-pointer accent-[#1B1B1A]"
              />
            </div>

            {/* Period Length */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-[#D94E4E]" />
                  <span>طول مدت خونریزی</span>
                </label>
                <span className="text-xs font-black text-[#D94E4E] bg-[#FFF0F0] px-2 py-0.5 rounded-full border border-[#FECACA]">
                  {toPersianDigits(periodLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[4, 5, 6, 7, 8].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPeriodLength(d)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      periodLength === d
                        ? "bg-[#1B1B1A] text-[#FAF6EC] border-[#1B1B1A]"
                        : "bg-[#FAF6EC] text-[#78746B] border-[#E8E2D4] hover:bg-[#EFECE2]"
                    }`}
                  >
                    {toPersianDigits(d)} روز
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={!startDate}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#1B1B1A] to-[#2F2E2C] hover:opacity-95 text-[#FAF6EC] rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                <Heart className="w-4 h-4 text-[#F6C3E5] fill-current" />
                <span>شروع و فعال‌سازی هوشمند 💖</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3.5 bg-[#FAF6EC] hover:bg-[#EFECE2] text-[#78746B] rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                بعداً
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default QuickCycleSetupModal;
