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
    <div className="min-h-screen bg-[#FAF6EC] text-[#1B1B1A] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-[#FFFDF8] border border-[#E8E2D4] rounded-[32px] p-7 sm:p-9 relative">
        {/* Editorial Minimalist Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#F6DC6B] flex items-center justify-center text-[#1B1B1A]">
              <Sparkles className="w-5 h-5 stroke-[1.7]" />
            </div>
            <div className="w-16 h-16 rounded-full bg-[#F6C3E5] flex items-center justify-center text-[#1B1B1A]">
              <Heart className="w-7 h-7 stroke-[1.7] animate-heart" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[#B8CEF4] flex items-center justify-center text-[#1B1B1A]">
              <Key className="w-5 h-5 stroke-[1.7]" />
            </div>
          </div>

          <span className="text-[11px] font-semibold text-[#78746B] tracking-wide">
            اپلیکیشن دونفره طغرل
          </span>
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#1B1B1A] mt-1 tracking-tight">
            رؤیاهای مشترک ما
          </h1>
          <p className="text-[#78746B] text-xs mt-1.5 text-center leading-relaxed max-w-xs">
            لیست آرزوها، خاطرات، سلامت و برنامه‌ریزی دونفره در فضایی آرام و اختصاصی
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!userProfile ? (
            /* Login & Sign Up view */
            <motion.div
              key="auth-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Mode Pill Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#EFECE2] rounded-full mb-6">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(""); }}
                  className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    !isSignUp ? "bg-[#1B1B1A] text-[#FAF6EC]" : "text-[#78746B] hover:text-[#1B1B1A]"
                  }`}
                >
                  ورود به حساب
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(""); }}
                  className={`py-2 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    isSignUp ? "bg-[#1B1B1A] text-[#FAF6EC]" : "text-[#78746B] hover:text-[#1B1B1A]"
                  }`}
                >
                  عضویت جدید
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-[#F6C3E5]/60 text-[#1B1B1A] rounded-2xl text-xs flex items-start gap-2.5 border border-[#E5ADD2]">
                    <ShieldAlert className="w-4 h-4 text-[#D94E4E] shrink-0 mt-0.5 stroke-[1.8]" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                {isSignUp && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1B1B1A] block mr-1">نام یا لقب شما</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثلاً امیر یا سارا"
                        className="w-full pl-4 pr-10 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-sm text-[#1B1B1A] placeholder:text-[#8E8A80] text-right font-medium outline-none transition-colors"
                        required
                      />
                      <User className="absolute right-3.5 top-3.5 w-4 h-4 text-[#78746B] stroke-[1.7]" />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1B1B1A] block mr-1">ایمیل</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pl-4 pr-10 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-sm text-[#1B1B1A] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                      dir="ltr"
                      required
                    />
                    <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#78746B] stroke-[1.7]" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1B1B1A] block mr-1">رمز عبور</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-10 py-3 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-sm text-[#1B1B1A] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                      dir="ltr"
                      required
                    />
                    <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-[#78746B] stroke-[1.7]" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 mt-2 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] font-bold rounded-full text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-[#FAF6EC] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? "ساخت حساب در طغرل" : "ورود به فضای مشترک"}</span>
                      <Sparkles className="w-4 h-4 stroke-[1.7]" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Pairing view (Logged in, but no coupleId yet) */
            <motion.div
              key="pairing-view"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Pastel Pink Assistant-Style Code Card */}
              <div className="bg-[#F6C3E5] p-5 rounded-[26px] relative overflow-hidden text-right">
                <svg
                  viewBox="0 0 100 100"
                  className="w-24 h-24 absolute -bottom-5 -left-3 text-[#E5ADD2] fill-current pointer-events-none rotate-[-12deg]"
                >
                  <path d="M50 88C50 88 12 63 12 36C12 21 24 12 36 12C44 12 50 18 50 23C50 18 56 12 64 12C76 12 88 21 88 36C88 63 50 88 50 88Z" />
                </svg>

                <span className="text-[11px] font-medium text-[#6B5364] block">
                  کد اختصاصی اتصال زوجین
                </span>
                <div className="flex items-center justify-between gap-2 mt-2.5 relative z-10">
                  <span className="font-mono text-2xl font-bold tracking-widest text-[#1B1B1A] select-all bg-[#FFFDF8] px-4 py-2 rounded-2xl border border-[#1B1B1A]/10">
                    {userProfile.coupleCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="px-4 py-2.5 bg-[#1B1B1A] text-[#FAF6EC] rounded-full text-xs font-bold flex items-center gap-1.5 hover:bg-[#2F2E2C] transition-colors cursor-pointer"
                    title="کپی کد"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#A7B86C]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.7]" />}
                    <span>{copied ? "کپی شد" : "کپی کد"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#4A3A45] mt-3 leading-relaxed relative z-10 font-medium">
                  این کد را برای پارتنرتان بفرستید یا کد او را در کادر زیر وارد کنید تا فضای مشترک شما فعال شود.
                </p>
              </div>

              <form onSubmit={handlePairingSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-[#F6C3E5]/60 text-[#1B1B1A] rounded-2xl text-xs flex items-start gap-2 border border-[#E5ADD2]">
                    <ShieldAlert className="w-4 h-4 text-[#D94E4E] shrink-0 mt-0.5 stroke-[1.8]" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1B1B1A] block mr-1">
                    کد زوج پارتنرتان را وارد کنید:
                  </label>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="ABCD1234"
                    className="w-full px-4 py-3.5 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-2xl font-mono text-center text-lg font-bold tracking-widest uppercase text-[#1B1B1A] outline-none transition-colors"
                    maxLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="w-full py-3.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] font-bold rounded-full text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {pairingLoading ? (
                    <div className="w-5 h-5 border-2 border-[#FAF6EC] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>اتصال به پارتنر</span>
                      <Heart className="w-4 h-4 stroke-[1.8]" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 border-t border-[#E8E2D4] flex items-center justify-between text-xs text-[#78746B]">
                <span className="font-medium">حساب فعال: <strong className="text-[#1B1B1A]">{userProfile.displayName}</strong></span>
                <button
                  onClick={async () => {
                    try {
                      await fetchFromPhpApi('logout');
                    } catch (e) {}
                    clearAuthSession();
                    await signOut(auth);
                    window.location.reload();
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] text-[#1B1B1A] flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[1.7]" />
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
