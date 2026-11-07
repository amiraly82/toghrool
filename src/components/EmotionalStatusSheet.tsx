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
    <div className="fixed inset-0 bg-[#141414]/65 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4 z-[95]" dir="rtl" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#FAD074] border-t-2 sm:border-2 border-[#141414] rounded-t-[34px] sm:rounded-[34px] w-full max-w-lg p-5 sm:p-6 relative text-right shadow-[0_6px_0_#141414] max-h-[90vh] overflow-y-auto"
      >
        {/* Handle for mobile */}
        <div className="w-12 h-1.5 bg-[#141414] rounded-full mx-auto mb-4 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#141414]/20 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#FBC2F3] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] shrink-0">
              <Sparkles className="w-5 h-5 stroke-[2.3]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#141414]">وضعیت روانی و باتری من 🔋</h3>
              <p className="text-xs text-[#141414]/80 font-extrabold">به پارتنرت بگو الان چقدر شارژ داری و به چی نیاز داری</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] transition-transform active:translate-y-0.5 cursor-pointer shrink-0"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Battery Level Slider */}
        <div className="space-y-3 bg-white p-4 sm:p-5 rounded-[26px] border-2 border-[#141414] shadow-[0_3px_0_#141414] mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#141414]">
              میزان انرژی و شارژ درونی:
            </span>
            <div className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 bg-[#B5F285] border-2 border-[#141414] text-[#141414]">
              <span>{batteryVisual.icon}</span>
              <span>{toPersianDigits(battery)}٪</span>
              <span className="text-[10px] font-extrabold opacity-85">({batteryVisual.label})</span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={battery}
            onChange={(e) => setBattery(parseInt(e.target.value, 10))}
            className="w-full h-3 bg-[#F5F97A] border-2 border-[#141414] rounded-full appearance-none cursor-pointer accent-[#141414]"
          />

          <div className="flex justify-between text-[10px] text-[#141414] font-black px-1">
            <span>۰٪ (خالی و له)</span>
            <span>۵۰٪ (متوسط)</span>
            <span>۱۰۰٪ (شارژ کامل)</span>
          </div>
        </div>

        {/* Need / Mood Status Selection Grid */}
        <div className="space-y-2.5 mb-5">
          <label className="text-xs font-black text-[#141414] block mr-1">
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
                  className={`p-3.5 rounded-[22px] border-2 border-[#141414] text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#B5F285] shadow-[0_3px_0_#141414]"
                      : "bg-white hover:bg-[#F5F97A] shadow-[0_2px_0_#141414]"
                  }`}
                >
                  <span className="w-10 h-10 rounded-full bg-white border-2 border-[#141414] flex items-center justify-center text-xl shrink-0">
                    {opt.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black truncate text-[#141414]">
                        {opt.label}
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px] font-black shrink-0">
                          ✓
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-[#141414]/80 font-bold leading-relaxed mt-0.5 line-clamp-2">
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
          className="w-full py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[2.5] text-[#B5F285]" />
              <span>به‌روزرسانی وضعیت عاطفی</span>
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
