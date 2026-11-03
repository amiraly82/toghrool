import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, BatteryCharging, Sparkles, Heart } from "lucide-react";
import { NEED_STATUS_OPTIONS, getNeedStatusOption, getBatteryVisual } from "../utils/emotionalStatus";
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
    <div className="fixed inset-0 bg-[#1B1B1A]/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[95]" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-t-[32px] sm:rounded-[32px] w-full max-w-lg p-6 sm:p-7 relative text-right shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Handle for mobile */}
        <div className="w-12 h-1.5 bg-[#C5BDAA] rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D4] mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F6C3E5] flex items-center justify-center text-[#1B1B1A]">
              <Sparkles className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1B1B1A]">وضعیت روانی و باتری من 🔋</h3>
              <p className="text-[11px] text-[#78746B] font-medium">به پارتنرت بگو الان چقدر شارژ داری و به چی نیاز داری</p>
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

        {/* Battery Level Slider */}
        <div className="space-y-2.5 bg-[#FFFDF8] p-4 sm:p-5 rounded-[24px] border border-[#E8E2D4] mb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1B1B1A] flex items-center gap-1.5">
              <span>میزان انرژی و شارژ درونی:</span>
            </span>
            <div className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${batteryVisual.bgColor}`} style={{ color: batteryVisual.color }}>
              <span>{batteryVisual.icon}</span>
              <span>{toPersianDigits(battery)}٪</span>
              <span className="text-[10px] font-bold opacity-80">({batteryVisual.label})</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={battery}
            onChange={(e) => setBattery(parseInt(e.target.value, 10))}
            className="w-full h-2.5 bg-[#EFECE2] rounded-lg appearance-none cursor-pointer accent-[#1B1B1A]"
          />

          <div className="flex justify-between text-[10px] text-[#78746B] font-bold px-1">
            <span>۰٪ (خالی و له)</span>
            <span>۵۰٪ (متوسط)</span>
            <span>۱۰۰٪ (شارژ کامل)</span>
          </div>
        </div>

        {/* Need / Mood Status Selection Grid */}
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-[#1B1B1A] block mr-1">
            الان بیشتر روی چه مودی هستی یا به چی نیاز داری؟
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NEED_STATUS_OPTIONS.map((opt) => {
              const isSelected = status === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={`p-3.5 rounded-2xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#FFF0F7] border-[#EC407A] shadow-xs ring-1 ring-[#EC407A]'
                      : 'bg-[#FFFDF8] border-[#E8E2D4] hover:bg-[#EFECE2]/60'
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black truncate ${isSelected ? 'text-[#EC407A]' : 'text-[#1B1B1A]'}`}>
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#EC407A] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#78746B] leading-relaxed mt-0.5 line-clamp-2">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="w-full py-3.5 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2] text-[#A7B86C]" />
                <span>به‌روزرسانی وضعیت عاطفی</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
