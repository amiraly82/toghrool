import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { fetchFromPhpApi } from "../apiClient";
import {
  triggerHardwareVibration,
  playHeartbeatAudio,
  HEARTBEAT_VIBRATION_PATTERN
} from "../utils/deviceNotifications";

interface WhiteFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerName: string;
  onSuccess: (message: string) => void;
}

const PRESET_MESSAGES = [
  {
    id: "tea",
    icon: "☕",
    text: "بیا یه چای/قهوه دونفره بنوشیم و آروم با هم حرف بزنیم."
  },
  {
    id: "smile",
    icon: "🤍",
    text: "غرورم فدای خنده‌هات؛ بیا قهر و دلخوری رو تموم کنیم، آتش‌بس؟"
  },
  {
    id: "hug",
    icon: "🫂",
    text: "دلم برات تنگ شده؛ یه بغل بده تا همه دلخوری‌ها آب بشن."
  },
  {
    id: "apology",
    icon: "🌸",
    text: "معذرت می‌خوام اگر ناخواسته ناراحتت کردم؛ رابطه‌مون برام خیلی مهم‌تر از این حرفاست."
  },
  {
    id: "ready",
    icon: "🕊️",
    text: "من آروم شدم؛ هروقت تو هم حس کردی حالت بهتره بیا صحبت کنیم."
  }
];

export const WhiteFlagModal: React.FC<WhiteFlagModalProps> = ({
  isOpen,
  onClose,
  partnerName,
  onSuccess
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_MESSAGES[0].text);
  const [customText, setCustomText] = useState<string>("");
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  if (!isOpen) return null;

  const finalMessage = isCustom ? customText.trim() : selectedPreset;

  const handleSend = async () => {
    if (!finalMessage) return;
    setSending(true);

    try {
      const res = await fetchFromPhpApi("sendWhiteFlag", { message: finalMessage }, "POST");
      if (res && res.status === "success") {
        triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);
        playHeartbeatAudio();
        onSuccess(finalMessage);
        onClose();
      }
    } catch (err) {
      console.error("Error sending white flag:", err);
    } finally {
      setSending(false);
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
          className="bg-[#FAD074] border-t-2 sm:border-2 border-[#141414] rounded-t-[34px] sm:rounded-[34px] w-full max-w-md shadow-[0_6px_0_#141414] overflow-hidden p-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b-2 border-[#141414]/20 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#7FD1F7] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-xl">
                🕊️
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#141414]">ارسال پرچم سفید 🏳️</h3>
                <p className="text-[11px] text-[#141414]/80 font-extrabold">قدم اول برای آشتی و آرامش دونفره</p>
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

          {/* Description */}
          <p className="text-xs text-[#141414]/85 font-bold leading-relaxed mb-4">
            گاهی برداشتن قدم اول بعد از دلخوری سخت‌ترین کاره. با ارسال پرچم سفید، بدون شکستن غرور به {partnerName} یادآوری می‌کنی که عشق‌تون مهم‌تر از هر دلخوریه.
          </p>

          {/* Preset Options */}
          <div className="space-y-2 mb-4">
            {PRESET_MESSAGES.map((msg) => {
              const isSelected = !isCustom && selectedPreset === msg.text;
              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(msg.text);
                    setIsCustom(false);
                  }}
                  className={`w-full text-right p-3 rounded-[20px] text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 border-2 border-[#141414] ${
                    isSelected
                      ? "bg-[#B5F285] text-[#141414] shadow-[0_3px_0_#141414]"
                      : "bg-white text-[#141414] hover:bg-[#F5F97A] shadow-[0_2px_0_#141414]"
                  }`}
                >
                  <span className="text-base shrink-0">{msg.icon}</span>
                  <span className="flex-1 leading-snug">{msg.text}</span>
                  {isSelected && <span className="w-3 h-3 rounded-full bg-[#141414] shrink-0" />}
                </button>
              );
            })}

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => setIsCustom(true)}
              className={`w-full text-right p-3 rounded-[20px] text-xs font-black transition-all cursor-pointer flex items-center gap-2.5 border-2 border-[#141414] ${
                isCustom
                  ? "bg-[#B5F285] text-[#141414] shadow-[0_3px_0_#141414]"
                  : "bg-white text-[#141414] hover:bg-[#F5F97A] shadow-[0_2px_0_#141414]"
              }`}
            >
              <span className="text-base shrink-0">✍️</span>
              <span className="flex-1">نوشتن متن دلخواه خودم...</span>
              {isCustom && <span className="w-3 h-3 rounded-full bg-[#141414] shrink-0" />}
            </button>
          </div>

          {/* Custom Text Area */}
          {isCustom && (
            <div className="mb-4">
              <textarea
                rows={3}
                placeholder="پیام صلح‌آمیز و دلنشین خودت رو بنویس..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full p-3.5 bg-white border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-[20px] text-xs font-bold text-[#141414] focus:outline-none resize-none"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !finalMessage}
              className="flex-1 py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
            >
              {sending ? (
                <span>در حال ارسال سیگنال صلح...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#F5F97A] stroke-[2.2]" />
                  <span>ارسال پرچم سفید به {partnerName} 🕊️</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3.5 bg-white hover:bg-[#F5F97A] text-[#141414] border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs font-black transition-colors cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WhiteFlagModal;
