import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Droplet, Calendar, Sparkles, Heart } from "lucide-react";
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
        className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 text-right"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#5ED46A] border-t-[1.5px] sm:border-[1.5px] border-[#1C1C1C] rounded-t-[28px] sm:rounded-[28px] w-full max-w-md shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b-[1.5px] border-[#1C1C1C]/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                <Droplet className="w-5 h-5 text-[#1C1C1C] fill-current stroke-[1.9]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1C1C1C]">راه‌اندازی چرخه سلامت بانوان 🩸✨</h3>
                <p className="text-[11px] text-[#1C1C1C]/80 font-bold">تنظیم سریع برای پیش‌بینی هوشمند و همراهی پارتنر</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.9]" />
            </button>
          </div>

          <p className="text-xs text-[#1C1C1C]/85 font-medium leading-relaxed mb-4">
            برای فعال‌سازی چرخه بیولوژیک، پیش‌بینی روزهای تخمک‌گذاری، PMS و پیام‌های خودکار همراهی برای پارتنرتان، لطفاً ۳ سوال کوتاه زیر را مشخص کنید:
          </p>

          <form onSubmit={handleStart} className="space-y-4">
            {/* Last Period Start Date */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] p-3.5">
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                <span>تاریخ شروع آخرین پریود</span>
              </label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ آخرین پریود..."
              />
            </div>

            {/* Cycle Length */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                  <span>طول معمول چرخه (فاصله دو پریود)</span>
                </label>
                <span className="text-xs font-bold text-[#1C1C1C] bg-[#5ED46A] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#1C1C1C]">
                  {toPersianDigits(cycleLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2.5">
                {[25, 28, 30, 32].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCycleLength(d)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-[1.5px] border-[#1C1C1C] ${
                      cycleLength === d
                        ? "bg-[#1C1C1C] text-white"
                        : "bg-white text-[#1C1C1C] hover:bg-[#FFFF66]"
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
                className="w-full h-2.5 bg-[#FFFF66] border border-[#1C1C1C] rounded-full appearance-none cursor-pointer accent-[#1C1C1C]"
              />
            </div>

            {/* Period Length */}
            <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                  <span>طول مدت خونریزی</span>
                </label>
                <span className="text-xs font-bold text-[#1C1C1C] bg-[#F29B47] px-2.5 py-0.5 rounded-full border-[1.5px] border-[#1C1C1C]">
                  {toPersianDigits(periodLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[4, 5, 6, 7, 8].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPeriodLength(d)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-[1.5px] border-[#1C1C1C] ${
                      periodLength === d
                        ? "bg-[#1C1C1C] text-white"
                        : "bg-white text-[#1C1C1C] hover:bg-[#FFFF66]"
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
                className="flex-1 py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
              >
                <Heart className="w-4 h-4 text-[#EBA2F8] fill-current" />
                <span>شروع و فعال‌سازی هوشمند 💖</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3.5 bg-white hover:bg-[#FFFF66] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-colors cursor-pointer"
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
