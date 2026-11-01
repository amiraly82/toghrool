import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db } from "../firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import { Heart, Key, Mail, User, ShieldAlert, Sparkles, LogOut, Copy, Check } from "lucide-react";
import { UserProfile } from "../types";
import { fetchFromPhpApi } from "../apiClient";

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

  // Quick Demo Login Helper
  const handleDemoLogin = async (partnerNumber: 1 | 2) => {
    setAuthLoading(true);
    setError("");

    try {
      // 1. Try PHP API first (for cPanel MySQL hosting without Firebase dependency)
      const res = await fetchFromPhpApi('demoLogin', { partnerNumber });
      if (res && res.status === 'success' && res.user) {
        localStorage.setItem("custom_user_session", JSON.stringify({
          uid: res.user.uid,
          email: res.user.email,
          displayName: res.user.displayName
        }));
        localStorage.setItem("cached_user_profile", JSON.stringify(res.user));
        onRefreshProfile();
        setAuthLoading(false);
        return;
      }
    } catch (phpErr) {
      console.warn("PHP API demo login skipped/failed, falling back to Firestore/Local:", phpErr);
    }

    const demoEmail1 = "demo_partner1@wishlist.com";
    const demoEmail2 = "demo_partner2@wishlist.com";
    const demoPassword = "demo_password123";
    const uid1 = "demo_user_p1";
    const uid2 = "demo_user_p2";
    const coupleId = "couple_demo_user_p1_demo_user_p2";

    try {
      // Try setting up Firestore documents if accessible
      try {
        const user1Ref = doc(db, "users", uid1);
        const user1Snap = await getDoc(user1Ref);
        if (!user1Snap.exists()) {
          await setDoc(user1Ref, {
            uid: uid1, email: demoEmail1, displayName: "امیر", coupleCode: "AMIR01",
            partnerEmail: demoEmail2, partnerUid: uid2, coupleId: coupleId, passwordHash: demoPassword, isCustomUser: true
          });
        }

        const user2Ref = doc(db, "users", uid2);
        const user2Snap = await getDoc(user2Ref);
        if (!user2Snap.exists()) {
          await setDoc(user2Ref, {
            uid: uid2, email: demoEmail2, displayName: "سارا", coupleCode: "SARA02",
            partnerEmail: demoEmail1, partnerUid: uid1, coupleId: coupleId, passwordHash: demoPassword, isCustomUser: true
          });
        }
      } catch (fbErr) {
        console.warn("Firestore unreachable (offline mode), proceeding with local session", fbErr);
      }

      const targetUid = partnerNumber === 1 ? uid1 : uid2;
      const targetEmail = partnerNumber === 1 ? demoEmail1 : demoEmail2;
      const targetName = partnerNumber === 1 ? "امیر" : "سارا";

      const localProfile: UserProfile = {
        uid: targetUid,
        email: targetEmail,
        displayName: targetName,
        coupleCode: partnerNumber === 1 ? "AMIR01" : "SARA02",
        partnerEmail: partnerNumber === 1 ? demoEmail2 : demoEmail1,
        partnerUid: partnerNumber === 1 ? uid2 : uid1,
        coupleId: coupleId
      };

      localStorage.setItem("custom_user_session", JSON.stringify({
        uid: targetUid,
        email: targetEmail,
        displayName: targetName
      }));
      localStorage.setItem("cached_user_profile", JSON.stringify(localProfile));

      onRefreshProfile();
    } catch (err: any) {
      setError("خطا در ورود دمو: " + (err.message || "لطفاً اتصال خود را بررسی کنید"));
    } finally {
      setAuthLoading(false);
    }
  };

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

        // Firebase / Local Fallback
        const customUid = `user_${Math.random().toString(36).substr(2, 9)}`;
        const myCode = generateCoupleCode();
        const customProfile: UserProfile = {
          uid: customUid,
          email: emailLower,
          displayName: name,
          coupleCode: myCode,
          partnerEmail: null,
          partnerUid: null,
          coupleId: null,
          passwordHash: password,
          isCustomUser: true
        };

        try {
          await setDoc(doc(db, "users", customUid), customProfile);
        } catch (fbErr) {
          console.warn("Firestore unreachable on signup, proceeding with local profile", fbErr);
        }

        localStorage.setItem("custom_user_session", JSON.stringify({
          uid: customUid,
          email: emailLower,
          displayName: name
        }));
        localStorage.setItem("cached_user_profile", JSON.stringify(customProfile));
        onRefreshProfile();
      } else {
        // Sign In - Try PHP API first
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
        } else if (res && res.status === 'error' && res.message && !res.message.includes('HTTP error') && !res.message.includes('fetch')) {
          setError(res.message);
          setAuthLoading(false);
          return;
        }

        // Firestore Fallback
        try {
          const q = query(collection(db, "users"), where("email", "==", emailLower));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data() as UserProfile;

            if (userData.passwordHash && userData.passwordHash !== password) {
              setError("ایمیل یا رمز عبور اشتباه است.");
              setAuthLoading(false);
              return;
            }

            localStorage.setItem("custom_user_session", JSON.stringify({
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName,
              gender: userData.gender
            }));
            localStorage.setItem("cached_user_profile", JSON.stringify(userData));
            if (userData.gender) {
              localStorage.setItem(`impo_partner_role_${userData.uid}`, userData.gender);
            }
            onRefreshProfile();
            setAuthLoading(false);
            return;
          }
        } catch (fbErr) {
          console.warn("Firestore unreachable on login", fbErr);
        }

        setError("کاربری با این مشخصات یافت نشد.");
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
    if (!partnerCode || partnerCode.trim().length !== 6) {
      setError("لطفاً کد ۶ رقمی معتبر وارد کنید.");
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

      // Try PHP API pairing first
      const res = await fetchFromPhpApi('pairByCode', { myUid: userProfile.uid, code: targetCode });
      if (res && res.status === 'success' && res.coupleId) {
        const updatedProfile = {
          ...userProfile,
          coupleId: res.coupleId
        };
        localStorage.setItem("cached_user_profile", JSON.stringify(updatedProfile));
        onRefreshProfile();
        setPairingLoading(false);
        return;
      } else if (res && res.status === 'error' && res.message && !res.message.includes('HTTP error') && !res.message.includes('fetch')) {
        setError(res.message);
        setPairingLoading(false);
        return;
      }

      // Firebase pairing fallback
      try {
        const q = query(collection(db, "users"), where("coupleCode", "==", targetCode));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const partnerDoc = querySnapshot.docs[0];
          const partnerData = partnerDoc.data();
          const newCoupleId = `couple_${userProfile.uid}_${partnerData.uid}`;

          await setDoc(doc(db, "couples", newCoupleId), {
            id: newCoupleId,
            partner1Uid: userProfile.uid,
            partner1Email: userProfile.email || null,
            partner1Name: userProfile.displayName || "پارتنر ۱",
            partner2Uid: partnerData.uid,
            partner2Email: partnerData.email || null,
            partner2Name: partnerData.displayName || "پارتنر ۲",
            createdAt: new Date().toISOString()
          });

          await updateDoc(doc(db, "users", userProfile.uid), {
            partnerEmail: partnerData.email || null,
            partnerUid: partnerData.uid || null,
            coupleId: newCoupleId
          });

          await updateDoc(doc(db, "users", partnerData.uid), {
            partnerEmail: userProfile.email || null,
            partnerUid: userProfile.uid || null,
            coupleId: newCoupleId
          });
        }
      } catch (fbErr) {
        console.warn("Firestore unreachable on pairing", fbErr);
      }

      // Local fallback pairing
      const localCoupleId = `couple_${userProfile.uid}_paired`;
      const updatedProfile: UserProfile = {
        ...userProfile,
        coupleId: localCoupleId
      };
      localStorage.setItem("cached_user_profile", JSON.stringify(updatedProfile));
      onRefreshProfile();
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

              <div className="relative my-6 flex items-center justify-center">
                <div className="border-t border-white/60 w-full absolute" />
                <span className="bg-white/40 backdrop-blur-xl px-3 text-[10px] text-slate-500 font-bold z-10 border border-white/40 rounded-full">یا ورود با اکانت تستی دو نفره</span>
              </div>

              {/* Demo Multi-user Quick Entrance buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDemoLogin(1)}
                  disabled={authLoading}
                  className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 font-bold rounded-xl text-xs border border-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer backdrop-blur-md"
                >
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-heart" />
                  پارتنر ۱ (امیر)
                </button>
                <button
                  onClick={() => handleDemoLogin(2)}
                  disabled={authLoading}
                  className="py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer backdrop-blur-md"
                >
                  <Heart className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500 animate-heart" />
                  پارتنر ۲ (سارا)
                </button>
              </div>

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
                    localStorage.removeItem("custom_user_session");
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
