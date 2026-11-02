import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone, Sparkles, Check, Share2, MoreVertical, Globe, CheckCircle2 } from "lucide-react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isManualModal, setIsManualModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activePlatformTab, setActivePlatformTab] = useState<"android" | "ios">("android");

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const checkStandalone = () => {
      const standalone = 
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(standalone);
      return standalone;
    };

    const standalone = checkStandalone();
    if (standalone) return;

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);
    if (isIosDevice) {
      setActivePlatformTab("ios");
    }

    // Capture Android / Chrome beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-show prompt on first visit if not dismissed
      const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed");
      if (!dismissedUntil || Number(dismissedUntil) <= Date.now()) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen to app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setIsManualModal(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // Manual open event (from Header, Profile, or Settings)
    const handleManualOpen = () => {
      setIsManualModal(true);
      setShowPrompt(true);
      // If no deferred prompt is saved, show instructions by default
      if (!deferredPrompt && !isIosDevice) {
        setShowInstructions(true);
      }
    };
    window.addEventListener("open-pwa-install", handleManualOpen);

    // If on mobile browser (including iOS) and prompt hasn't shown after 3.5s, auto-show
    const dismissedUntil = localStorage.getItem("pwa_prompt_dismissed");
    const isDismissed = dismissedUntil && Number(dismissedUntil) > Date.now();
    const timer = setTimeout(() => {
      if (!standalone && !isDismissed && (isIosDevice || deferredPrompt)) {
        setShowPrompt(true);
      }
    }, 3500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-pwa-install", handleManualOpen);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

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
      // If browser doesn't support direct trigger (or already prompted), show manual steps
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsManualModal(false);
    setShowInstructions(false);
    // Dismiss the auto-popup for 2 days (manual button will still work!)
    localStorage.setItem("pwa_prompt_dismissed", String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  if (isInstalled && !isManualModal) {
    return null;
  }

  if (!showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* If manually opened: full-screen backdrop modal; If auto-prompt: floating bottom card */}
      {isManualModal ? (
        <div className="fixed inset-0 bg-[#1B1B1A]/40 backdrop-blur-xs flex items-center justify-center p-4 z-50" dir="rtl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-[32px] w-full max-w-md p-6 shadow-2xl text-right relative overflow-hidden"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D4]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F6C3E5] to-[#EC407A] flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Smartphone className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1B1B1A]">نصب وب‌اپلیکیشن طغرل</h3>
                  <span className="text-[11px] text-[#78746B] font-medium">اجرای تمام‌صفحه و آیکون روی صفحه اصلی</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-9 h-9 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] flex items-center justify-center text-[#78746B] hover:text-[#1B1B1A] transition-colors cursor-pointer"
                title="بستن"
              >
                <X className="w-4 h-4 stroke-[1.8]" />
              </button>
            </div>

            {/* Platform Tabs: Android vs iOS */}
            <div className="mt-4 flex items-center bg-[#EFECE2] p-1 rounded-full text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActivePlatformTab("android");
                  setShowInstructions(!deferredPrompt);
                }}
                className={`flex-1 py-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activePlatformTab === "android"
                    ? "bg-[#1B1B1A] text-[#FAF6EC]"
                    : "text-[#78746B] hover:text-[#1B1B1A]"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>اندروید (Android)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePlatformTab("ios");
                  setShowInstructions(true);
                }}
                className={`flex-1 py-1.5 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activePlatformTab === "ios"
                    ? "bg-[#1B1B1A] text-[#FAF6EC]"
                    : "text-[#78746B] hover:text-[#1B1B1A]"
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>آیفون (iOS)</span>
              </button>
            </div>

            {/* Content for Android */}
            {activePlatformTab === "android" && (
              <div className="mt-4 space-y-3">
                {deferredPrompt ? (
                  <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4 text-center space-y-2">
                    <Sparkles className="w-6 h-6 text-[#EC407A] mx-auto stroke-[1.8]" />
                    <p className="text-xs text-[#1B1B1A] font-bold">
                      دستگاه شما آماده نصب مستقیم با یک کلیک است!
                    </p>
                    <p className="text-[11px] text-[#78746B]">
                      با لمس دکمه زیر، اپلیکیشن طغرل به صورت برنامک مستقل روی گوشی شما نصب خواهد شد.
                    </p>
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full mt-2 py-3 px-4 rounded-full bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
                    >
                      <Download className="w-4 h-4 text-[#F6DC6B]" />
                      <span>نصب مستقیم اپلیکیشن</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4 space-y-3 text-xs text-[#1B1B1A]">
                    <div className="flex items-center gap-2 font-bold text-[#EC407A]">
                      <MoreVertical className="w-4 h-4 stroke-[2]" />
                      <span>راهنمای نصب در مرورگر کروم اندروید:</span>
                    </div>
                    <div className="space-y-2 text-[11px] text-[#78746B] leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1B1B1A] text-[#FAF6EC] flex items-center justify-center text-[10px] font-bold shrink-0">۱</span>
                        <span>در بالای مرورگر کروم، علامت <strong>سه نقطه (⋮)</strong> را لمس کنید.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1B1B1A] text-[#FAF6EC] flex items-center justify-center text-[10px] font-bold shrink-0">۲</span>
                        <span>گزینه <strong>«نصب برنامه» (Install app)</strong> یا <strong>«افزودن به صفحه اصلی» (Add to Home screen)</strong> را انتخاب نمایید.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#A7B86C] text-[#1B1B1A] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                        <span>آیکون طغرل فوراً روی صفحه برنامه‌های گوشی شما قرار می‌گیرد.</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Content for iOS */}
            {activePlatformTab === "ios" && (
              <div className="mt-4 bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4 space-y-3 text-xs text-[#1B1B1A]">
                <div className="flex items-center gap-2 font-bold text-[#EC407A]">
                  <Share2 className="w-4 h-4 stroke-[2]" />
                  <span>راهنمای نصب در آیفون (مرورگر Safari):</span>
                </div>
                <div className="space-y-2 text-[11px] text-[#78746B] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1B1B1A] text-[#FAF6EC] flex items-center justify-center text-[10px] font-bold shrink-0">۱</span>
                    <span>در نوار پایین مرورگر Safari، آیکون <strong>اشتراک‌گذاری (Share)</strong> را لمس کنید.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1B1B1A] text-[#FAF6EC] flex items-center justify-center text-[10px] font-bold shrink-0">۲</span>
                    <span>به سمت پایین اسکرول کرده و گزینه <strong>Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب کنید.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#A7B86C] text-[#1B1B1A] flex items-center justify-center text-[10px] font-bold shrink-0">۳</span>
                    <span>در گوشه بالا دکمه <strong>Add</strong> را بزنید. کار تمام است!</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-6 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A] text-xs font-bold transition-colors cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </motion.div>
        </div>
      ) : (
        /* Floating Auto-Prompt Card (First-time visitor) */
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 sm:bottom-6 inset-x-4 sm:inset-x-auto sm:left-6 max-w-sm z-50 bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-4 shadow-xl shadow-[#1B1B1A]/8 text-right"
          dir="rtl"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F6C3E5] to-[#EC407A] flex items-center justify-center text-white shrink-0 shadow-sm">
                <Smartphone className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[#1B1B1A]">نصب اپلیکیشن طغرل</span>
                  <span className="text-[10px] font-bold bg-[#FAF6EC] border border-[#E8E2D4] text-[#EC407A] px-2 py-0.5 rounded-full">
                    PWA موبایل
                  </span>
                </div>
                <p className="text-[11px] text-[#78746B] mt-1 leading-snug">
                  برای دسترسی سریع‌تر، آیکون روی صفحه اصلی و اجرای تمام‌صفحه بدون مرورگر.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] flex items-center justify-center text-[#78746B] hover:text-[#1B1B1A] shrink-0 transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>

          {/* Inline instructions if opened on non-deferred or iOS */}
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 pt-3 border-t border-[#F0EBE0] text-[11px] text-[#78746B] space-y-1.5"
            >
              {isIOS ? (
                <>
                  <div className="flex items-center gap-2 text-[#1B1B1A] font-bold">
                    <Share2 className="w-3.5 h-3.5 text-[#EC407A]" />
                    <span>راهنمای نصب روی آیفون (Safari):</span>
                  </div>
                  <p>۱. در پایین صفحه دکمه <strong>Share</strong> را لمس کنید.</p>
                  <p>۲. گزینه <strong>Add to Home Screen (افزودن به صفحه اصلی)</strong> را انتخاب کنید.</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[#1B1B1A] font-bold">
                    <MoreVertical className="w-3.5 h-3.5 text-[#EC407A]" />
                    <span>راهنمای نصب روی اندروید:</span>
                  </div>
                  <p>۱. منوی <strong>سه نقطه (⋮)</strong> مرورگر کروم را لمس کنید.</p>
                  <p>۲. گزینه <strong>نصب برنامه (Install app)</strong> را بزنید.</p>
                </>
              )}
            </motion.div>
          )}

          <div className="mt-3 pt-3 border-t border-[#F0EBE0] flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-full bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 stroke-[2] text-[#F6DC6B]" />
              <span>نصب و افزودن به گوشی</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="py-2.5 px-3.5 rounded-full bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#78746B] text-xs font-bold transition-colors cursor-pointer"
            >
              بعداً
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
