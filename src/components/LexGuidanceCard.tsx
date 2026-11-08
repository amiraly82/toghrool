import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { GenderThemeConfig } from "../utils/genderTheme";

interface LexGuidanceCardProps {
  activeTab: string;
  theme: GenderThemeConfig;
  partnerName?: string;
  onActionClick?: () => void;
}

/**
 * "Lex Tip" card — solid pastel block, no border, tiny label, huge display title.
 * One per section, dismissible. Tips can be brought back from the app-bar help (?) button,
 * which fires the `lex-tips-reset` window event.
 */
export const LexGuidanceCard: React.FC<LexGuidanceCardProps> = ({
  activeTab,
  theme,
  partnerName = "پارتنر",
  onActionClick
}) => {
  const storageKey = `lex_tip_dismissed_${activeTab === "hall" ? "wishlist" : activeTab}`;
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      setIsDismissed(localStorage.getItem(storageKey) === "true");
    } catch {
      setIsDismissed(false);
    }
  }, [storageKey]);

  useEffect(() => {
    const onReset = () => setIsDismissed(false);
    window.addEventListener("lex-tips-reset", onReset);
    return () => window.removeEventListener("lex-tips-reset", onReset);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
  };

  if (isDismissed) return null;

  const content = (() => {
    switch (activeTab) {
      case "wishlist":
      case "hall":
        return {
          bg: theme.guidanceBg,
          title: "آرزوهاتون، یکی‌یکی 🎯",
          desc: "هر آرزو یه کارته. هر وقت یه قدم جلو رفتید، «+۲۵٪» رو بزنید تا با هم به ۱۰۰٪ برسید.",
          cta: "افزودن آرزو"
        };
      case "period":
        return theme.isMale
          ? {
              bg: "bg-[#FFC6DF]",
              title: `هوای ${partnerName} رو داشته باش 💙`,
              desc: "اینجا می‌بینی امروز تو کدوم فاز چرخه‌ست و چه کاری حالش رو بهتر می‌کنه.",
              cta: undefined
            }
          : {
              bg: "bg-[#FFC6DF]",
              title: "حالت رو ثبت کن 💖",
              desc: "با ثبت روزانه، پیش‌بینی پریود و روزهای حساس دقیق‌تر می‌شه و پارتنرت هم در جریان می‌مونه.",
              cta: "ثبت امروز"
            };
      case "memories":
        return {
          bg: "bg-[#F4C6FA]",
          title: "لحظه‌ها رو نگه دارید 📸",
          desc: "عکس، متن یا کپسول زمان — خاطره‌هایی که بعداً با هم مرورشون می‌کنید.",
          cta: "ثبت خاطره"
        };
      case "calendar":
        return {
          bg: "bg-[#FFF7A8]",
          title: "هیچ روز مهمی یادتون نره 💍",
          desc: "سالگردها و برنامه‌های آینده رو اینجا ببینید و با شمارش معکوس منتظرشون باشید.",
          cta: "تنظیم سالگرد"
        };
      case "finance":
        return {
          bg: "bg-[#BDEFC2]",
          title: "حساب‌وکتاب بی‌دردسر 💳",
          desc: "هزینه‌ها و پس‌اندازهای مشترک رو ثبت کنید تا همیشه بدونید کجای هدفتون هستید.",
          cta: "ثبت تراکنش"
        };
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <div
      className={`relative rounded-[22px] px-5 pt-4 pb-5 mb-4 text-[#1C1C1C] ${content.bg}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[13px] text-[#1C1C1C]/80">نکته طغرل</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 -ml-1.5 flex items-center justify-center text-[#1C1C1C]/70 hover:text-[#1C1C1C] cursor-pointer"
          title="بستن نکته"
          aria-label="بستن نکته"
        >
          <X className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>
      <h3 className="text-[24px] font-black leading-[1.35] text-[#1C1C1C]">{content.title}</h3>
      <p className="text-[15px] leading-[1.8] text-[#1C1C1C]/90 mt-2">{content.desc}</p>
      {onActionClick && content.cta && (
        <button
          type="button"
          onClick={onActionClick}
          className="mt-4 px-4 py-2 rounded-[10px] bg-white/70 hover:bg-white border-[1.5px] border-[#1C1C1C] text-[14px] font-bold cursor-pointer transition-colors"
        >
          {content.cta}
        </button>
      )}
    </div>
  );
};
