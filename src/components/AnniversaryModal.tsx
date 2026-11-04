import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Calendar, Sparkles, Save, Check } from "lucide-react";
import { fetchFromPhpApi } from "../apiClient";
import JalaliDatePicker from "./JalaliDatePicker";
import { toPersianDigits, formatPersianDate } from "../utils/jalali";
import confetti from "canvas-confetti";

interface AnniversaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  relationshipStartDate?: string | null;
  marriageDate?: string | null;
  onSaved: (relStart: string, marriage: string) => void;
}

export function calculateDaysBetween(startDateStr: string): number {
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
}

export const AnniversaryModal: React.FC<AnniversaryModalProps> = ({
  isOpen,
  onClose,
  relationshipStartDate,
  marriageDate,
  onSaved
}) => {
  const [relDate, setRelDate] = useState<string>(relationshipStartDate || "");
  const [marrDate, setMarrDate] = useState<string>(marriageDate || "");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const daysTogether = relDate ? calculateDaysBetween(relDate) : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchFromPhpApi("updateAnniversaries", {
        relationshipStartDate: relDate,
        marriageDate: marrDate
      }, "POST");

      if (res && res.status === "success") {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#F6C3E5", "#A7B86C", "#F6DC6B"]
        });
        setSavedSuccess(true);
        onSaved(relDate, marrDate);
        setTimeout(() => {
          setSavedSuccess(false);
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Error updating anniversaries:", err);
    } finally {
      setSaving(false);
    }
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
                <Heart className="w-5 h-5 text-[#EC407A] fill-current" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1B1B1A]">روزشمار عشق و سالگردها 💍✨</h3>
                <p className="text-[11px] text-[#78746B] font-medium">ثبت تاریخ‌های ماندگار زندگی دونفره</p>
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

          {/* Days Together Counter Card */}
          {daysTogether !== null && daysTogether > 0 && (
            <div className="mb-5 bg-gradient-to-r from-[#FFF0F7] to-[#FAF6EC] border border-[#F8BBD0] rounded-3xl p-4 text-center shadow-2xs relative overflow-hidden">
              <span className="text-[10px] font-bold text-[#EC407A] bg-white/80 px-2.5 py-0.5 rounded-full border border-[#F8BBD0] inline-block mb-1.5">
                تعداد روزهای عاشقی
              </span>
              <div className="flex items-baseline justify-center gap-1.5 my-1">
                <span className="text-3xl font-black text-[#1B1B1A] tracking-tight">
                  {toPersianDigits(daysTogether)}
                </span>
                <span className="text-xs font-bold text-[#78746B]">روز در کنار هم ❤️</span>
              </div>
              <p className="text-[11px] text-[#78746B] font-medium">
                شروع از {toPersianDigits(formatPersianDate(relDate))}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#EC407A]" />
                <span>تاریخ شروع رابطه / آشنایی</span>
              </label>
              <JalaliDatePicker
                value={relDate}
                onChange={setRelDate}
                placeholder="انتخاب تاریخ آشنایی..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1B1B1A] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>تاریخ عقد یا ازدواج (اختیاری)</span>
              </label>
              <JalaliDatePicker
                value={marrDate}
                onChange={setMarrDate}
                placeholder="انتخاب تاریخ ازدواج..."
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={saving || !relDate}
                className="flex-1 py-3 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-[#10B981]" />
                    <span>با موفقیت ذخیره شد! 🎉</span>
                  </>
                ) : saving ? (
                  <span>در حال ذخیره...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-[#F6DC6B]" />
                    <span>ذخیره تاریخ‌های عاشقی</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 bg-[#FAF6EC] hover:bg-[#EFECE2] text-[#78746B] rounded-2xl text-xs font-bold transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AnniversaryModal;
