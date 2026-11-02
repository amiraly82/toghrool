import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { UserProfile, FemaleOnboardingHealthData } from "./types";
import AuthAndPairing from "./components/AuthAndPairing";
import Dashboard from "./components/Dashboard";
import FemaleOnboardingTour from "./components/FemaleOnboardingTour";
import { Heart, RefreshCw, Key, ArrowRight, HeartHandshake, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fetchFromPhpApi } from "./apiClient";

declare const __APP_BUILD_TIME__: string;

// Helper to generate a random uppercase 6-character couple code
const generateCoupleCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(() => {
    const stored = localStorage.getItem("custom_user_session");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem("cached_user_profile");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    // If we have a cached profile, don't block with loading screen; load instantly
    return !localStorage.getItem("cached_user_profile");
  });
  const [error, setError] = useState<string | null>(null);

  const [sessionTrigger, setSessionTrigger] = useState(0);

  // Auto-reload and cache invalidation when a new build is deployed
  useEffect(() => {
    const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : 'dev';
    const savedBuild = localStorage.getItem("app_build_version");

    if (savedBuild && savedBuild !== currentBuild) {
      console.log("New application build detected. Clearing stale cache...");
      localStorage.removeItem("cached_user_profile");
      localStorage.setItem("app_build_version", currentBuild);
    } else {
      localStorage.setItem("app_build_version", currentBuild);
    }

    // Refresh root document cache entry so normal reloads always serve the latest HTML
    try {
      fetch(window.location.pathname, { cache: "reload" }).catch(() => {});
    } catch (e) {}

    const checkServerVersion = async () => {
      try {
        const res = await fetch(`/version.json?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.buildTime && data.buildTime !== currentBuild) {
            console.log(`Server has newer build (${data.buildTime} vs ${currentBuild}). Purging cache and reloading...`);

            // 1. Clear CacheStorage
            if ('caches' in window) {
              try {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              } catch (err) {}
            }

            // 2. Unregister any Service Workers
            if ('serviceWorker' in navigator) {
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
              } catch (err) {}
            }

            // 3. Overwrite browser HTTP cache for root path before redirecting
            try {
              await fetch(window.location.pathname, { cache: "reload" });
            } catch (err) {}

            // 4. Clear temporary local caches while preserving user session
            localStorage.removeItem("cached_user_profile");
            localStorage.setItem("app_build_version", data.buildTime);

            // 5. Force browser to fetch fresh HTML using cache-busting query parameter
            const targetUrl = new URL(window.location.href);
            targetUrl.searchParams.set('v', data.buildTime);
            window.location.replace(targetUrl.toString());
          }
        }
      } catch (e) {
        // Safe ignore network glitches
      }
    };

    // Immediate check on load
    checkServerVersion();

    // Regular polling every 10 seconds
    const interval = setInterval(checkServerVersion, 10000);

    const handleFocus = () => checkServerVersion();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const setupUserSubscription = async (uid: string, email: string, displayName: string) => {
      // 1. Try PHP API first (source of truth on cPanel host)
      try {
        const res = await fetchFromPhpApi('getUser', { uid });
        if (res && res.status === 'success' && res.user) {
          setUserProfile(res.user);
          localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
          setLoading(false);
          setError(null);
          return;
        }
      } catch (phpErr) {
        console.warn("PHP API getUser failed:", phpErr);
      }

      // If cached profile exists, use it
      const cached = localStorage.getItem("cached_user_profile");
      if (cached) {
        try {
          setUserProfile(JSON.parse(cached));
          setLoading(false);
          setError(null);
          return;
        } catch (e) {}
      }

      // Construct local fallback profile for current user
      const localProfile: UserProfile = {
        uid,
        email,
        displayName,
        coupleCode: generateCoupleCode(),
        partnerEmail: null,
        partnerUid: null,
        coupleId: null
      };
      setUserProfile(localProfile);
      localStorage.setItem("cached_user_profile", JSON.stringify(localProfile));
      setLoading(false);
      setError(null);
    };

    // Fast-path: If custom session exists, setup Firestore listener immediately for sub-millisecond response
    const storedCustomUser = localStorage.getItem("custom_user_session");
    if (storedCustomUser) {
      try {
        const parsed = JSON.parse(storedCustomUser);
        setupUserSubscription(parsed.uid, parsed.email, parsed.displayName);
      } catch (e) {
        console.error("Error restoring custom session", e);
      }
    }

    // 1. Listen to Firebase Authentication state
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        setupUserSubscription(
          user.uid, 
          user.email || `${user.uid}@dummy.com`, 
          user.displayName || user.email?.split("@")[0] || "پارتنر عزیز"
        );
      } else {
        // If there's no active Firebase user, check if there's a custom user session
        const storedCustomUserNow = localStorage.getItem("custom_user_session");
        if (storedCustomUserNow) {
          try {
            const parsed = JSON.parse(storedCustomUserNow);
            setFirebaseUser(parsed);
            setupUserSubscription(parsed.uid, parsed.email, parsed.displayName);
          } catch (e) {
            console.error("Error loading custom session", e);
            localStorage.removeItem("custom_user_session");
            setFirebaseUser(null);
            setUserProfile(null);
            setLoading(false);
          }
        } else {
          setFirebaseUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [sessionTrigger]);

  const handleUpdateUserProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem("cached_user_profile", JSON.stringify(updated));
    const stored = localStorage.getItem("custom_user_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        localStorage.setItem("custom_user_session", JSON.stringify({ ...parsed, ...updated }));
      } catch (e) {}
    }
  };

  // Safe manual refresh method
  const handleRefreshProfile = async () => {
    setSessionTrigger(prev => prev + 1);
    const activeUid = firebaseUser?.uid || JSON.parse(localStorage.getItem("custom_user_session") || "{}")?.uid;
    if (!activeUid) return;
    if (!userProfile) {
      setLoading(true);
    }
    try {
      const res = await fetchFromPhpApi('getUser', { uid: activeUid });
      if (res && res.status === 'success' && res.user) {
        setUserProfile(res.user);
        localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
      }
    } catch (phpErr) {
      console.warn("PHP getUser refresh failed", phpErr);
    } finally {
      setLoading(false);
    }
  };

  // Complete female onboarding tour & persist health profile
  const handleOnboardingComplete = async (data: FemaleOnboardingHealthData) => {
    try {
      const res = await fetchFromPhpApi('saveOnboarding', {
        onboardingHealthData: data,
        cycleLength: data.cycleLength,
        periodLength: data.periodLength,
        lastPeriodStartDate: data.lastPeriodStartDate
      });
      if (res && res.status === 'success' && res.user) {
        handleUpdateUserProfile(res.user);
      } else {
        const updated: UserProfile = {
          ...userProfile!,
          onboardingCompleted: true,
          onboardingHealthData: data
        };
        handleUpdateUserProfile(updated);
      }
    } catch (err) {
      console.error("Save onboarding failed:", err);
      const updated: UserProfile = {
        ...userProfile!,
        onboardingCompleted: true,
        onboardingHealthData: data
      };
      handleUpdateUserProfile(updated);
    }
  };

  const isFemalePendingOnboarding = Boolean(
    userProfile &&
    userProfile.gender === 'female' &&
    !userProfile.onboardingCompleted
  );

  const [skippedPairing, setSkippedPairing] = useState<boolean>(() => {
    const activeUid = JSON.parse(localStorage.getItem("custom_user_session") || "{}")?.uid;
    if (activeUid && localStorage.getItem(`skip_pairing_${activeUid}`) === "true") {
      return true;
    }
    return false;
  });

  const [showPairingModal, setShowPairingModal] = useState<boolean>(false);

  const handleSkipPairing = () => {
    const activeUid = userProfile?.uid || JSON.parse(localStorage.getItem("custom_user_session") || "{}")?.uid;
    if (activeUid) {
      localStorage.setItem(`skip_pairing_${activeUid}`, "true");
    }
    setSkippedPairing(true);
    setShowPairingModal(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF6EC] text-[#1B1B1A] font-sans selection:bg-[#F6C3E5] selection:text-[#1B1B1A] overflow-x-hidden">
      <AnimatePresence mode="wait">
        {loading ? (
          /* Minimalist Pastel Loader */
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-[#FAF6EC]"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-[#F6C3E5] rounded-full flex items-center justify-center text-[#1B1B1A]">
                <Heart className="w-9 h-9 stroke-[1.6] animate-heart text-[#1B1B1A]" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 bg-[#F6DC6B] rounded-full border-2 border-[#FAF6EC] flex items-center justify-center text-[11px] font-bold text-[#1B1B1A]">
                ✦
              </div>
            </div>
            <p className="mt-5 text-xs font-bold text-[#78746B] flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1B1B1A]" />
              در حال آماده‌سازی فضای طغرل...
            </p>
          </motion.div>
        ) : error ? (
          /* Minimalist Error Page */
          <motion.div
            key="error"
            className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#FAF6EC]"
          >
            <div className="w-16 h-16 bg-[#F6C3E5] rounded-full flex items-center justify-center text-[#1B1B1A] mb-4">
              <Heart className="w-7 h-7 stroke-[1.6]" />
            </div>
            <h3 className="text-lg font-bold text-[#1B1B1A]">خطایی رخ داد</h3>
            <p className="text-[#78746B] text-sm mt-1.5 max-w-xs leading-relaxed">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 py-3 px-7 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] font-bold rounded-full text-xs cursor-pointer transition-colors"
            >
              تلاش دوباره
            </button>
          </motion.div>
        ) : !firebaseUser || !userProfile ? (
          /* Authentication flow */
          <motion.div
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthAndPairing 
              userProfile={userProfile} 
              loading={loading} 
              onRefreshProfile={handleRefreshProfile}
              onRegisteredFemale={(femaleUser) => {
                handleUpdateUserProfile(femaleUser);
              }}
            />
          </motion.div>
        ) : isFemalePendingOnboarding ? (
          /* Interactive Female Health & Cycle Onboarding Tour */
          <motion.div
            key="female-onboarding"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <FemaleOnboardingTour
              userProfile={userProfile}
              onComplete={handleOnboardingComplete}
              onSkip={() => {
                handleOnboardingComplete({
                  cycleRegularity: 'regular',
                  contraceptionIntent: 'not_in_relationship',
                  healthConditions: ['none'],
                  heightCm: 170,
                  weightKg: 70,
                  periodLength: 7,
                  cycleLength: 28,
                  lastPeriodStartDate: new Date().toISOString().slice(0, 10),
                  completedAt: new Date().toISOString()
                });
              }}
            />
          </motion.div>
        ) : !userProfile.coupleId && !skippedPairing ? (
          /* Pairing view (Logged in, but no couple connected yet and not skipped) */
          <motion.div
            key="pairing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AuthAndPairing 
              userProfile={userProfile} 
              loading={loading} 
              onRefreshProfile={handleRefreshProfile}
              onSkipPairing={handleSkipPairing}
            />
          </motion.div>
        ) : (
          /* Main App (Solo Mode with Top Banner OR Paired Mode) */
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen"
          >
            {/* Top Banner when Unpaired / Solo */}
            {!userProfile.coupleId && (
              <div className="sticky top-0 z-40 bg-[#FFF0F7] border-b border-[#F6C3E5] px-4 py-2.5 sm:py-3 shadow-xs" dir="rtl">
                <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-right">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#EC407A] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Key className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-[#1B1B1A] block">
                        حالت استفاده انفرادی فعال است
                      </span>
                      <p className="text-[11px] text-[#78746B] font-medium leading-tight">
                        برای اشتراک‌گذاری لحظات، آرزوها و چرخه سلامت با پارتنرتان، کد اتصال را ثبت کنید.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPairingModal(true)}
                    className="px-4 py-1.5 sm:py-2 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                  >
                    <span>وارد کردن کد پارتنر</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2] rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {/* Main Synchronized Dashboard */}
            <Dashboard 
              userProfile={userProfile} 
              onRefreshProfile={handleRefreshProfile} 
              onUpdateUserProfile={handleUpdateUserProfile}
              onOpenPairingModal={() => setShowPairingModal(true)}
            />

            {/* Interactive Pairing Modal when clicked from top banner */}
            <AnimatePresence>
              {showPairingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1B1A]/40 backdrop-blur-xs">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md relative"
                  >
                    <AuthAndPairing
                      userProfile={userProfile}
                      loading={loading}
                      onRefreshProfile={() => {
                        handleRefreshProfile();
                        setShowPairingModal(false);
                      }}
                      isPairingModal={true}
                      onCloseModal={() => setShowPairingModal(false)}
                      onSkipPairing={() => setShowPairingModal(false)}
                    />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
