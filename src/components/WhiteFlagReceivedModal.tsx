import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, X, Check } from "lucide-react";
import { Poke } from "../types";
import { fetchFromPhpApi } from "../apiClient";
import {
  triggerHardwareVibration,
  playHeartbeatAudio,
  HEARTBEAT_VIBRATION_PATTERN
} from "../utils/deviceNotifications";

interface WhiteFlagReceivedModalProps {
  poke: Poke | null;
  onClose: () => void;
  onAccepted: (replyMsg: string) => void;
}

export const WhiteFlagReceivedModal: React.FC<WhiteFlagReceivedModalProps> = ({
  poke,
  onClose,
  onAccepted
}) => {
  const [accepting, setAccepting] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);

  if (!poke) return null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const replyMessage = "منم دلم خیلی برات تنگ شده بود؛ آتش‌بس پذیرفته شد! بیا بغلم 🫂💖";
      const res = await fetchFromPhpApi("acceptWhiteFlag", {
        pokeId: poke.id,
        message: replyMessage
      }, "POST");

      if (res && res.status === "success") {
        triggerHardwareVibration(HEARTBEAT_VIBRATION_PATTERN);
        playHeartbeatAudio();
        setAcceptedSuccess(true);
        setTimeout(() => {
          onAccepted(replyMessage);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error("Error accepting white flag:", err);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#1B1B1A]/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] text-center"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFDF8] border-2 border-[#E8E2D4] rounded-[36px] w-full max-w-sm p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-tr from-[#DCE6B5]/50 to-[#FAF6EC] blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-gradient-to-tr from-[#F6C3E5]/40 to-[#FAF6EC] blur-2xl pointer-events-none" />

          {/* Dove Icon */}
          <div className="relative mx-auto mb-3.5 w-16 h-16 flex items-center justify-center">
            <span className="text-5xl animate-bounce">🕊️</span>
          </div>

          <span className="text-[11px] font-bold text-[#1B1B1A] bg-[#FAF6EC] px-3.5 py-1 rounded-full border border-[#E8E2D4] inline-block mb-2 shadow-2xs">
            🏳️ سیگنال پرچم سفید و آشتی
          </span>

          <h3 className="text-base sm:text-lg font-black text-[#1B1B1A] mb-2 leading-relaxed">
            {poke.senderName || "پارتنرت"} برای آشتی قدم پیش گذاشته است
          </h3>

          <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4 mb-5 text-center shadow-2xs">
            <p className="text-xs sm:text-sm font-semibold text-[#1B1B1A] leading-relaxed whitespace-pre-line">
              «{poke.message}»
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || acceptedSuccess}
              className="w-full py-3.5 bg-gradient-to-r from-[#1B1B1A] to-[#2F2E2C] hover:opacity-95 text-[#FAF6EC] rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {acceptedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#10B981]" />
                  <span>آشتی ثبت شد! 💖</span>
                </>
              ) : accepting ? (
                <span>در حال ارسال آغوش...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-[#F6C3E5] fill-current" />
                  <span>پذیرش آتش‌بس و ارسال آغوش 🫂💖</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-[#FAF6EC] hover:bg-[#EFECE2] text-[#78746B] hover:text-[#1B1B1A] rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              کمی زمان نیاز دارم، اما متشکرم 🌱
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WhiteFlagReceivedModal;
