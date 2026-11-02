import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "firebase/auth";
import { Heart, Key, Mail, User, ShieldAlert, Sparkles, LogOut, Copy, Check } from "lucide-react";
import { UserProfile } from "../types";
import { fetchFromPhpApi, clearAuthSession } from "../apiClient";

// Generates a random 6-character uppercase couple code
const generateCoupleCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface AuthAndPairingProps {
  userProfile: UserProfile | null;
  loading: boolean;
  onRefreshProfile: () => void;
}

export default function AuthAndPairing({ userProfile, loading, onRefreshProfile }: AuthAndPairingProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError("لطفاً همه فیلدها را پر کنید.");
      return;
    }

    setAuthLoading(true);
    setError("");
    const emailLower = email.toLowerCase().trim();

    try {
      if (isSignUp) {
        // Try PHP API registration
        const res = await fetchFromPhpApi('register', { 
          email: emailLower, 
          password, 
          displayName: name
        });
        if (res && res.status === 'success' && res.user) {
          localStorage.setItem("custom_user_session", JSON.stringify({
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName,
            gender: res.user.gender
          }));
          localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
          if (res.user.gender) {
            localStorage.setItem(`impo_partner_role_${res.user.uid}`, res.user.gender);
          }
          onRefreshProfile();
          setAuthLoading(false);
          return;
        } else if (res && res.status === 'error' && res.message && !res.message.includes('HTTP error') && !res.message.includes('fetch')) {
          setError(res.message);
          setAuthLoading(false);
          return;
        }

        setError(res?.message || "خطا در ثبت‌نام. لطفاً مجدداً امتحان کنید.");
        setAuthLoading(false);
        return;
      } else {
        // Sign In - PHP API (single source of truth)
        const res = await fetchFromPhpApi('login', { email: emailLower, password });
        if (res && res.status === 'success' && res.user) {
          localStorage.setItem("custom_user_session", JSON.stringify({
            uid: res.user.uid,
            email: res.user.email,
            displayName: res.user.displayName,
            gender: res.user.gender
          }));
          localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
          if (res.user.gender) {
            localStorage.setItem(`impo_partner_role_${res.user.uid}`, res.user.gender);
          }
          onRefreshProfile();
          setAuthLoading(false);
          return;
        } else {
          setError(res?.message || "ایمیل یا رمز عبور اشتباه است.");
          setAuthLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("خطایی در ورود/ثبت‌نام رخ داد: " + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePairingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerCode || (partnerCode.trim().length !== 6 && partnerCode.trim().length !== 8)) {
      setError("کد اتصال باید ۶ یا ۸ کاراکتر باشد.");
      return;
    }

    setPairingLoading(true);
    setError("");

    try {
      if (!userProfile) return;
      const targetCode = partnerCode.trim().toUpperCase();

      if (targetCode === userProfile.coupleCode) {
        setError("شما نمی‌توانید به خودتان متصل شوید!");
        setPairingLoading(false);
        return;
      }

      // PHP API pairing (single source of truth)
      const res = await fetchFromPhpApi('pairByCode', { code: targetCode });
      if (res && res.status === 'success' && res.coupleId) {
        const updatedProfile = {
          ...userProfile,
          coupleId: res.coupleId
        };
        localStorage.setItem("cached_user_profile", JSON.stringify(updatedProfile));
        onRefreshProfile();
        setPairingLoading(false);
        return;
      } else {
        setError(res?.message || "کد زوجین یافت نشد.");
        setPairingLoading(false);
        return;
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در ایجاد اتصال زوجین: " + err.message);
    } finally {
      setPairingLoading(false);
    }
  };

  const copyCode = () => {
    if (!userProfile) return;
    navigator.clipboard.writeText(userProfile.coupleCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Rings & Ambient Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-rose-200 to-indigo-100 opacity-60 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-teal-100 to-rose-100 opacity-60 blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 z-10 relative">
        {/* Heart Mascot / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 bg-white/60 backdrop-blur-md rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-white/60">
              <Heart className="w-8 h-8 fill-rose-500 animate-heart" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-white shadow-sm">
              ✨
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-800 mt-4 tracking-tight font-sans">
            رؤیاهای مشترک ما
          </h1>
          <p className="text-slate-500 text-xs mt-1 text-center leading-relaxed">
            لیست‌های آرزوی مشترک، سینما، کتاب، خریدها، سفرها و تالار افتخارات دونفره با تم شیشه‌ای
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!userProfile ? (
            /* Login & Sign Up view */
            <motion.div
              key="auth-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 text-red-700 rounded-xl text-xs flex items-start gap-2 border border-red-500/20 backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {isSignUp && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block mr-1">نام یا لقب شما</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="مثلاً امیر یا سارا"
                          className="w-full pl-3 pr-10 py-2.5 glass-input rounded-xl text-sm text-right font-medium"
                          required
                        />
                        <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block mr-1">ایمیل</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-3 pr-10 py-2.5 glass-input rounded-xl text-sm text-left font-mono"
                      dir="ltr"
                      required
                    />
                    <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block mr-1">رمز عبور</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-10 py-2.5 glass-input rounded-xl text-sm text-left font-mono"
                      dir="ltr"
                      required
                    />
                    <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? "ثبت‌نام و عضویت" : "ورود به حساب زوج"}</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-bold cursor-pointer"
                >
                  {isSignUp ? "قبلاً ثبت‌نام کرده‌اید؟ اینجا وارد شوید" : "حساب کاربری ندارید؟ اینجا ثبت‌نام کنید"}
                </button>
              </div>
            </motion.div>
          ) : (
            /* Pairing view (Logged in, but no coupleId yet) */
            <motion.div
              key="pairing-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 text-center">
                <p className="text-xs text-rose-600 font-bold mb-1">کد زوج اختصاصی شما:</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="font-mono text-2xl font-bold tracking-widest text-rose-700 select-all bg-white/80 px-4 py-1.5 rounded-xl border border-white/80 shadow-sm">
                    {userProfile.coupleCode}
                  </span>
                  <button 
                    onClick={copyCode}
                    className="p-2 bg-white/80 rounded-xl border border-white/80 hover:bg-rose-50 text-rose-600 transition-all cursor-pointer shadow-sm"
                    title="کپی کد"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  این کد را برای همسرتان یا پارتنرتان بفرستید تا با وارد کردن آن در بخش زیر به هم متصل شوید.
                </p>
              </div>

              <div className="border-t border-white/60 my-4" />

              <form onSubmit={handlePairingSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 text-red-700 rounded-xl text-xs flex items-start gap-2 border border-red-500/20 backdrop-blur-md">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block mr-1">
                    کد زوج پارتنرتان را وارد کنید:
                  </label>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="ABCXYZ"
                    className="w-full px-4 py-3 glass-input rounded-xl font-mono text-center text-lg font-bold tracking-widest uppercase"
                    maxLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold rounded-xl text-sm shadow-md shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {pairingLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>اتصال به پارتنر و شروع همگام‌سازی</span>
                      <Heart className="w-4 h-4 fill-white" />
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-white/60 my-4" />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>وارد شده با: {userProfile.displayName}</span>
                <button
                  onClick={async () => {
                    try {
                      await fetchFromPhpApi('logout');
                    } catch (e) {}
                    clearAuthSession();
                    await signOut(auth);
                    window.location.reload();
                  }}
                  className="text-red-500 hover:text-red-600 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
