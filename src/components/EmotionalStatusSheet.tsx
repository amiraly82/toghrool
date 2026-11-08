import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Check, Sparkles } from "lucide-react";
import { NEED_STATUS_OPTIONS, getBatteryVisual } from "../utils/emotionalStatus";
import { toPersianDigits } from "../utils/jalali";

interface EmotionalStatusSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentBattery: number;
  currentStatus: string;
  onSave: (battery: number, status: string) => Promise<void>;
}

export default function EmotionalStatusSheet({
  isOpen,
  onClose,
  currentBattery,
  currentStatus,
  onSave
}: EmotionalStatusSheetProps) {
  const [battery, setBattery] = useState<number>(currentBattery || 80);
  const [status, setStatus] = useState<string>(currentStatus || "calm");
  const [isSaving, setIsSaving] = useState(false);

  const batteryVisual = getBatteryVisual(battery);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (navigator.vibrate) {
        navigator.vibrate([40]);
      }
      await onSave(battery, status);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[95]" dir="rtl" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#F6F4F0] border-t-[1.5px] sm:border-[1.5px] border-[#1C1C1C] rounded-t-[28px] sm:rounded-[28px] w-full max-w-lg p-5 sm:p-6 relative text-right shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] max-h-[90vh] overflow-y-auto"
      >
        {/* Handle for mobile */}
        <div className="w-12 h-1.5 bg-[#1C1C1C]/30 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-[1.5px] border-[#1C1C1C]/15 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
              <Sparkles className="w-5 h-5 stroke-[1.9]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1C1C1C]">وضعیت روانی و باتری من 🔋</h3>
              <p className="text-xs text-[#6E6B66] font-medium">به پارتنرت بگو الان چقدر شارژ داری و به چی نیاز داری</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-[#F5F3EF] border border-[#1C1C1C]/20 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[1.9]" />
          </button>
        </div>

        {/* Battery Level Slider */}
        <div className="space-y-3 bg-white p-4 sm:p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1C1C1C]">
              میزان انرژی و شارژ درونی:
            </span>
            <div className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C]">
              <span>{batteryVisual.icon}</span>
              <span>{toPersianDigits(battery)}٪</span>
              <span className="text-[10px] font-bold opacity-85">({batteryVisual.label})</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={battery}
            onChange={(e) => setBattery(parseInt(e.target.value, 10))}
            className="w-full h-3 bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] rounded-full appearance-none cursor-pointer accent-[#1C1C1C]"
          />

          <div className="flex justify-between text-[10px] text-[#1C1C1C] font-bold px-1">
            <span>۰٪ (خالی و له)</span>
            <span>۵۰٪ (متوسط)</span>
            <span>۱۰۰٪ (شارژ کامل)</span>
          </div>
        </div>

        {/* Need / Mood Status Selection Grid */}
        <div className="space-y-2.5 mb-5">
          <label className="text-xs font-bold text-[#1C1C1C] block mr-1">
            الان بیشتر روی چه مودی هستی یا به چی نیاز داری؟
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {NEED_STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={`p-3.5 rounded-[22px] border-[1.5px] border-[#1C1C1C] text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#5ED46A]"
                      : "bg-white hover:bg-[#FFFF66]"
                  }`}
                >
                  <span className="w-10 h-10 rounded-full bg-white border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-xl shrink-0">
                    {opt.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate text-[#1C1C1C]">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#1C1C1C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#1C1C1C]/80 font-medium leading-relaxed mt-0.5 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[1.9] text-[#5ED46A]" />
              <span>به‌روزرسانی وضعیت عاطفی</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
