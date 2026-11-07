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
        className="fixed inset-0 bg-[#141414]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] text-center"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FAD074] border-2 border-[#141414] rounded-[34px] w-full max-w-sm p-6 sm:p-7 shadow-[0_6px_0_#141414] relative overflow-hidden text-center"
        >
          {/* Dove Icon */}
          <div className="relative mx-auto mb-3.5 w-16 h-16 rounded-full bg-[#7FD1F7] border-2 border-[#141414] shadow-[0_3px_0_#141414] flex items-center justify-center">
            <span className="text-4xl animate-bounce">🕊️</span>
          </div>

          <span className="text-[11px] font-black text-[#141414] bg-white px-3.5 py-1 rounded-full border-2 border-[#141414] inline-block mb-2 shadow-[0_2px_0_#141414]">
            🏳️ سیگنال پرچم سفید و آشتی
          </span>

          <h3 className="text-base sm:text-lg font-black text-[#141414] mb-2 leading-relaxed">
            {poke.senderName || "پارتنرت"} برای آشتی قدم پیش گذاشته است
          </h3>

          <div className="bg-white border-2 border-[#141414] rounded-[24px] p-4 mb-5 text-center shadow-[0_3px_0_#141414]">
            <p className="text-xs sm:text-sm font-black text-[#141414] leading-relaxed whitespace-pre-line">
              «{poke.message}»
            </p>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting || acceptedSuccess}
              className="w-full py-3.5 bg-[#242424] hover:bg-[#141414] text-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
            >
              {acceptedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-[#B5F285] stroke-[2.5]" />
                  <span>آشتی ثبت شد! 💖</span>
                </>
              ) : accepting ? (
                <span>در حال ارسال آغوش...</span>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-[#FBC2F3] fill-current" />
                  <span>پذیرش آتش‌بس و ارسال آغوش 🫂💖</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-white hover:bg-[#F5F97A] text-[#141414] border-2 border-[#141414] shadow-[0_2px_0_#141414] rounded-full text-xs font-black transition-colors cursor-pointer"
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
