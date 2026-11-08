import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone, Sparkles, Share2, MoreVertical } from "lucide-react";

interface PWAInstallPromptProps {
  canAutoPrompt?: boolean;
}

export default function PWAInstallPrompt({ canAutoPrompt = false }: PWAInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isManualModal, setIsManualModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<"android" | "ios">("android");

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
      return standalone;
    };

    const standalone = checkStandalone();
    if (standalone) return;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
    if (isIosDevice) {
      setActivePlatformTab("ios");
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setIsManualModal(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    const handleManualOpen = () => {
      setIsManualModal(true);
      setShowPrompt(true);
      if (!deferredPrompt && !isIosDevice) {
        setShowInstructions(true);
      }
    };
    window.addEventListener("open-pwa-install", handleManualOpen);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-pwa-install", handleManualOpen);
    };
  }, [deferredPrompt, canAutoPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
          setShowPrompt(false);
          setIsManualModal(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn("Install prompt error:", err);
        setShowInstructions(true);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsManualModal(false);
    setShowInstructions(false);
    localStorage.setItem("pwa_prompt_dismissed", String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  };

  if (isInstalled && !isManualModal) {
    return null;
  }

  if (!showPrompt || (!isManualModal && !canAutoPrompt)) {
    return null;
  }

  return (
    <AnimatePresence>
      {isManualModal ? (
        <div className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl" onClick={handleDismiss}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] w-full max-w-md p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] text-right relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3.5 border-b-[1.5px] border-[#1C1C1C]/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                  <Smartphone className="w-5 h-5 stroke-[1.9]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1C1C1C]">نصب وب‌اپلیکیشن طغرل</h3>
                  <span className="text-[11px] text-[#1C1C1C]/80 font-bold">اجرای تمام‌صفحه و آیکون روی صفحه اصلی</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] transition-transform active:translate-y-0.5 cursor-pointer"
                title="بستن"
              >
                <X className="w-4 h-4 stroke-[1.9]" />
              </button>
            </div>

            {/* Platform Tabs: Android vs iOS */}
            <div className="mt-4 flex items-center gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActivePlatformTab("android");
                  setShowInstructions(!deferredPrompt);
                }}
                className={`flex-1 py-2 rounded-full border-[1.5px] border-[#1C1C1C] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activePlatformTab === "android"
                    ? "bg-[#5ED46A] text-[#1C1C1C]"
                    : "bg-white text-[#1C1C1C]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 stroke-[1.9]" />
                <span>اندروید (Android)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePlatformTab("ios");
                  setShowInstructions(true);
                }}
                className={`flex-1 py-2 rounded-full border-[1.5px] border-[#1C1C1C] transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activePlatformTab === "ios"
                    ? "bg-[#5ED46A] text-[#1C1C1C]"
                    : "bg-white text-[#1C1C1C]"
                }`}
              >
                <Share2 className="w-3.5 h-3.5 stroke-[1.9]" />
                <span>آیفون (iOS)</span>
              </button>
            </div>

            {/* Content for Android */}
            {activePlatformTab === "android" && (
              <div className="mt-4 space-y-3">
                {deferredPrompt ? (
                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 text-center space-y-2">
                    <Sparkles className="w-6 h-6 text-[#1C1C1C] mx-auto stroke-[1.9]" />
                    <p className="text-xs text-[#1C1C1C] font-bold">
                      دستگاه شما آماده نصب مستقیم با یک کلیک است!
                    </p>
                    <p className="text-[11px] text-[#1C1C1C]/80 font-medium">
                      با لمس دکمه زیر، اپلیکیشن طغرل به صورت برنامک مستقل روی گوشی شما نصب خواهد شد.
                    </p>
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full mt-2 py-3 px-4 rounded-full bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-[#FFFF66]" />
                      <span>نصب مستقیم اپلیکیشن</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 space-y-3 text-xs text-[#1C1C1C]">
                    <div className="flex items-center gap-2 font-bold text-[#1C1C1C]">
                      <MoreVertical className="w-4 h-4 stroke-[1.9]" />
                      <span>راهنمای نصب در مرورگر کروم اندروید:</span>
                    </div>
                    <div className="space-y-2 text-[11px] text-[#1C1C1C] font-medium leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FFFF66] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">۱</span>
                        <span>در بالای مرورگر کروم، علامت <strong>سه نقطه (⋮)</strong> را لمس کنید.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FFFF66] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">۲</span>
                        <span>گزینه <strong>«نصب برنامه» (Install app)</strong> یا <strong>«افزودن به صفحه اصلی»</strong> را انتخاب نمایید.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#5ED46A] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                        <span>آیکون طغرل فوراً روی صفحه برنامه‌های گوشی شما قرار می‌گیرد.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content for iOS */}
            {activePlatformTab === "ios" && (
              <div className="mt-4 bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 space-y-3 text-xs text-[#1C1C1C]">
                <div className="flex items-center gap-2 font-bold text-[#1C1C1C]">
                  <Share2 className="w-4 h-4 stroke-[1.9]" />
                  <span>راهنمای نصب در آیفون (مرورگر Safari):</span>
                </div>
                <div className="space-y-2 text-[11px] text-[#1C1C1C] font-medium leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFFF66] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">۱</span>
                    <span>در نوار پایین مرورگر Safari، آیکون <strong>اشتراک‌گذاری (Share)</strong> را لمس کنید.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#FFFF66] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">۲</span>
                    <span>به سمت پایین اسکرول کرده و گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#5ED46A] border border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center text-[10px] font-bold shrink-0">۳</span>
                    <span>در گوشه بالا دکمه <strong>Add</strong> را بزنید. کار تمام است!</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-6 rounded-full bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold transition-colors cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
