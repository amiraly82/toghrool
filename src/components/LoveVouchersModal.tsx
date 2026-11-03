import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Gift, 
  X, 
  Plus, 
  Check, 
  Sparkles, 
  Heart, 
  Film, 
  Pizza, 
  Coffee, 
  RefreshCw,
  Send,
  Clock,
  Ticket
} from "lucide-react";
import { LoveVoucher, UserProfile } from "../types";
import { fetchFromPhpApi } from "../apiClient";

interface LoveVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  partnerProfile: UserProfile | null;
}

const VOUCHER_ICONS: Record<string, any> = {
  Heart,
  Film,
  Pizza,
  Coffee,
  Sparkles,
  Gift
};

export default function LoveVouchersModal({
  isOpen,
  onClose,
  userProfile,
  partnerProfile
}: LoveVouchersModalProps) {
  const [vouchers, setVouchers] = useState<LoveVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "redeemed" | "completed">("available");

  // Create Voucher Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("Heart");
  const [isCreating, setIsCreating] = useState(false);

  const fetchVouchers = async () => {
    try {
      const res = await fetchFromPhpApi("getLoveVouchers", {});
      if (res && res.status === "success" && Array.isArray(res.vouchers)) {
        setVouchers(res.vouchers);
      }
    } catch (e) {
      console.warn("Failed fetching vouchers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchVouchers();
    }
  }, [isOpen]);

  const handleRedeem = async (voucher: LoveVoucher) => {
    // Optimistic update
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === voucher.id ? { ...v, status: "redeemed", redeemedAt: Date.now() / 1000 } : v
      )
    );

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#F6C3E5", "#FF8DA1", "#FAF6EC", "#A7B86C"]
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }

    try {
      await fetchFromPhpApi("redeemLoveVoucher", { id: voucher.id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async (voucher: LoveVoucher) => {
    setVouchers((prev) =>
      prev.map((v) =>
        v.id === voucher.id ? { ...v, status: "completed", completedAt: Date.now() / 1000 } : v
      )
    );

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 }
    });

    try {
      await fetchFromPhpApi("completeLoveVoucher", { id: voucher.id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetchFromPhpApi("createLoveVoucher", {
        title: newTitle.trim(),
        description: newDesc.trim(),
        icon: newIcon
      });

      if (res && res.status === "success") {
        setNewTitle("");
        setNewDesc("");
        setShowCreateModal(false);
        fetchVouchers();
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const filteredVouchers = vouchers.filter((v) => {
    if (filter === "all") return true;
    return v.status === filter;
  });

  return (
    <div className="fixed inset-0 bg-[#1B1B1A]/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col text-right overflow-hidden shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#E8E2D4] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#F6C3E5] flex items-center justify-center text-[#1B1B1A]">
              <Ticket className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#1B1B1A]">دفترچه کوپن‌های عاشقانه</h3>
              <p className="text-[11px] text-[#78746B] font-bold">امتیازهای شیرین و بدون چون‌وچرا برای پارتنرها</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-1.5 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] text-xs font-bold rounded-full flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ساخت کوپن</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 border-b border-[#E8E2D4]/50">
          <button
            type="button"
            onClick={() => setFilter("available")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === "available"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "bg-[#EFECE2] text-[#78746B] hover:bg-[#E5E0D2]"
            }`}
          >
            آماده خرج کردن
          </button>
          <button
            type="button"
            onClick={() => setFilter("redeemed")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === "redeemed"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "bg-[#EFECE2] text-[#78746B] hover:bg-[#E5E0D2]"
            }`}
          >
            خرج شده (در انتظار انجام)
          </button>
          <button
            type="button"
            onClick={() => setFilter("completed")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === "completed"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "bg-[#EFECE2] text-[#78746B] hover:bg-[#E5E0D2]"
            }`}
          >
            انجام‌شده
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              filter === "all"
                ? "bg-[#1B1B1A] text-[#FAF6EC]"
                : "bg-[#EFECE2] text-[#78746B] hover:bg-[#E5E0D2]"
            }`}
          >
            همه کوپن‌ها
          </button>
        </div>

        {/* Voucher Cards Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-[#78746B] flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>در حال بارگذاری کوپن‌ها...</span>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="py-16 text-center bg-[#FFFDF8] border border-dashed border-[#D5CEBC] rounded-3xl p-8">
              <Ticket className="w-8 h-8 text-[#A6A297] mx-auto mb-2 opacity-60" />
              <p className="text-xs font-bold text-[#78746B]">در این بخش کوپنی وجود ندارد.</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="mt-3 px-4 py-1.5 bg-[#FAF6EC] border border-[#E8E2D4] hover:bg-[#EFECE2] text-[#1B1B1A] rounded-full text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ساخت اولین کوپن دلخواه</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredVouchers.map((v) => {
                const IconComponent = VOUCHER_ICONS[v.icon] || Heart;
                const isAvailable = v.status === "available";
                const isRedeemed = v.status === "redeemed";
                const isCompleted = v.status === "completed";

                return (
                  <div
                    key={v.id}
                    className={`relative bg-[#FFFDF8] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                      isAvailable
                        ? "border-[#E8E2D4] hover:border-[#D5CEBC] shadow-xs"
                        : isRedeemed
                        ? "border-[#F8BBD0] bg-gradient-to-br from-[#FFFDF8] to-[#FFF0F7]"
                        : "border-[#E8E2D4] opacity-60 bg-[#FAF6EC]"
                    }`}
                  >
                    {/* Tear-off ticket notch decoration */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FAF6EC] rounded-full border-r border-[#E8E2D4]" />
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#FAF6EC] rounded-full border-l border-[#E8E2D4]" />

                    <div>
                      {/* Top icon & status stamp */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#FAF6EC] border border-[#E5E0D2] flex items-center justify-center text-[#1B1B1A]">
                          <IconComponent className="w-4 h-4 stroke-[1.8]" />
                        </div>

                        {isAvailable && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCE6B5] text-[#2D5A27] border border-[#C6D49A]">
                            آماده خرج کردن 🎟️
                          </span>
                        )}
                        {isRedeemed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F6C3E5] text-[#1B1B1A] border border-[#E5ADD2] animate-pulse">
                            خرج شده! در انتظار انجام ⏳
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFECE2] text-[#78746B]">
                            انجام شد ✅
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-black text-[#1B1B1A] leading-snug">
                        {v.title}
                      </h4>
                      {v.description && (
                        <p className="text-[11px] text-[#78746B] mt-1 line-clamp-2 leading-relaxed">
                          {v.description}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-4 pt-3 border-t border-dashed border-[#E8E2D4] flex items-center justify-between gap-2">
                      <span className="text-[9px] text-[#9E9A8F] font-medium">
                        هدیه از طرف {v.giverName}
                      </span>

                      {isAvailable && (
                        <button
                          type="button"
                          onClick={() => handleRedeem(v)}
                          className="px-3.5 py-1.5 rounded-full bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs"
                        >
                          خرج کردن کوپن 🎟️
                        </button>
                      )}

                      {isRedeemed && (
                        <button
                          type="button"
                          onClick={() => handleComplete(v)}
                          className="px-3 py-1.5 rounded-full bg-[#A7B86C] hover:bg-[#94A659] text-[#1B1B1A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>انجام دادم!</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Custom Voucher Sub-Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 bg-[#1B1B1A]/40 backdrop-blur-[1px] flex items-center justify-center p-4 z-60" dir="rtl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[28px] w-full max-w-md p-6 text-right"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D4] mb-4">
                  <h4 className="text-sm font-black text-[#1B1B1A]">ساخت کوپن عاشقانه دلخواه</h4>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="w-7 h-7 rounded-full border border-dashed border-[#A6A297] flex items-center justify-center text-[#1B1B1A]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleCreateVoucher} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-[#78746B] block mb-1">عنوان کوپن</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="مثال: خرید بستنی قیفی شبانه، ۳۰ دقیقه گوش دادن بدون قضاوت"
                      className="w-full px-3.5 py-2.5 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-xl text-xs sm:text-sm text-[#1B1B1A] font-bold focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#78746B] block mb-1">توضیحات و شرایط تعهد (اختیاری)</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="جزییات، شروط بامزه یا نحوه اجرا..."
                      className="w-full px-3.5 py-2.5 bg-[#EFECE2] focus:bg-[#FFFDF8] border border-transparent focus:border-[#1B1B1A] rounded-xl text-xs sm:text-sm text-[#1B1B1A] h-20 resize-none font-medium focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#78746B] block mb-1.5">انتخاب نماد</label>
                    <div className="flex gap-2">
                      {["Heart", "Coffee", "Pizza", "Film", "Sparkles", "Gift"].map((iconKey) => {
                        const Icon = VOUCHER_ICONS[iconKey] || Heart;
                        return (
                          <button
                            key={iconKey}
                            type="button"
                            onClick={() => setNewIcon(iconKey)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                              newIcon === iconKey
                                ? "bg-[#1B1B1A] text-[#FAF6EC] shadow-xs"
                                : "bg-[#EFECE2] text-[#78746B] hover:bg-[#E5E0D2]"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isCreating || !newTitle.trim()}
                      className="w-full py-2.5 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] font-bold text-xs rounded-full transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isCreating ? "در حال ثبت..." : "هدیه دادن کوپن به پارتنر 🎁"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
