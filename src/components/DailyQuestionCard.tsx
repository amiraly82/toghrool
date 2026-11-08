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
import { LexWaveStrip } from "./LexUI";

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
        bg: "#5ED46A",
        title: "جواب‌ها باز شد؛ ببین چی گفتید 💕",
        hint: `هر دو جواب دادید — جواب ${partnerName} منتظرته`,
        Icon: HeartHandshake,
        idle: { scale: [1, 1.02, 1] },
        iconIdle: { scale: [1, 1.25, 1] },
        duration: 1.6
      };
    }
    if (!hasMyAnswer && hasPartnerAnswer) {
      return {
        type: "partner_answered_waiting_me" as const,
        bg: "#F29B47",
        title: `${partnerName} جواب داده؛ نوبت توئه 🔥`,
        hint: "جواب بده تا جواب‌های هر دوتون باز بشه",
        Icon: Flame,
        idle: { scale: [1, 1.03, 1], rotate: [0, -0.6, 0.6, 0] },
        iconIdle: { rotate: [0, -14, 14, 0], scale: [1, 1.15, 1] },
        duration: 1.3
      };
    }
    if (hasMyAnswer && !hasPartnerAnswer) {
      return {
        type: "i_answered_waiting_partner" as const,
        bg: "#FFFFFF",
        title: `منتظر جواب ${partnerName} ⏳`,
        hint: "تو جواب دادی — یه تلنگر کوچیک براش بفرست",
        Icon: Clock,
        idle: { y: [0, -2, 0] },
        iconIdle: { rotate: [0, 360] },
        duration: 2.6
      };
    }
    return {
      type: "nobody_answered" as const,
      bg: "#FFFF66",
      title: "جواب بده",
      hint: "اولین نفر باش که جواب می‌ده",
      Icon: Sparkles,
      idle: { scale: [1, 1.025, 1] },
      iconIdle: { rotate: [0, 18, -18, 0], scale: [1, 1.2, 1] },
      duration: 1.9
    };
  }, [isRevealed, hasMyAnswer, hasPartnerAnswer, partnerName]);

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onOpenModal}
      className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] overflow-hidden cursor-pointer text-right"
      data-cta-state={ctaState.type}
    >
      <div className="border-b-[1.5px] border-[#1C1C1C]">
        <LexWaveStrip className="h-6" />
      </div>

      <div className="px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[17px] font-bold text-[#1C1C1C]">سوال امروز</h4>
          <button
            type="button"
            onClick={handleOpenHistory}
            className="w-8 h-8 -ml-1.5 flex items-center justify-center text-[#1C1C1C] cursor-pointer"
            title="تاریخچه سوال‌ها"
            aria-label="تاریخچه سوال‌ها"
          >
            <History className="w-5 h-5 stroke-[1.7]" />
          </button>
        </div>

        <p className="mt-1.5 text-[16px] text-[#1C1C1C] leading-[1.85] line-clamp-3">{question.text}</p>

        {/* Big CTA — 4 states, each with its own idle animation */}
        <div className="relative mt-4">
          {ctaState.type !== "i_answered_waiting_partner" && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: ctaState.bg }}
              animate={{ scale: [1, 1.08], opacity: [0.55, 0] }}
              transition={{ repeat: Infinity, duration: ctaState.duration, ease: "easeOut" }}
            />
          )}
          <motion.div
            animate={ctaState.idle}
            transition={{ repeat: Infinity, duration: ctaState.duration, ease: "easeInOut" }}
            className="relative w-full h-[54px] px-5 rounded-full border-[1.5px] border-[#1C1C1C] flex items-center justify-center gap-2.5 overflow-hidden"
            style={{ backgroundColor: ctaState.bg }}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-y-0 w-16 -skew-x-12 bg-white/45"
              animate={{ x: ["-260%", "520%"] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", repeatDelay: 0.6 }}
            />
            <motion.span
              animate={ctaState.iconIdle}
              transition={{ repeat: Infinity, duration: ctaState.duration * (ctaState.type === "i_answered_waiting_partner" ? 2 : 1), ease: ctaState.type === "i_answered_waiting_partner" ? "linear" : "easeInOut" }}
              className="relative flex"
            >
              <ctaState.Icon className="w-5 h-5 text-[#1C1C1C] stroke-[1.9]" />
            </motion.span>
            <span className="relative text-[16px] font-bold text-[#1C1C1C] truncate">{ctaState.title}</span>
          </motion.div>
        </div>
        <p className="mt-2 text-center text-[12.5px] text-[#6E6B66]">{ctaState.hint}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="w-full" dir="rtl">
      {embeddedInHero ? <div className="mt-3.5">{card}</div> : card}

      {/* --- HISTORY MODAL --- */}
      <AnimatePresence>
        {showHistoryModal && (
          <div
            className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-xs flex items-center justify-center p-4 z-60"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHistoryModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] rounded-[28px] w-full max-w-lg p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b-[1.5px] border-[#1C1C1C] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                    <History className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <h3 className="text-base font-black text-[#1C1C1C]">تاریخچه چالش‌های روزانه</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="w-9 h-9 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[1.9]" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1">
                {isLoadingHistory ? (
                  <div className="text-center py-10 text-xs text-[#1C1C1C] font-bold">
                    در حال بارگذاری تاریخچه...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-10 bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-6">
                    <p className="text-xs text-[#1C1C1C] font-bold">
                      هنوز تاریخچه‌ای ثبت نشده است. با پاسخ دادن به سوالات امروز، اولین خاطره را بسازید!
                    </p>
                  </div>
                ) : (
                  historyList.map((item) => {
                    const qObj = getDailyQuestionForDate(item.questionDate);
                    return (
                      <div
                        key={item.id}
                        className="bg-white border-[1.5px] border-[#1C1C1C] rounded-2xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#1C1C1C]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.questionDate}</span>
                          </span>
                          <span className="bg-[#5ED46A] border border-[#1C1C1C] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>قفل بازشده</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#1C1C1C]">
                          {qObj.text}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="bg-[#F6F4F0]/40 p-2.5 rounded-xl border-[1.5px] border-[#1C1C1C]">
                            <span className="font-bold block text-[10px] text-[#1C1C1C] mb-0.5">
                              پاسخ اول:
                            </span>
                            <p className="font-medium text-[#1C1C1C]">{item.user1Answer}</p>
                          </div>
                          <div className="bg-[#EBA2F8]/50 p-2.5 rounded-xl border-[1.5px] border-[#1C1C1C]">
                            <span className="font-bold block text-[10px] text-[#1C1C1C] mb-0.5">
                              پاسخ دوم:
                            </span>
                            <p className="font-medium text-[#1C1C1C]">{item.user2Answer}</p>
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
