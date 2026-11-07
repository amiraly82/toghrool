import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  History,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronLeft,
  Flame,
  HeartHandshake
} from "lucide-react";
import { UserProfile, DailyQuestion, DailyQuestionAnswerState } from "../types";
import {
  getTehranDateString,
  getDailyQuestionForDate,
  QUESTION_CATEGORIES
} from "../utils/dailyQuestions";
import { fetchFromPhpApi } from "../apiClient";

interface DailyQuestionCardProps {
  userProfile: UserProfile;
  partnerProfile: UserProfile | null;
  onOpenModal?: () => void;
  refreshKey?: number;
  embeddedInHero?: boolean;
}

export default function DailyQuestionCard({
  userProfile,
  partnerProfile,
  onOpenModal,
  refreshKey,
  embeddedInHero = false
}: DailyQuestionCardProps) {
  const [todayDateStr] = useState<string>(() => getTehranDateString());
  const [question] = useState<DailyQuestion>(() => getDailyQuestionForDate(todayDateStr));
  const [answerState, setAnswerState] = useState<DailyQuestionAnswerState | null>(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const partnerName = partnerProfile?.displayName || "پارتنر";
  const categoryMeta = QUESTION_CATEGORIES[question.category] || QUESTION_CATEGORIES.nostalgia;

  const fetchStatus = async () => {
    if (!userProfile.coupleId && !userProfile.uid) return;
    try {
      const res = await fetchFromPhpApi("getDailyQuestion", { date: todayDateStr });
      if (res && res.status === "success") {
        setAnswerState({
          date: todayDateStr,
          question,
          myAnswer: res.myAnswer || null,
          myAnsweredAt: res.myAnsweredAt || null,
          hasPartnerAnswered: !!res.hasPartnerAnswered,
          partnerAnswer: res.partnerAnswer || null,
          partnerAnsweredAt: res.partnerAnsweredAt || null,
          isRevealed: !!res.isRevealed
        });
      }
    } catch (e) {
      console.warn("Error fetching daily question status:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 10000);
    return () => clearInterval(timer);
  }, [todayDateStr, userProfile.coupleId, refreshKey]);

  const handleOpenHistory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const res = await fetchFromPhpApi("getDailyQuestionsHistory", {});
      if (res && res.status === "success" && Array.isArray(res.history)) {
        setHistoryList(res.history);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const isRevealed = answerState?.isRevealed === true;
  const hasMyAnswer = !!answerState?.myAnswer;
  const hasPartnerAnswer = answerState?.hasPartnerAnswered === true;

  // Four distinct CTA states requested by the user:
  // State 1: Neither has answered yet
  // State 2: I answered, partner hasn't answered
  // State 3: Partner answered, I haven't answered
  // State 4: Both answered (answers revealed)
  const ctaState = useMemo(() => {
    if (isRevealed || (hasMyAnswer && hasPartnerAnswer)) {
      return {
        type: "both_answered" as const,
        bg: "bg-[#B5F285] hover:bg-[#A3ED6B]",
        textColor: "text-[#141414]",
        title: "مشاهده پاسخ‌های دونفره 💕",
        subtitle: `پاسخ‌ها باز شدند! برای خوندن جواب ${partnerName} کلیک کن`,
        badge: "پاسخ‌ها باز شد 🔓",
        badgeBg: "bg-white",
        Icon: HeartHandshake,
        idleAnimation: {
          scale: [1, 1.025, 1],
          boxShadow: [
            "0 4px 0 #141414",
            "0 6px 0 #141414",
            "0 4px 0 #141414"
          ]
        },
        idleDuration: 2.0
      };
    }

    if (!hasMyAnswer && hasPartnerAnswer) {
      return {
        type: "partner_answered_waiting_me" as const,
        bg: "bg-[#FF8B6A] hover:bg-[#FF7550]",
        textColor: "text-white",
        title: `${partnerName} جواب داده! نوبت توئه 🔥`,
        subtitle: "همین الان پاسخ بده تا قفل جواب‌ها باز بشه!",
        badge: "منتظر پاسخ تو ⚡",
        badgeBg: "bg-[#F5F97A] text-[#141414]",
        Icon: Flame,
        idleAnimation: {
          scale: [1, 1.03, 1],
          rotate: [0, -0.8, 0.8, 0],
          boxShadow: [
            "0 4px 0 #141414",
            "0 7px 0 #141414",
            "0 4px 0 #141414"
          ]
        },
        idleDuration: 1.5
      };
    }

    if (hasMyAnswer && !hasPartnerAnswer) {
      return {
        type: "i_answered_waiting_partner" as const,
        bg: "bg-[#FBC2F3] hover:bg-[#F9A8EE]",
        textColor: "text-[#141414]",
        title: `منتظر پاسخ ${partnerName} ⏳`,
        subtitle: `تو پاسخ دادی! برای یادآوری یا ارسال تلنگر کلیک کن`,
        badge: "در انتظار پارتنر",
        badgeBg: "bg-white text-[#141414]",
        Icon: Clock,
        idleAnimation: {
          y: [0, -2, 0],
          scale: [1, 1.018, 1],
          boxShadow: [
            "0 4px 0 #141414",
            "0 5.5px 0 #141414",
            "0 4px 0 #141414"
          ]
        },
        idleDuration: 2.4
      };
    }

    // Default: State 1 - Neither has answered yet
    return {
      type: "nobody_answered" as const,
      bg: "bg-[#F5F97A] hover:bg-[#EEF347]",
      textColor: "text-[#141414]",
      title: "پاسخ به سوال امروز ✦",
      subtitle: "اولین نفر باش که پاسخ میده و شروعش کن!",
      badge: "چالش دونفره امروز",
      badgeBg: "bg-white text-[#141414]",
      Icon: Sparkles,
      idleAnimation: {
        scale: [1, 1.025, 1],
        boxShadow: [
          "0 4px 0 #141414",
          "0 6px 0 #141414",
          "0 4px 0 #141414"
        ]
      },
      idleDuration: 2.1
    };
  }, [isRevealed, hasMyAnswer, hasPartnerAnswer, partnerName]);

  return (
    <div className="w-full" dir="rtl">
      {embeddedInHero ? (
        /* Neobrutalist Embedded Question Card inside Home Hero Card */
        <div
          onClick={onOpenModal}
          className="mt-3.5 bg-white border-2 border-[#141414] rounded-[26px] p-4 sm:p-5 shadow-[0_4px_0_#141414] cursor-pointer text-right group transition-all"
        >
          {/* Header: Title strictly "سوال امروز" */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-[#141414]/10">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] shrink-0">
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              </span>
              <h4 className="text-sm sm:text-base font-black text-[#141414]">
                سوال امروز
              </h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] transition-colors cursor-pointer active:translate-y-0.5"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>

          {/* Question Text */}
          <p className="mt-3 text-xs sm:text-sm font-black text-[#141414] leading-relaxed line-clamp-2">
            «{question.text}»
          </p>

          {/* BIG CALL TO ACTION BUTTON WITH 4 STATES & EYE-CATCHING IDLE ANIMATION */}
          <div className="mt-3.5">
            <motion.div
              animate={ctaState.idleAnimation}
              transition={{
                repeat: Infinity,
                duration: ctaState.idleDuration,
                ease: "easeInOut"
              }}
              className={`w-full py-3.5 px-4 rounded-full border-2 border-[#141414] ${ctaState.bg} ${ctaState.textColor} shadow-[0_4px_0_#141414] active:shadow-[0_1px_0_#141414] active:translate-y-1 transition-colors flex items-center justify-between gap-3 cursor-pointer group`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/90 border-2 border-[#141414] shadow-[0_1.5px_0_#141414] flex items-center justify-center shrink-0">
                  <ctaState.Icon className="w-5 h-5 text-[#141414] stroke-[2.2]" />
                </div>
                <div className="text-right min-w-0">
                  <span className="text-xs sm:text-sm font-black block leading-tight truncate">
                    {ctaState.title}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold opacity-85 block leading-tight truncate mt-0.5">
                    {ctaState.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full border border-[#141414] ${ctaState.badgeBg}`}>
                  {ctaState.badge}
                </span>
                <div className="w-7 h-7 rounded-full bg-[#141414] text-white flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                  <ChevronLeft className="w-4 h-4 stroke-[2.6]" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        /* Standalone Neobrutalist Card */
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenModal}
          className="bg-white border-2 border-[#141414] rounded-[26px] p-4 sm:p-5 shadow-[0_4px_0_#141414] cursor-pointer text-right group"
        >
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b-2 border-[#141414]/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] shrink-0">
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              </span>
              <h4 className="text-sm sm:text-base font-black text-[#141414] whitespace-nowrap">
                سوال امروز
              </h4>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-8 h-8 rounded-full bg-white hover:bg-[#F5F97A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] cursor-pointer active:translate-y-0.5"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs sm:text-sm font-black text-[#141414] leading-relaxed line-clamp-2">
            «{question.text}»
          </p>

          <div className="mt-3.5">
            <motion.div
              animate={ctaState.idleAnimation}
              transition={{
                repeat: Infinity,
                duration: ctaState.idleDuration,
                ease: "easeInOut"
              }}
              className={`w-full py-3.5 px-4 rounded-full border-2 border-[#141414] ${ctaState.bg} ${ctaState.textColor} shadow-[0_4px_0_#141414] active:shadow-[0_1px_0_#141414] active:translate-y-1 transition-colors flex items-center justify-between gap-3 cursor-pointer group`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-white/90 border-2 border-[#141414] shadow-[0_1.5px_0_#141414] flex items-center justify-center shrink-0">
                  <ctaState.Icon className="w-5 h-5 text-[#141414] stroke-[2.2]" />
                </div>
                <div className="text-right min-w-0">
                  <span className="text-xs sm:text-sm font-black block leading-tight truncate">
                    {ctaState.title}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold opacity-85 block leading-tight truncate mt-0.5">
                    {ctaState.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`hidden sm:inline-block text-[10px] font-black px-2 py-0.5 rounded-full border border-[#141414] ${ctaState.badgeBg}`}>
                  {ctaState.badge}
                </span>
                <div className="w-7 h-7 rounded-full bg-[#141414] text-white flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                  <ChevronLeft className="w-4 h-4 stroke-[2.6]" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* --- HISTORY MODAL --- */}
      <AnimatePresence>
        {showHistoryModal && (
          <div
            className="fixed inset-0 bg-[#141414]/65 backdrop-blur-xs flex items-center justify-center p-4 z-60"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHistoryModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAD074] border-2 border-[#141414] shadow-[0_6px_0_#141414] rounded-[32px] w-full max-w-lg p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b-2 border-[#141414] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#FBC2F3] border-2 border-[#141414] flex items-center justify-center text-[#141414]">
                    <History className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base font-black text-[#141414]">تاریخچه چالش‌های روزانه</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="w-9 h-9 rounded-full bg-[#FF8B6A] border-2 border-[#141414] shadow-[0_2px_0_#141414] flex items-center justify-center text-[#141414] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.4]" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1">
                {isLoadingHistory ? (
                  <div className="text-center py-10 text-xs text-[#141414] font-black">
                    در حال بارگذاری تاریخچه...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-10 bg-white border-2 border-[#141414] rounded-2xl p-6">
                    <p className="text-xs text-[#141414] font-black">
                      هنوز تاریخچه‌ای ثبت نشده است. با پاسخ دادن به سوالات امروز، اولین خاطره را بسازید!
                    </p>
                  </div>
                ) : (
                  historyList.map((item) => {
                    const qObj = getDailyQuestionForDate(item.questionDate);
                    return (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-[#141414] shadow-[0_3px_0_#141414] rounded-2xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-black text-[#141414]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.questionDate}</span>
                          </span>
                          <span className="bg-[#B5F285] border border-[#141414] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>قفل بازشده</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-[#141414]">
                          {qObj.text}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="bg-[#FAD074]/40 p-2.5 rounded-xl border-2 border-[#141414]">
                            <span className="font-black block text-[10px] text-[#141414] mb-0.5">
                              پاسخ اول:
                            </span>
                            <p className="font-bold text-[#141414]">{item.user1Answer}</p>
                          </div>
                          <div className="bg-[#FBC2F3]/50 p-2.5 rounded-xl border-2 border-[#141414]">
                            <span className="font-black block text-[10px] text-[#141414] mb-0.5">
                              پاسخ دوم:
                            </span>
                            <p className="font-bold text-[#141414]">{item.user2Answer}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
