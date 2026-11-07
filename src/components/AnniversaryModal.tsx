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
          colors: ["#FBC2F3", "#B5F285", "#F5F97A"]
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
          className="bg-[#FAD074] border-t-2 sm:border-2 border-[#141414] rounded-t-[34px] sm:rounded-[34px] w-full max-w-md shadow-[0_6px_0_#141414] overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#141414]/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414]">
                <Heart className="w-5 h-5 text-[#141414] fill-[#FF8B6A] stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#141414]">روزشمار عشق و سالگردها 💍✨</h3>
                <p className="text-[11px] text-[#141414]/80 font-extrabold">ثبت تاریخ‌های ماندگار زندگی دونفره</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] text-[#141414] flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Days Together Counter Card */}
          {daysTogether !== null && daysTogether > 0 && (
            <div className="mb-5 bg-[#A594F9] border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-[26px] p-4 text-center relative overflow-hidden">
              <span className="text-[10px] font-black text-[#141414] bg-[#F5F97A] px-3 py-0.5 rounded-full border-2 border-[#141414] inline-block mb-1.5">
                تعداد روزهای عاشقی ✦
              </span>
              <div className="flex items-baseline justify-center gap-1.5 my-1">
                <span className="text-3xl font-black text-[#141414] tracking-tight">
                  {toPersianDigits(daysTogether)}
                </span>
                <span className="text-xs font-black text-[#141414]">روز در کنار هم ❤️</span>
              </div>
              <p className="text-[11px] text-[#141414]/85 font-extrabold">
                شروع از {toPersianDigits(formatPersianDate(relDate))}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[22px] p-3.5">
              <label className="block text-xs font-black text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#141414] stroke-[2.2]" />
                <span>تاریخ شروع رابطه / آشنایی</span>
              </label>
              <JalaliDatePicker
                value={relDate}
                onChange={setRelDate}
                placeholder="انتخاب تاریخ آشنایی..."
              />
            </div>

            <div className="bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[22px] p-3.5">
              <label className="block text-xs font-black text-[#141414] mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#141414] stroke-[2.2]" />
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
                className="flex-1 py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-[#B5F285] stroke-[2.5]" />
                    <span>با موفقیت ذخیره شد! 🎉</span>
                  </>
                ) : saving ? (
                  <span>در حال ذخیره...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#F5F97A] stroke-[2.2]" />
                    <span>ذخیره تاریخ‌های عاشقی</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3.5 bg-white hover:bg-[#F5F97A] text-[#141414] border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-colors cursor-pointer"
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
