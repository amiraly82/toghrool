import React, { useState, useEffect } from "react";
import { Sparkles, X, ChevronLeft, Lightbulb, Heart, Droplet, Camera, Calendar, Wallet } from "lucide-react";
import { GenderThemeConfig } from "../utils/genderTheme";

interface LexGuidanceCardProps {
  activeTab: string;
  theme: GenderThemeConfig;
  partnerName?: string;
  onActionClick?: () => void;
}

export const LexGuidanceCard: React.FC<LexGuidanceCardProps> = ({
  activeTab,
  theme,
  partnerName = "پارتنر",
  onActionClick
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Sync dismiss state with localStorage
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(`lex_guide_dismissed_${activeTab}`);
      setIsDismissed(dismissed === "true");
    } catch {
      setIsDismissed(false);
    }
  }, [activeTab]);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(`lex_guide_dismissed_${activeTab}`, "true");
    } catch {}
  };

  const handleResetDismiss = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(`lex_guide_dismissed_${activeTab}`);
    } catch {}
  };

  if (isDismissed) {
    // Minimized guidance pill so user can bring it back easily
    return (
      <div className="flex justify-end mb-3" dir="rtl">
        <button
          type="button"
          onClick={handleResetDismiss}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#141414] shadow-[0_1px_0_#141414] text-[11px] font-black text-[#141414]/80 hover:text-[#141414] hover:bg-neutral-50 transition-all cursor-pointer"
          title="نمایش مجدد راهنمای این صفحه"
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#EAB308] stroke-[2.4]" />
          <span>راهنمای صفحه</span>
        </button>
      </div>
    );
  }

  // Define tab guidance metadata
  const getTabContent = () => {
    switch (activeTab) {
      case "wishlist":
      case "hall":
        return {
          icon: <Heart className="w-4 h-4 stroke-[2.4]" />,
          tag: "راهنمای آرزوها",
          title: "آرزوها و برنامه‌های مشترک",
          desc: "اینجا آرزوهای دو نفره، خریدهای دلخواه و مقصدهای سفرتون قرار می‌گیرند. هر پارتنر می‌تونه درصد مشارکتش رو ثبت کنه تا با هم به ۱۰۰٪ برسید! ✨",
          ctaText: "افزودن آرزوی جدید"
        };
      case "period":
        if (theme.isMale) {
          return {
            icon: <Droplet className="w-4 h-4 stroke-[2.4]" />,
            tag: "همراهی عاشقانه آقایان",
            title: `راهنمای هوای ${partnerName} رو داشتن`,
            desc: "تغییرات چرخه بدنی خانم‌ها روی مود و انرژی‌شون اثر مستقیم داره. وضعیت امروز پارتنرت رو ببین تا بدونی چه موقع به آرامش، توجه یا یک نوشیدنی گرم نیاز داره 💙",
            ctaText: "مشاهده چرخه سلامت"
          };
        } else {
          return {
            icon: <Droplet className="w-4 h-4 stroke-[2.4]" />,
            tag: "تقویم سلامت بانوان",
            title: "پیش‌بینی هوشمند چرخه و حال دل",
            desc: "پیش‌بینی دقیق زمان پریود، پنجره باروری و روزهای حساس PMS. حال و احوال روزانه‌ت رو ثبت کن تا پارتنرت هم همیشه همراهت باشه 💖",
            ctaText: "ثبت روزانه حال من"
          };
        }
      case "memories":
        return {
          icon: <Camera className="w-4 h-4 stroke-[2.4]" />,
          tag: "دفترچه خاطرات",
          title: "ثبت قشنگ‌ترین لحظه‌های دونفره",
          desc: "عکس‌های سفر، یادداشت‌های یهویی و لحظاتی که دلتون می‌خواد همیشه زنده بمونن. می‌تونید تب‌های اختصاصی موضوعی هم بسازید!",
          ctaText: "ثبت خاطره جدید"
        };
      case "calendar":
        return {
          icon: <Calendar className="w-4 h-4 stroke-[2.4]" />,
          tag: "گاه‌شمار عشق",
          title: "روزهای مهم و سالگردها",
          desc: "شمارش معکوس روزهای با هم بودن، تاریخ آشنایی و ازدواج، و برنامه‌ریزی قرارهای آینده تا هیچ روز خاصی فراموش نشه 💍",
          ctaText: "تنظیم تاریخ سالگرد"
        };
      case "finance":
        return {
          icon: <Wallet className="w-4 h-4 stroke-[2.4]" />,
          tag: "مدیریت مالی",
          title: "حساب‌وکتاب شفاف و بی‌دغدغه",
          desc: "هزینه‌های دونفره، پس‌انداز برای اهداف مشترک و محاسبه دنگی دونفره با شفافیت کامل و احترام متقابل 💳",
          ctaText: "ثبت هزینه یا پس‌انداز"
        };
      default:
        return {
          icon: <Sparkles className="w-4 h-4 stroke-[2.4]" />,
          tag: "راهنمای طغرل",
          title: "فضای امن و اختصاصی شما دو نفر",
          desc: "هر بخش برای ساده‌تر و شیرین‌تر شدن رابطه دونفره شما طراحی شده است.",
          ctaText: "شروع"
        };
    }
  };

  const content = getTabContent();

  return (
    <div
      className={`mb-4.5 rounded-[22px] border-2 border-[#141414] shadow-[0_3px_0_#141414] p-3.5 sm:p-4 text-[#141414] relative transition-all ${theme.guidanceBg}`}
      dir="rtl"
    >
      {/* Top Tag & Close Button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-6 h-6 rounded-full border border-[#141414] shadow-[0_1px_0_#141414] flex items-center justify-center text-[#141414] ${theme.guidanceIconBg}`}
          >
            {content.icon}
          </span>
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-[#141414] shadow-[0_1px_0_#141414] text-[#141414]">
            {content.tag}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-6 h-6 rounded-full bg-white hover:bg-neutral-100 border border-[#141414] shadow-[0_1px_0_#141414] flex items-center justify-center text-[#141414]/70 hover:text-[#141414] transition-all cursor-pointer"
          title="بستن راهنما"
          aria-label="بستن راهنما"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      {/* Title & Description */}
      <h3 className="text-sm sm:text-base font-black text-[#141414] mb-1">
        {content.title}
      </h3>
      <p className="text-xs sm:text-[13px] font-bold text-[#141414]/80 leading-relaxed">
        {content.desc}
      </p>

      {/* Action CTA if provided */}
      {onActionClick && (
        <div className="mt-3 pt-2.5 border-t border-[#141414]/15 flex items-center justify-end">
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-50 active:translate-y-0.5 border-2 border-[#141414] shadow-[0_2px_0_#141414] text-xs font-black text-[#141414] transition-all cursor-pointer"
          >
            <span>{content.ctaText}</span>
            <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}
    </div>
  );
};
