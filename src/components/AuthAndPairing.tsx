import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { 
  Heart, Key, Mail, User, ShieldAlert, Sparkles, LogOut, Copy, Check, X, 
  ChevronLeft, ArrowRight, Lock, Send, CheckCircle2, ShieldCheck, Edit3, RefreshCw
} from "lucide-react";
import { UserProfile } from "../types";
import { fetchFromPhpApi, setAuthToken, clearAuthSession } from "../apiClient";
import { toPersianDigits } from "../utils/jalali";
import { NeoCoolHeartMascot, NeoSparkle } from "./NeoBrutalStickers";

interface AuthAndPairingProps {
  userProfile: UserProfile | null;
  loading: boolean;
  onRefreshProfile: () => void;
  onRegisteredFemale?: (user: UserProfile) => void;
  onSkipPairing?: () => void;
  isPairingModal?: boolean;
  onCloseModal?: () => void;
}

type AuthMode = 'login' | 'signup' | 'signup_otp' | 'forgot_request' | 'forgot_reset';

// Convert Persian digits to standard English digits
const normalizeDigits = (str: string): string => {
  const persianMap: { [key: string]: string } = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  return str.replace(/[۰-۹]/g, (w) => persianMap[w] || w);
};

export default function AuthAndPairing({ 
  userProfile, 
  loading, 
  onRefreshProfile, 
  onRegisteredFemale,
  onSkipPairing,
  isPairingModal = false,
  onCloseModal
}: AuthAndPairingProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState<'female' | 'male'>('female');
  
  // OTP & Password Reset fields
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  // Status feedback
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Pairing state
  const [partnerCode, setPartnerCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Reset transient form fields on authMode transition to prevent autofill or stale state
  useEffect(() => {
    if (authMode === 'forgot_reset') {
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
    } else if (authMode === 'signup_otp') {
      setOtpCode("");
    }
  }, [authMode]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${toPersianDigits(m.toString().padStart(2, '0'))}:${toPersianDigits(s.toString().padStart(2, '0'))}`;
  };

  // Helper to persist auth session
  const saveSessionAndProceed = (user: UserProfile, token?: string) => {
    if (token) {
      setAuthToken(token);
    }
    localStorage.setItem("custom_user_session", JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      gender: user.gender
    }));
    localStorage.setItem("cached_user_profile", JSON.stringify(user));
    if (user.gender) {
      localStorage.setItem(`impo_partner_role_${user.uid}`, user.gender);
    }

    if (user.gender === 'female' && onRegisteredFemale) {
      onRegisteredFemale(user);
    } else {
      onRefreshProfile();
    }
  };

  // 1. LOGIN SUBMIT
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("لطفاً ایمیل و رمز عبور را وارد کنید.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setInfoMessage("");
    const emailLower = email.toLowerCase().trim();

    try {
      const res = await fetchFromPhpApi('login', { email: emailLower, password });
      if (res && res.status === 'success' && res.user) {
        saveSessionAndProceed(res.user, res.token);
      } else {
        setError(res?.message || "ایمیل یا رمز عبور اشتباه است.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در ورود به حساب. لطفاً اتصال اینترنت خود را بررسی کنید.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 2. SIGNUP REQUEST (SEND OTP)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("لطفاً نام یا لقب خود را وارد کنید.");
      return;
    }
    if (!email.trim()) {
      setError("لطفاً آدرس ایمیل خود را وارد کنید.");
      return;
    }
    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setInfoMessage("");
    const emailLower = email.toLowerCase().trim();

    try {
      const res = await fetchFromPhpApi('send_signup_otp', {
        email: emailLower,
        password,
        displayName: name.trim(),
        gender
      });

      if (res && res.status === 'success') {
        setOtpSentEmail(emailLower);
        setOtpCode("");
        setOtpTimer(60);
        setAuthMode('signup_otp');
        setInfoMessage(res.message || `کد تایید ۵ رقمی به ایمیل ${emailLower} ارسال شد.`);
      } else {
        setError(res?.message || "خطا در ارسال کد تایید به ایمیل. لطفاً مجدداً امتحان کنید.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در برقراری ارتباط با سرور. لطفاً مجدداً امتحان کنید.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 3. VERIFY SIGNUP OTP & ACTIVATE ACCOUNT
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = normalizeDigits(otpCode.trim());
    if (cleanCode.length !== 5) {
      setError("لطفاً کد تایید ۵ رقمی را کامل وارد کنید.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await fetchFromPhpApi('verify_signup_otp', {
        email: otpSentEmail,
        otp_code: cleanCode
      });

      if (res && res.status === 'success' && res.user) {
        saveSessionAndProceed(res.user, res.token);
      } else {
        setError(res?.message || "کد تایید وارد شده نامعتبر یا منقضی شده است.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در تایید کد. لطفاً مجدداً تلاش کنید.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 4. FORGOT PASSWORD REQUEST (SEND OTP)
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("لطفاً ایمیل حساب کاربری خود را وارد کنید.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setInfoMessage("");
    const emailLower = email.toLowerCase().trim();

    try {
      const res = await fetchFromPhpApi('send_forgot_otp', { email: emailLower });
      if (res && res.status === 'success') {
        setOtpSentEmail(emailLower);
        setOtpCode("");
        setNewPassword("");
        setConfirmPassword("");
        setOtpTimer(60);
        setAuthMode('forgot_reset');
        setInfoMessage(res.message || `کد بازیابی به ایمیل ${emailLower} ارسال شد.`);
      } else {
        setError(res?.message || "کاربری با این ایمیل یافت نشد.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در ارسال ایمیل بازیابی. لطفاً مجدداً امتحان کنید.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. RESET PASSWORD WITH OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = normalizeDigits(otpCode.trim());
    if (cleanCode.length !== 5) {
      setError("لطفاً کد بازیابی ۵ رقمی را کامل وارد کنید.");
      return;
    }
    if (newPassword.length < 6) {
      setError("رمز عبور جدید باید حداقل ۶ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تکرار رمز عبور با رمز عبور جدید همخوانی ندارد.");
      return;
    }

    setAuthLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await fetchFromPhpApi('reset_password_with_otp', {
        email: otpSentEmail,
        otp_code: cleanCode,
        newPassword
      });

      if (res && res.status === 'success' && res.user) {
        saveSessionAndProceed(res.user, res.token);
      } else {
        setError(res?.message || "کد تایید اشتباه یا منقضی شده است.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطا در تغییر رمز عبور. لطفاً مجدداً امتحان کنید.");
    } finally {
      setAuthLoading(false);
    }
  };

  // 6. RESEND OTP CODE
  const handleResendCode = async () => {
    if (otpTimer > 0 || resendLoading) return;
    setResendLoading(true);
    setError("");
    setInfoMessage("");

    try {
      if (authMode === 'signup_otp') {
        const res = await fetchFromPhpApi('send_signup_otp', {
          email: otpSentEmail,
          password,
          displayName: name.trim(),
          gender
        });
        if (res && res.status === 'success') {
          setOtpTimer(60);
          setInfoMessage("کد تایید جدید به ایمیل شما ارسال شد.");
        } else {
          setError(res?.message || "خطا در ارسال مجدد کد.");
        }
      } else if (authMode === 'forgot_reset') {
        const res = await fetchFromPhpApi('send_forgot_otp', { email: otpSentEmail });
        if (res && res.status === 'success') {
          setOtpTimer(60);
          setInfoMessage("کد بازیابی جدید به ایمیل شما ارسال شد.");
        } else {
          setError(res?.message || "خطا در ارسال مجدد کد.");
        }
      }
    } catch (e) {
      setError("خطا در ارسال مجدد کد تایید.");
    } finally {
      setResendLoading(false);
    }
  };

  // 7. PAIRING LOGIC
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

      const res = await fetchFromPhpApi('pairByCode', { code: targetCode });
      if (res && res.status === 'success' && res.coupleId) {
        const updatedProfile = {
          ...userProfile,
          coupleId: res.coupleId
        };
        localStorage.setItem("cached_user_profile", JSON.stringify(updatedProfile));
        onRefreshProfile();
      } else {
        setError(res?.message || "کد نامعتبر است یا پارتنر پیدا نشد.");
      }
    } catch (err: any) {
      console.error(err);
      setError("خطایی در اتصال رخ داد: " + err.message);
    } finally {
      setPairingLoading(false);
    }
  };

  const copyCode = () => {
    if (userProfile?.coupleCode) {
      navigator.clipboard.writeText(userProfile.coupleCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`w-full flex items-center justify-center ${isPairingModal ? "p-0" : "min-h-screen p-4 bg-[#EBA2F8]"}`} dir="rtl">
      <div className="w-full max-w-md bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] p-5 sm:p-7 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] relative">
        {isPairingModal && onCloseModal && (
          <button
            type="button"
            onClick={onCloseModal}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] cursor-pointer active:translate-y-0.5"
            title="بستن"
          >
            <X className="w-4 h-4 stroke-[1.9]" />
          </button>
        )}

        {/* Neobrutalist Mascot Brand Header (Screen 3 Style) */}
        <div className="flex flex-col items-center mb-5 relative">
          <NeoSparkle className="w-6 h-6 absolute top-1 right-6" fill="#FFFFFF" />
          <NeoSparkle className="w-5 h-5 absolute top-8 left-8" fill="#FFFF66" />
          <div className="mb-1">
            <NeoCoolHeartMascot className="w-28 h-28" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] tracking-tight">
            طغرل · فضای دونفره ما
          </h1>
          <p className="text-[#1C1C1C]/80 font-medium text-xs mt-1 text-center leading-relaxed max-w-xs">
            آرزوها، سلامت، خاطرات و برنامه‌ریزی مشترک در یک جای باحال!
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!userProfile ? (
            <motion.div
              key={authMode}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* Neobrutalist Pill Mode Switcher (White & Mint Green with 2px Black Border) */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(""); setInfoMessage(""); }}
                    className={`py-2.5 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5 ${
                      authMode === 'login' ? "bg-[#5ED46A] text-[#1C1C1C]" : "bg-white text-[#1C1C1C]"
                    }`}
                  >
                    ورود به حساب
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(""); setInfoMessage(""); }}
                    className={`py-2.5 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer active:translate-y-0.5 ${
                      authMode === 'signup' ? "bg-[#5ED46A] text-[#1C1C1C]" : "bg-white text-[#1C1C1C]"
                    }`}
                  >
                    عضویت جدید
                  </button>
                </div>
              )}

              {/* Feedback Alerts */}
              {error && (
                <div className="mb-4 p-3.5 bg-[#F29B47] text-[#1C1C1C] rounded-2xl text-xs flex items-start gap-2.5 border-[1.5px] border-[#1C1C1C]">
                  <ShieldAlert className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5 stroke-[1.9]" />
                  <span className="font-bold leading-relaxed">{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3.5 bg-[#5ED46A] text-[#1C1C1C] rounded-2xl text-xs flex items-start gap-2.5 border-[1.5px] border-[#1C1C1C]">
                  <CheckCircle2 className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5 stroke-[1.9]" />
                  <span className="font-bold leading-relaxed">{infoMessage}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* VIEW 1: LOGIN */}
              {/* ========================================================= */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1C1C] block mr-1">ایمیل</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-4 pr-10 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#6E6B66] text-left font-mono font-medium outline-none transition-all"
                        dir="ltr"
                        required
                      />
                      <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#1C1C1C] block mr-1">رمز عبور</label>
                    <div className="relative">
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-10 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#6E6B66] text-left font-mono font-medium outline-none transition-all"
                        dir="ltr"
                        required
                      />
                      <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                    </div>
                  </div>

                  {/* Prominent Forgot Password Link right under password */}
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot_request');
                        setError("");
                        setInfoMessage("");
                        if (email) setOtpSentEmail(email.toLowerCase().trim());
                      }}
                      className="text-xs font-bold text-[#1C1C1C] hover:underline transition-colors cursor-pointer flex items-center gap-1.5 py-1"
                    >
                      <Lock className="w-3.5 h-3.5 text-[#1C1C1C] stroke-[1.9]" />
                      <span>رمز عبور خود را فراموش کرده‌اید؟ بازیابی رمز</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>ورود به فضای مشترک</span>
                        <Sparkles className="w-4 h-4 text-[#FFFF66] stroke-[1.9]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ========================================================= */}
              {/* VIEW 2: SIGN UP */}
              {/* ========================================================= */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Gender Selection Cards */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">
                      جنسیت شما
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                          gender === 'female'
                            ? 'bg-[#FFF0F7] border-[#EC407A] text-[#1C1C1C] shadow-xs ring-1 ring-[#EC407A]'
                            : 'bg-[#E9E7E1]/70 border-transparent text-[#6E6B66] hover:bg-[#E9E7E1]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            gender === 'female' ? 'bg-[#EC407A] text-white shadow-xs' : 'bg-[#E9E7E1] text-[#6E6B66]'
                          }`}>
                            <Sparkles className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[#1C1C1C]">خانم</div>
                            <div className="text-[10px] text-[#6E6B66]">پریود ترکر و سلامت</div>
                          </div>
                        </div>
                        {gender === 'female' && (
                          <div className="w-4 h-4 rounded-full bg-[#EC407A] text-white flex items-center justify-center text-[10px] font-medium">
                            ✓
                          </div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                          gender === 'male'
                            ? 'bg-[#F2F4F7] border-[#1C1C1C] text-[#1C1C1C] shadow-xs ring-1 ring-[#1C1C1C]'
                            : 'bg-[#E9E7E1]/70 border-transparent text-[#6E6B66] hover:bg-[#E9E7E1]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                            gender === 'male' ? 'bg-[#1C1C1C] text-white shadow-xs' : 'bg-[#E9E7E1] text-[#6E6B66]'
                          }`}>
                            <User className="w-4 h-4 stroke-[2]" />
                          </div>
                          <div>
                            <div className="text-xs font-medium text-[#1C1C1C]">آقا</div>
                            <div className="text-[10px] text-[#6E6B66]">همراهی و مراقبت</div>
                          </div>
                        </div>
                        {gender === 'male' && (
                          <div className="w-4 h-4 rounded-full bg-[#1C1C1C] text-white flex items-center justify-center text-[10px] font-medium">
                            ✓
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">نام یا لقب شما</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="مثلاً امیر یا سارا"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-right font-medium outline-none transition-colors"
                        required
                      />
                      <User className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">ایمیل معتبر</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                        dir="ltr"
                        required
                      />
                      <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                    <span className="text-[10px] text-[#6E6B66] pr-1 block">
                      کد تایید ۵ رقمی به این آدرس ایمیل ارسال خواهد شد.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">رمز عبور (حداقل ۶ کاراکتر)</label>
                    <div className="relative">
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                        dir="ltr"
                        required
                      />
                      <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-[#F6F4F0] font-medium rounded-full text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-[1.5px] border-[#F6F4F0] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>دریافت کد تایید ایمیل</span>
                        <Send className="w-4 h-4 stroke-[1.8]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ========================================================= */}
              {/* VIEW 3: SIGNUP OTP VERIFICATION */}
              {/* ========================================================= */}
              {authMode === 'signup_otp' && (
                <form onSubmit={handleVerifySignupOtp} className="space-y-4" autoComplete="off">
                  {/* Trap fields to absorb aggressive browser autofill */}
                  <div style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }} aria-hidden="true">
                    <input type="text" name="fake_username_trap" tabIndex={-1} autoComplete="off" />
                    <input type="password" name="fake_password_trap" tabIndex={-1} autoComplete="off" />
                  </div>

                  <div className="p-4 bg-[#F6F4F0] border border-[#E8E2D4] rounded-2xl text-right space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#1C1C1C] flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-[#EC407A]" />
                        <span>ارسال کد به ایمیل:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setAuthMode('signup'); setError(""); }}
                        className="text-[11px] font-medium text-[#EC407A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>تغییر ایمیل</span>
                      </button>
                    </div>
                    <p className="text-xs font-mono font-medium text-[#1C1C1C] dir-ltr text-right truncate">
                      {otpSentEmail}
                    </p>
                    <p className="text-[11px] text-[#6E6B66] leading-relaxed">
                      لطفاً صندوق ورودی (Inbox) یا پوشه هرزنامه (Spam) ایمیل خود را بررسی کنید و کد ۵ رقمی را در کادر زیر وارد کنید.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1 text-center">
                      کد تایید ۵ رقمی را وارد کنید:
                    </label>
                    <input
                      type="text"
                      name="token_otp_signup"
                      id="token_otp_signup"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
                      placeholder="• • • • •"
                      className="w-full py-3.5 bg-[#E9E7E1] focus:bg-[#FFFFFF] border-[1.5px] border-dashed border-[#C5BDAA] focus:border-[#1C1C1C] rounded-2xl text-center font-mono text-2xl font-bold tracking-[12px] text-[#1C1C1C] outline-none transition-all placeholder:tracking-normal"
                      maxLength={5}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    {otpTimer > 0 ? (
                      <span className="text-[#6E6B66] font-medium">
                        امکان ارسال مجدد تا: <strong className="text-[#1C1C1C] font-mono">{formatTimer(otpTimer)}</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendLoading}
                        className="text-[#EC407A] hover:text-[#D81B60] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {resendLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>ارسال مجدد کد تایید</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || otpCode.trim().length !== 5}
                    className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-[#F6F4F0] font-medium rounded-full text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-[1.5px] border-[#F6F4F0] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>تایید و ساخت حساب کاربری</span>
                        <CheckCircle2 className="w-4 h-4 text-[#A7B86C] stroke-[2]" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ========================================================= */}
              {/* VIEW 4: FORGOT PASSWORD REQUEST */}
              {/* ========================================================= */}
              {authMode === 'forgot_request' && (
                <form onSubmit={handleForgotRequest} className="space-y-4">
                  <div className="p-4 bg-[#F6F4F0] border border-[#E8E2D4] rounded-2xl text-right space-y-1">
                    <h3 className="text-xs font-black text-[#1C1C1C] flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-[#EC407A]" />
                      <span>بازیابی رمز عبور</span>
                    </h3>
                    <p className="text-[11px] text-[#6E6B66] leading-relaxed">
                      آدرس ایمیلی را که با آن در طغرل ثبت‌نام کرده‌اید وارد کنید تا کد بازیابی ۵ رقمی برایتان ایمیل شود.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">ایمیل حساب شما</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                        dir="ltr"
                        autoFocus
                        required
                      />
                      <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-[#F6F4F0] font-medium rounded-full text-sm transition-colors active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-[1.5px] border-[#F6F4F0] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>ارسال کد بازیابی به ایمیل</span>
                        <Send className="w-4 h-4 stroke-[1.8]" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(""); setInfoMessage(""); }}
                    className="w-full py-2.5 text-xs font-medium text-[#6E6B66] hover:text-[#1C1C1C] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>بازگشت به صفحه ورود</span>
                    <ChevronLeft className="w-4 h-4 stroke-[2]" />
                  </button>
                </form>
              )}

              {/* ========================================================= */}
              {/* VIEW 5: FORGOT PASSWORD RESET */}
              {/* ========================================================= */}
              {authMode === 'forgot_reset' && (
                <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
                  {/* Trap fields to absorb aggressive browser credential autofill */}
                  <div style={{ display: "none", opacity: 0, position: "absolute", left: "-9999px" }} aria-hidden="true">
                    <input type="text" name="fake_username_trap" tabIndex={-1} autoComplete="off" />
                    <input type="password" name="fake_password_trap" tabIndex={-1} autoComplete="off" />
                  </div>

                  <div className="p-4 bg-[#F6F4F0] border border-[#E8E2D4] rounded-2xl text-right space-y-1">
                    <h3 className="text-xs font-black text-[#1C1C1C] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#A7B86C]" />
                      <span>تنظیم رمز عبور جدید</span>
                    </h3>
                    <p className="text-[11px] text-[#6E6B66] leading-relaxed">
                      کد ۵ رقمی ارسالی به ایمیل <strong className="text-[#1C1C1C]">{otpSentEmail}</strong> را همراه با رمز عبور جدید وارد کنید.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1 text-center">
                      کد بازیابی ۵ رقمی:
                    </label>
                    <input
                      type="text"
                      name="token_otp_recovery"
                      id="token_otp_recovery"
                      autoComplete="one-time-code"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={otpCode}
                      onChange={(e) => setOtpCode(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 5))}
                      placeholder="• • • • •"
                      className="w-full py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border-[1.5px] border-dashed border-[#C5BDAA] focus:border-[#1C1C1C] rounded-2xl text-center font-mono text-2xl font-bold tracking-[12px] text-[#1C1C1C] outline-none transition-all placeholder:tracking-normal"
                      maxLength={5}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs px-1">
                    {otpTimer > 0 ? (
                      <span className="text-[#6E6B66] font-medium">
                        امکان ارسال مجدد: <strong className="text-[#1C1C1C] font-mono">{formatTimer(otpTimer)}</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendLoading}
                        className="text-[#EC407A] hover:text-[#D81B60] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {resendLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>ارسال مجدد کد بازیابی</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
                    <div className="relative">
                      <input
                        type="password"
                        name="new_user_secret_password"
                        id="new_user_secret_password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                        dir="ltr"
                        required
                      />
                      <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#1C1C1C] block mr-1">تکرار رمز عبور جدید</label>
                    <div className="relative">
                      <input
                        type="password"
                        name="confirm_user_secret_password"
                        id="confirm_user_secret_password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-4 pr-10 py-3 bg-[#E9E7E1] focus:bg-[#FFFFFF] border border-transparent focus:border-[#1C1C1C] rounded-2xl text-sm text-[#1C1C1C] placeholder:text-[#8E8A80] text-left font-mono outline-none transition-colors"
                        dir="ltr"
                        required
                      />
                      <Lock className="absolute right-3.5 top-3.5 w-4 h-4 text-[#6E6B66] stroke-[1.7]" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || otpCode.trim().length !== 5 || newPassword.length < 6}
                    className="w-full py-3.5 mt-2 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-[#F6F4F0] font-medium rounded-full text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {authLoading ? (
                      <div className="w-5 h-5 border-[1.5px] border-[#F6F4F0] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>ذخیره رمز جدید و ورود</span>
                        <CheckCircle2 className="w-4 h-4 text-[#A7B86C] stroke-[2]" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(""); setInfoMessage(""); }}
                    className="w-full py-2 text-xs font-medium text-[#6E6B66] hover:text-[#1C1C1C] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>انصراف و بازگشت به ورود</span>
                  </button>
                </form>
              )}
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
              {/* Pastel Pink Neobrutalist Code Card */}
              <div className="bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] p-5 rounded-[24px] relative overflow-hidden text-right">
                <span className="text-xs font-bold text-[#1C1C1C] block">
                  کد اختصاصی اتصال زوجین
                </span>
                <div className="flex items-center justify-between gap-2 mt-2.5 relative z-10">
                  <span className="font-mono text-2xl font-bold tracking-widest text-[#1C1C1C] select-all bg-white px-4 py-2 rounded-2xl border-[1.5px] border-[#1C1C1C]">
                    {userProfile.coupleCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="px-4 py-2.5 bg-[#5ED46A] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer active:translate-y-0.5"
                    title="کپی کد"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 stroke-[1.9]" /> : <Copy className="w-3.5 h-3.5 stroke-[1.9]" />}
                    <span>{copied ? "کپی شد" : "کپی کد"}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#1C1C1C] mt-3 leading-relaxed relative z-10 font-medium">
                  این کد را برای پارتنرتان بفرستید یا کد او را در کادر زیر وارد کنید تا فضای مشترک شما فعال شود.
                </p>
              </div>

              <form onSubmit={handlePairingSubmit} className="space-y-4">
                {error && (
                  <div className="p-3.5 bg-[#F29B47] text-[#1C1C1C] rounded-2xl text-xs flex items-start gap-2 border-[1.5px] border-[#1C1C1C]">
                    <ShieldAlert className="w-4 h-4 text-[#1C1C1C] shrink-0 mt-0.5 stroke-[1.9]" />
                    <span className="font-bold">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C1C1C] block mr-1">
                    کد زوج پارتنرتان را وارد کنید:
                  </label>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    placeholder="LV92K4"
                    className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl font-mono text-center text-lg font-bold tracking-widest uppercase text-[#1C1C1C] placeholder:text-[#6E6B66] outline-none"
                    maxLength={8}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] font-bold rounded-full text-sm transition-all active:translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {pairingLoading ? (
                    <div className="w-5 h-5 border-[1.5px] border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>اتصال به پارتنر</span>
                      <Heart className="w-4 h-4 text-[#EBA2F8] fill-current stroke-[2]" />
                    </>
                  )}
                </button>

                {onSkipPairing && (
                  <button
                    type="button"
                    onClick={onSkipPairing}
                    className="w-full py-3 px-4 bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] font-bold rounded-full text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:translate-y-0.5"
                  >
                    <span>فعلاً بدون پارتنر ادامه می‌دهم (رد کردن)</span>
                    <ChevronLeft className="w-4 h-4 stroke-[1.9]" />
                  </button>
                )}
              </form>

              <div className="pt-4 border-t border-[#E8E2D4] flex items-center justify-between text-xs text-[#6E6B66]">
                <span className="font-medium">حساب فعال: <strong className="text-[#1C1C1C]">{userProfile.displayName}</strong></span>
                <button
                  onClick={async () => {
                    try {
                      await fetchFromPhpApi('logout');
                    } catch (e) {}
                    clearAuthSession();
                    await signOut(auth);
                    window.location.reload();
                  }}
                  className="px-3.5 py-1.5 rounded-full border border-dashed border-[#A6A297] hover:border-[#1C1C1C] text-[#1C1C1C] flex items-center gap-1.5 font-medium cursor-pointer transition-colors"
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
