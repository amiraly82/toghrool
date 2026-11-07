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
        className="fixed inset-0 bg-[#141414]/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 text-right"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#D5F379] border-t-2 sm:border-2 border-[#141414] rounded-t-[34px] sm:rounded-[34px] w-full max-w-md shadow-[0_6px_0_#141414] overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#141414]/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414]">
                <Droplet className="w-5 h-5 text-[#141414] fill-current stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#141414]">راه‌اندازی چرخه سلامت بانوان 🩸✨</h3>
                <p className="text-[11px] text-[#141414]/80 font-extrabold">تنظیم سریع برای پیش‌بینی هوشمند و همراهی پارتنر</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_2px_0_#141414] text-[#141414] flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <p className="text-xs text-[#141414]/85 font-bold leading-relaxed mb-4">
            برای فعال‌سازی چرخه بیولوژیک، پیش‌بینی روزهای تخمک‌گذاری، PMS و پیام‌های خودکار همراهی برای پارتنرتان، لطفاً ۳ سوال کوتاه زیر را مشخص کنید:
          </p>

          <form onSubmit={handleStart} className="space-y-4">
            {/* Last Period Start Date */}
            <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[22px] p-3.5">
              <label className="block text-xs font-black text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#141414] stroke-[2.2]" />
                <span>تاریخ شروع آخرین پریود</span>
              </label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ آخرین پریود..."
              />
            </div>

            {/* Cycle Length */}
            <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[22px] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-[#141414] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#141414] stroke-[2.2]" />
                  <span>طول معمول چرخه (فاصله دو پریود)</span>
                </label>
                <span className="text-xs font-black text-[#141414] bg-[#B5F285] px-2.5 py-0.5 rounded-full border-2 border-[#141414]">
                  {toPersianDigits(cycleLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2.5">
                {[25, 28, 30, 32].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setCycleLength(d)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border-2 border-[#141414] ${
                      cycleLength === d
                        ? "bg-[#242424] text-white"
                        : "bg-white text-[#141414] hover:bg-[#F5F97A]"
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
                className="w-full h-2.5 bg-[#F5F97A] border border-[#141414] rounded-full appearance-none cursor-pointer accent-[#141414]"
              />
            </div>

            {/* Period Length */}
            <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[22px] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-[#141414] flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-[#141414] stroke-[2.2]" />
                  <span>طول مدت خونریزی</span>
                </label>
                <span className="text-xs font-black text-[#141414] bg-[#FF8B6A] px-2.5 py-0.5 rounded-full border-2 border-[#141414]">
                  {toPersianDigits(periodLength)} روز
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[4, 5, 6, 7, 8].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPeriodLength(d)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border-2 border-[#141414] ${
                      periodLength === d
                        ? "bg-[#242424] text-white"
                        : "bg-white text-[#141414] hover:bg-[#F5F97A]"
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
                className="flex-1 py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
              >
                <Heart className="w-4 h-4 text-[#FBC2F3] fill-current" />
                <span>شروع و فعال‌سازی هوشمند 💖</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3.5 bg-white hover:bg-[#F5F97A] text-[#141414] border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-colors cursor-pointer"
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
