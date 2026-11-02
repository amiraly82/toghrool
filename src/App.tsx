import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./firebase";
import { UserProfile } from "./types";
import AuthAndPairing from "./components/AuthAndPairing";
import Dashboard from "./components/Dashboard";
import { Heart, RefreshCw } from "lucide-react";
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

  return (
    <div className="min-h-screen font-sans selection:bg-rose-100 selection:text-rose-900 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {loading ? (
          /* Pulse heart loader */
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-gradient-to-br from-rose-100 via-indigo-50 to-teal-50"
          >
            <div className="relative">
              <div className="w-20 h-20 bg-white/40 backdrop-blur-md rounded-3xl shadow-lg border border-white/60 flex items-center justify-center text-rose-500">
                <Heart className="w-10 h-10 fill-rose-500 animate-heart text-rose-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs text-white">
                ✨
              </div>
            </div>
            <p className="mt-4 text-xs font-black text-slate-600 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
              در حال لود کردن رؤیاهای مشترک...
            </p>
          </motion.div>
        ) : error ? (
          /* Error feedback page */
          <motion.div
            key="error"
            className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-rose-100 via-indigo-50 to-teal-50"
          >
            <div className="p-4 bg-red-500/10 rounded-full text-red-500 mb-4 border border-red-500/20 backdrop-blur-md">
              💔
            </div>
            <h3 className="text-lg font-bold text-slate-800">خطایی رخ داد</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-xs">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 py-2.5 px-6 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 cursor-pointer"
            >
              دوباره تلاش کنید
            </button>
          </motion.div>
        ) : !firebaseUser || !userProfile || !userProfile.coupleId ? (
          /* Authentication & Pairing flow */
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
            />
          </motion.div>
        ) : (
          /* Fully synchronized Shared Dashboard */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard 
              userProfile={userProfile} 
              onRefreshProfile={handleRefreshProfile} 
              onUpdateUserProfile={handleUpdateUserProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
