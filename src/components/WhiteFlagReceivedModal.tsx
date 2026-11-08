import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Check } from "lucide-react";
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
        className="fixed inset-0 bg-[#1C1C1C]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-center"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] w-full max-w-sm p-6 sm:p-7 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] relative overflow-hidden text-center"
        >
          {/* Dove Icon */}
          <div className="relative mx-auto mb-3.5 w-16 h-16 rounded-full bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] flex items-center justify-center">
            <span className="text-4xl animate-bounce">🕊️</span>
          </div>

          <span className="text-[11px] font-bold text-[#1C1C1C] bg-white px-3.5 py-1 rounded-full border-[1.5px] border-[#1C1C1C] inline-block mb-2">
            🏳️ سیگنال پرچم سفید و آشتی
          </span>

          <h3 className="text-base sm:text-lg font-black text-[#1C1C1C] mb-2 leading-relaxed">
            {poke.senderName || "پارتنرت"} برای آشتی قدم پیش گذاشته است
          </h3>

          <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 mb-5 text-center">
            <p className="text-xs sm:text-sm font-bold text-[#1C1C1C] leading-relaxed whitespace-pre-line">
              «{poke.message}»
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || acceptedSuccess}
              className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
            >
              {acceptedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#5ED46A] stroke-[1.9]" />
                  <span>آشتی ثبت شد! 💖</span>
                </>
              ) : accepting ? (
                <span>در حال ارسال آغوش...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-[#EBA2F8] fill-current" />
                  <span>پذیرش آتش‌بس و ارسال آغوش 🫂💖</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-white hover:bg-[#FFFF66] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-colors cursor-pointer"
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
