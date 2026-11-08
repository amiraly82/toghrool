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

  const hasPartnerData =
    partnerCheat &&
    Object.values(partnerCheat).some((val) => typeof val === "string" && val.trim().length > 0);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 z-50 text-right"
        dir="rtl"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#F6F4F0] border-t-[1.5px] sm:border-[1.5px] border-[#1C1C1C] rounded-t-[28px] sm:rounded-[28px] w-full max-w-lg max-h-[90vh] flex flex-col shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 border-b-[1.5px] border-[#1C1C1C]/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                <Sparkles className="w-5 h-5 stroke-[1.9]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#1C1C1C]">تقلب‌نامه شناخت پارتنر 📝✨</h3>
                <p className="text-[11px] text-[#1C1C1C]/80 font-bold">راهنمای اختصاصی علایق و جزییات برای غافلگیری‌های عاشقانه</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center transition-transform active:translate-y-0.5 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.9]" />
            </button>
          </div>

          {/* Mode Switcher Tabs (Screen 3 Pill Switcher: Mint Green active, White inactive) */}
          <div className="px-5 pt-3.5 pb-2 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("view_partner")}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "view_partner"
                  ? "bg-[#5ED46A] text-[#1C1C1C]"
                  : "bg-white text-[#1C1C1C]"
              }`}
            >
              <Heart className="w-3.5 h-3.5 stroke-[1.9]" />
              <span>تقلب‌نامه {partnerName}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edit_mine")}
              className={`flex-1 py-2.5 rounded-full text-xs font-bold border-[1.5px] border-[#1C1C1C] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "edit_mine"
                  ? "bg-[#5ED46A] text-[#1C1C1C]"
                  : "bg-white text-[#1C1C1C]"
              }`}
            >
              <Sparkle className="w-3.5 h-3.5 stroke-[1.9]" />
              <span>مشخصات من برای پارتنرم</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-5 overflow-y-auto flex-1 space-y-4">
            {activeTab === "view_partner" ? (
              <div>
                {!partnerProfile?.coupleId ? (
                  <div className="text-center py-10 px-4 bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px]">
                    <Heart className="w-12 h-12 text-[#1C1C1C] mx-auto mb-3 stroke-[1.9]" />
                    <p className="text-sm font-bold text-[#1C1C1C]">هنوز به پارتنرت متصل نشده‌ای</p>
                    <p className="text-xs text-[#1C1C1C]/75 font-medium mt-1">پس از ورود پارتنر با کد اختصاصی، تقلب‌نامه او اینجا نمایش داده می‌شود.</p>
                  </div>
                ) : !hasPartnerData ? (
                  <div className="text-center py-9 px-4 bg-white border-[1.5px] border-[#1C1C1C] rounded-[28px]">
                    <div className="w-14 h-14 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-7 h-7 stroke-[1.9]" />
                    </div>
                    <h4 className="text-sm font-bold text-[#1C1C1C]">تقلب‌نامه {partnerName} هنوز خالی است</h4>
                    <p className="text-xs text-[#1C1C1C]/75 font-medium mt-1.5 max-w-xs mx-auto leading-relaxed">
                      {partnerName} هنوز جزییات علایق خود (سایز، قهوه محبوب، گل مورد علاقه و...) را ثبت نکرده است.
                    </p>

                    <button
                      type="button"
                      onClick={handleRequestPartnerFill}
                      disabled={pokeSent}
                      className="mt-4 px-5 py-3 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5 active:translate-y-0.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-[#FFFF66]" />
                      <span>{pokeSent ? "یادآوری ارسال شد! 💌" : `درخواست تکمیل از ${partnerName}`}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-center justify-between text-xs font-bold text-[#1C1C1C]">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-[#1C1C1C] fill-current" />
                        <span>راهنمای خوشحال کردن {partnerName}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleRequestPartnerFill}
                        className="text-[11px] bg-white border border-[#1C1C1C] px-2.5 py-0.5 rounded-full text-[#1C1C1C] cursor-pointer"
                      >
                        {pokeSent ? "ارسال شد! 💖" : "یادآوری به‌روزرسانی"}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {partnerCheat?.clothingSize && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Shirt className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">سایز لباس</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.clothingSize}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.shoeSize && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Footprints className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">سایز کفش</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.shoeSize}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.ringSize && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Gem className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">سایز انگشتر</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.ringSize}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.favoriteDrink && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Coffee className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">قهوه یا نوشیدنی محبوب</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.favoriteDrink}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.favoriteFlower && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Flower2 className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">گل مورد علاقه</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.favoriteFlower}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.favoriteFood && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <UtensilsCrossed className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">غذای آرامش‌بخش و محبوب</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.favoriteFood}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.favoriteColor && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#6BCFEA] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Palette className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">رنگ مورد علاقه</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.favoriteColor}</p>
                          </div>
                        </div>
                      )}

                      {partnerCheat?.perfumeStyle && (
                        <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] shrink-0">
                            <Sparkle className="w-4 h-4 stroke-[1.9]" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#1C1C1C]/70">سبک رایحه و عطر</span>
                            <p className="text-xs font-bold text-[#1C1C1C] mt-0.5">{partnerCheat.perfumeStyle}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {partnerCheat?.loveLanguage && (
                      <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3.5">
                        <span className="text-[10px] font-bold text-[#1C1C1C]/75 flex items-center gap-1.5 mb-1">
                          <Heart className="w-3.5 h-3.5 text-[#1C1C1C]" />
                          <span>زبان عشق اصلی</span>
                        </span>
                        <p className="text-xs font-bold text-[#1C1C1C]">
                          {LOVE_LANGUAGES.find((l) => l.id === partnerCheat.loveLanguage)?.label || partnerCheat.loveLanguage}
                        </p>
                      </div>
                    )}

                    {partnerCheat?.allergies && (
                      <div className="bg-[#F29B47] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3.5">
                        <span className="text-[10px] font-bold text-[#1C1C1C] flex items-center gap-1.5 mb-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>آلرژی‌ها، پرهیزها و خط قرمزهای غذایی</span>
                        </span>
                        <p className="text-xs font-bold text-[#1C1C1C]">{partnerCheat.allergies}</p>
                      </div>
                    )}

                    {partnerCheat?.littleFantasies && (
                      <div className="bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3.5">
                        <span className="text-[10px] font-bold text-[#1C1C1C] flex items-center gap-1.5 mb-1">
                          <Smile className="w-3.5 h-3.5" />
                          <span>دلخوشی‌ها و فانتزی‌های کوچک</span>
                        </span>
                        <p className="text-xs font-medium text-[#1C1C1C] leading-relaxed whitespace-pre-line">
                          {partnerCheat.littleFantasies}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Edit My Cheat Sheet Form */
              <form onSubmit={handleSave} className="space-y-3.5">
                <p className="text-xs text-[#1C1C1C]/85 font-medium leading-relaxed">
                  اطلاعات زیر به {partnerName} کمک می‌کند در خرید هدیه، سفارش خوراکی و قرارها شما را خوشحال‌تر کند.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">سایز لباس</label>
                    <input
                      type="text"
                      placeholder="مثلاً M / 38 / اورسایز"
                      value={myCheatSheet.clothingSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, clothingSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">سایز کفش</label>
                    <input
                      type="text"
                      placeholder="مثلاً 38 / 42"
                      value={myCheatSheet.shoeSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, shoeSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">سایز انگشتر</label>
                    <input
                      type="text"
                      placeholder="مثلاً 6 / 14 / باریک"
                      value={myCheatSheet.ringSize || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, ringSize: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">رنگ محبوب</label>
                    <input
                      type="text"
                      placeholder="مثلاً بنفش، سبز زیتونی، سرمه‌ای"
                      value={myCheatSheet.favoriteColor || ""}
                      onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteColor: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">قهوه یا نوشیدنی محبوب</label>
                  <input
                    type="text"
                    placeholder="مثلاً آیس کارامل ماکیاتو با شیر بادام / چای بهارنارنج"
                    value={myCheatSheet.favoriteDrink || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteDrink: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">گل مورد علاقه</label>
                  <input
                    type="text"
                    placeholder="مثلاً پیونی، رز هلندی قرمز، آفتابگردان، ارکیده"
                    value={myCheatSheet.favoriteFlower || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteFlower: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">غذای محبوب یا آرامش‌بخش (Comfort Food)</label>
                  <input
                    type="text"
                    placeholder="مثلاً پیتزا سیر و استیک / قورمه‌سبزی / سوشی"
                    value={myCheatSheet.favoriteFood || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, favoriteFood: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">سبک رایحه و عطر محبوب</label>
                  <input
                    type="text"
                    placeholder="مثلاً گرم و وانیلی / خنک و مرکباتی / چوبی و تلخ"
                    value={myCheatSheet.perfumeStyle || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, perfumeStyle: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">زبان عشق اصلی شما</label>
                  <select
                    value={myCheatSheet.loveLanguage || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, loveLanguage: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
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
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">آلرژی‌ها، حساسیت‌ها و پرهیزها</label>
                  <input
                    type="text"
                    placeholder="مثلاً به باقلا، بادام‌زمینی، لاکتوز، فلفل تند"
                    value={myCheatSheet.allergies || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, allergies: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#1C1C1C] mb-1">فانتزی‌ها و دلخوشی‌های کوچک</label>
                  <textarea
                    rows={2}
                    placeholder="مثلاً شب‌گردی با موزیک، صبحانه در تخت‌خواب، بوی کتاب نو، قدم زدن زیر بارون..."
                    value={myCheatSheet.littleFantasies || ""}
                    onChange={(e) => setMyCheatSheet({ ...myCheatSheet, littleFantasies: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl text-xs font-medium text-[#1C1C1C] focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-[#5ED46A] stroke-[1.9]" />
                      <span>با موفقیت ذخیره شد! 🎉</span>
                    </>
                  ) : saving ? (
                    <span>در حال ذخیره...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#FFFF66] stroke-[1.9]" />
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
