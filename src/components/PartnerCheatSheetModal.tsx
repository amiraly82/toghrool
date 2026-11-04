import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  Heart,
  Coffee,
  Shirt,
  Footprints,
  Flower2,
  UtensilsCrossed,
  Palette,
  ShieldAlert,
  Save,
  Check,
  Send,
  Sparkle,
  Gem,
  Smile
} from "lucide-react";
import { PartnerCheatSheet, UserProfile } from "../types";
import { fetchFromPhpApi } from "../apiClient";

interface PartnerCheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  partnerProfile: UserProfile | null;
  onCheatSheetUpdated: (updated: PartnerCheatSheet) => void;
  onSendPoke?: (message: string) => void;
}

const LOVE_LANGUAGES = [
  { id: "words", label: "کلمات تاییدبخش و محبت‌آمیز 💌" },
  { id: "quality_time", label: "وقت باکیفیت و دونفره ⏳" },
  { id: "receiving_gifts", label: "دریافت هدیه و سورپرایز 🎁" },
  { id: "acts_of_service", label: "کمک و توجه به نیازها 🤝" },
  { id: "physical_touch", label: "آغوش و لمس فیزیکی 🫂" }
];

export const PartnerCheatSheetModal: React.FC<PartnerCheatSheetModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  partnerProfile,
  onCheatSheetUpdated,
  onSendPoke
}) => {
  const [activeTab, setActiveTab] = useState<"view_partner" | "edit_mine">("view_partner");

  // Local state for editing user's own cheat sheet
  const [myCheatSheet, setMyCheatSheet] = useState<PartnerCheatSheet>(() => {
    return userProfile.cheatSheet || {};
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pokeSent, setPokeSent] = useState(false);

  if (!isOpen) return null;

  const partnerCheat = partnerProfile?.cheatSheet || null;
  const partnerName = partnerProfile?.displayName || "پارتنر";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...myCheatSheet,
        updatedAt: Date.now()
      };
      const res = await fetchFromPhpApi("updateCheatSheet", { cheatSheet: payload }, "POST");
      if (res && res.status === "success") {
        onCheatSheetUpdated(payload);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Error saving cheat sheet:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPartnerFill = () => {
    if (onSendPoke) {
      onSendPoke(`عزیزم، تقلب‌نامه شناختت رو در پروفایل پر کن تا بدونم چه چیزایی خوشحالت می‌کنه! 📝💖`);
      setPokeSent(true);
      setTimeout(() => setPokeSent(false), 3000);
    }
  };

  const hasPartnerData = partnerCheat && Object.values(partnerCheat).some((val) => typeof val === "string" && val.trim().length > 0);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#1B1B1A]/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 text-right"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFDF8] border-t sm:border border-[#E8E2D4] rounded-t-[32px] sm:rounded-[36px] w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#E8E2D4] flex items-center justify-between bg-[#FAF6EC]/70 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#F6C3E5] to-[#F9C6B8] flex items-center justify-center text-[#1B1B1A] shadow-xs">
                <Sparkles className="w-5 h-5 text-[#EC407A]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1B1B1A]">تقلب‌نامه شناخت پارتنر 📝✨</h3>
                <p className="text-[11px] text-[#78746B] font-medium">راهنمای اختصاصی علایق و جزییات برای غافلگیری‌های عاشقانه</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#EFECE2] hover:bg-[#E2DDD0] text-[#1B1B1A] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="p-3 bg-[#FAF6EC] border-b border-[#E8E2D4] flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("view_partner")}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "view_partner"
                  ? "bg-[#1B1B1A] text-[#FAF6EC] shadow-xs"
                  : "bg-white/70 hover:bg-white text-[#78746B] border border-[#E8E2D4]"
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${activeTab === "view_partner" ? "text-[#F6C3E5] fill-current" : ""}`} />
              <span>تقلب‌نامه {partnerName}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edit_mine")}
              className={`flex-1 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "edit_mine"
                  ? "bg-[#1B1B1A] text-[#FAF6EC] shadow-xs"
                  : "bg-white/70 hover:bg-white text-[#78746B] border border-[#E8E2D4]"
              }`}
            >
              <Sparkle className={`w-3.5 h-3.5 ${activeTab === "edit_mine" ? "text-[#F6DC6B]" : ""}`} />
              <span>مشخصات من برای پارتنرم</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === "view_partner" ? (
              <div>
                {!partnerProfile?.coupleId ? (
                  <div className="text-center py-10 px-4">
                    <Heart className="w-12 h-12 text-[#EC407A]/40 mx-auto mb-3" />
                    <p className="text-sm font-bold text-[#1B1B1A]">هنوز به پارتنرت متصل نشده‌ای</p>
                    <p className="text-xs text-[#78746B] mt-1">پس از ورود پارتنر با کد اختصاصی، تقلب‌نامه او اینجا نمایش داده می‌شود.</p>
                  </div>
                ) : !hasPartnerData ? (
                  <div className="text-center py-10 px-4 bg-[#FAF6EC]/60 border border-[#E8E2D4] rounded-3xl">
                    <div className="w-14 h-14 rounded-full bg-[#FFF0F7] text-[#EC407A] flex items-center justify-center mx-auto mb-3 border border-[#F8BBD0]">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-black text-[#1B1B1A]">تقلب‌نامه {partnerName} هنوز خالی است</h4>
                    <p className="text-xs text-[#78746B] mt-1.5 max-w-xs mx-auto leading-relaxed">
                      {partnerName} هنوز جزییات علایق خود (سایز، قهوه محبوب، گل مورد علاقه و...) را ثبت نکرده است.
                    </p>

                    <button
                      type="button"
                      onClick={handleRequestPartnerFill}
                      disabled={pokeSent}
                      className="mt-4 px-4 py-2.5 bg-gradient-to-r from-[#1B1B1A] to-[#323230] hover:opacity-95 text-[#FAF6EC] text-xs font-black rounded-2xl transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-[#F6C3E5]" />
                      <span>{pokeSent ? "یادآوری ارسال شد! 💌" : `درخواست تکمیل از ${partnerName}`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-3 flex items-center justify-between text-xs font-bold text-[#1B1B1A]">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-[#EC407A] fill-current" />
                        <span>راهنمای خوشحال کردن {partnerName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestPartnerFill}
                        className="text-[11px] text-[#EC407A] hover:underline cursor-pointer"
                      >
                        {pokeSent ? "ارسال شد! 💖" : "ارسال یادآوری به روزرسانی"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Clothing Size */}
                      {partnerCheat?.clothingSize && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Shirt className="w-4 h-4 text-[#EC407A]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">سایز لباس</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.clothingSize}</p>
                          </div>
                        </div>
                      )}

                      {/* Shoe Size */}
                      {partnerCheat?.shoeSize && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Footprints className="w-4 h-4 text-[#10B981]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">سایز کفش</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.shoeSize}</p>
                          </div>
                        </div>
                      )}

                      {/* Ring Size */}
                      {partnerCheat?.ringSize && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Gem className="w-4 h-4 text-[#8B5CF6]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">سایز انگشتر</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.ringSize}</p>
                          </div>
                        </div>
                      )}

                      {/* Favorite Drink */}
                      {partnerCheat?.favoriteDrink && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Coffee className="w-4 h-4 text-[#B45309]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">قهوه یا نوشیدنی محبوب</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.favoriteDrink}</p>
                          </div>
                        </div>
                      )}

                      {/* Favorite Flower */}
                      {partnerCheat?.favoriteFlower && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Flower2 className="w-4 h-4 text-[#F43F5E]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">گل مورد علاقه</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.favoriteFlower}</p>
                          </div>
                        </div>
                      )}

                      {/* Favorite Comfort Food */}
                      {partnerCheat?.favoriteFood && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <UtensilsCrossed className="w-4 h-4 text-[#EA580C]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">غذای آرامش‌بخش و محبوب</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.favoriteFood}</p>
                          </div>
                        </div>
                      )}

                      {/* Favorite Color */}
                      {partnerCheat?.favoriteColor && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Palette className="w-4 h-4 text-[#3B82F6]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">رنگ مورد علاقه</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.favoriteColor}</p>
                          </div>
                        </div>
                      )}

                      {/* Perfume Style */}
                      {partnerCheat?.perfumeStyle && (
                        <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3 flex items-start gap-2.5 shadow-2xs">
                          <div className="p-2 rounded-xl bg-[#FAF6EC] text-[#1B1B1A] shrink-0">
                            <Sparkle className="w-4 h-4 text-[#A855F7]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#78746B]">سبک رایحه و عطر</span>
                            <p className="text-xs font-black text-[#1B1B1A] mt-0.5">{partnerCheat.perfumeStyle}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Love Language */}
                    {partnerCheat?.loveLanguage && (
                      <div className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-3.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-[#78746B] flex items-center gap-1.5 mb-1">
                          <Heart className="w-3.5 h-3.5 text-[#EC407A]" />
                          <span>زبان عشق اصلی</span>
                        </span>
                        <p className="text-xs font-black text-[#1B1B1A]">
                          {LOVE_LANGUAGES.find((l) => l.id === partnerCheat.loveLanguage)?.label || partnerCheat.loveLanguage}
                        </p>
                      </div>
                    )}

                    {/* Allergies / Dislikes */}
                    {partnerCheat?.allergies && (
                      <div className="bg-[#FEF2F2] border border-[#FCA5A5]/60 rounded-2xl p-3.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-[#DC2626] flex items-center gap-1.5 mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>آلرژی‌ها، پرهیزها و خط قرمزهای غذایی</span>
                        </span>
                        <p className="text-xs font-black text-[#991B1B]">{partnerCheat.allergies}</p>
                      </div>
                    )}

                    {/* Little Fantasies / Small Joys */}
                    {partnerCheat?.littleFantasies && (
                      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl p-3.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-[#16A34A] flex items-center gap-1.5 mb-1">
                          <Smile className="w-3.5 h-3.5" />
                          <span>دلخوشی‌ها و فانتزی‌های کوچک</span>
                        </span>
                        <p className="text-xs font-semibold text-[#166534] leading-relaxed whitespace-pre-line">
                          {partnerCheat.littleFantasies}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Edit My Cheat Sheet Form */
              <form onSubmit={handleSave} className="space-y-4">
                <p className="text-xs text-[#78746B] leading-relaxed">
                  اطلاعات زیر به {partnerName} کمک می‌کند در خرید هدیه، سفارش خوراکی و قرارها شما را خوشحال‌تر کند.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">سایز لباس</label>
                    <input
                      type="text"
                      placeholder="مثلاً M / 38 / اورسایز"
                      value={myCheatSheet.clothingSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, clothingSize: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">سایز کفش</label>
                    <input
                      type="text"
                      placeholder="مثلاً 38 / 42"
                      value={myCheatSheet.shoeSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, shoeSize: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">سایز انگشتر</label>
                    <input
                      type="text"
                      placeholder="مثلاً 6 / 14 / باریک"
                      value={myCheatSheet.ringSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, ringSize: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">رنگ محبوب</label>
                    <input
                      type="text"
                      placeholder="مثلاً بنفش، سبز زیتونی، سرمه‌ای"
                      value={myCheatSheet.favoriteColor || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteColor: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">قهوه یا نوشیدنی محبوب</label>
                  <input
                    type="text"
                    placeholder="مثلاً آیس کارامل ماکیاتو با شیر بادام / چای بهارنارنج"
                    value={myCheatSheet.favoriteDrink || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteDrink: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">گل مورد علاقه</label>
                  <input
                    type="text"
                    placeholder="مثلاً پیونی، رز هلندی قرمز، آفتابگردان، ارکیده"
                    value={myCheatSheet.favoriteFlower || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteFlower: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">غذای محبوب یا آرامش‌بخش (Comfort Food)</label>
                  <input
                    type="text"
                    placeholder="مثلاً پیتزا سیر و استیک / قورمه‌سبزی / سوشی"
                    value={myCheatSheet.favoriteFood || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteFood: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">سبک رایحه و عطر محبوب</label>
                  <input
                    type="text"
                    placeholder="مثلاً گرم و وانیلی / خنک و مرکباتی / چوبی و تلخ"
                    value={myCheatSheet.perfumeStyle || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, perfumeStyle: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">زبان عشق اصلی شما</label>
                  <select
                    value={myCheatSheet.loveLanguage || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, loveLanguage: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  >
                    <option value="">انتخاب کنید...</option>
                    {LOVE_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">آلرژی‌ها، حساسیت‌ها و پرهیزها</label>
                  <input
                    type="text"
                    placeholder="مثلاً به باقلا، بادام‌زمینی، لاکتوز، فلفل تند"
                    value={myCheatSheet.allergies || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, allergies: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1B1B1A] mb-1">فانتزی‌ها و دلخوشی‌های کوچک</label>
                  <textarea
                    rows={2}
                    placeholder="مثلاً شب‌گردی با موزیک، صبحانه در تخت‌خواب، بوی کتاب نو، قدم زدن زیر بارون..."
                    value={myCheatSheet.littleFantasies || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, littleFantasies: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF6EC] border border-[#E8E2D4] rounded-xl text-xs font-semibold text-[#1B1B1A] focus:outline-none focus:border-[#1B1B1A] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] rounded-2xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-[#10B981]" />
                      <span>با موفقیت ذخیره شد! 🎉</span>
                    </>
                  ) : saving ? (
                    <span>در حال ذخیره...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#F6DC6B]" />
                      <span>ذخیره تقلب‌نامه من</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PartnerCheatSheetModal;
