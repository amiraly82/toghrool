import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Lock,
  Send,
  History,
  X,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronLeft
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

  return (
    <div className="w-full" dir="rtl">
      {embeddedInHero ? (
        /* Seamless Dark-Glass Prompt Docked Inside Home Hero Card */
        <div
          onClick={onOpenModal}
          className="pt-3.5 mt-3.5 border-t border-white/10 cursor-pointer text-right group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#F6C3E5] shrink-0" />
              <span className="text-[11px] font-black text-[#FAF6EC]/90 whitespace-nowrap">
                سوال امروز
              </span>
              <span className="text-[10px] font-medium text-[#FAF6EC]/50 truncate">
                · {categoryMeta.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-6 h-6 rounded-full bg-white/[0.07] hover:bg-white/[0.14] flex items-center justify-center text-[#FAF6EC]/65 hover:text-[#FAF6EC] transition-colors cursor-pointer"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-3 h-3" />
              </button>

              {isRevealed ? (
                <span className="text-[11px] font-bold text-[#C9E4CA] flex items-center gap-1 whitespace-nowrap">
                  <span>مشاهده پاسخ‌ها</span>
                  <ChevronLeft className="w-3 h-3" />
                </span>
              ) : hasMyAnswer ? (
                <span className="text-[11px] font-semibold text-[#FAF6EC]/60 flex items-center gap-1 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span>منتظر {partnerName}</span>
                </span>
              ) : hasPartnerAnswer ? (
                <span className="text-[11px] font-bold text-[#F6C3E5] bg-[#F6C3E5]/15 px-2.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <span>پارتنر جواب داده</span>
                  <ChevronLeft className="w-3 h-3" />
                </span>
              ) : (
                <span className="text-[11px] font-bold text-[#F6C3E5] group-hover:text-white flex items-center gap-0.5 whitespace-nowrap transition-colors">
                  <span>ثبت پاسخ</span>
                  <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                </span>
              )}
            </div>
          </div>

          <p className="mt-1.5 text-[13px] sm:text-sm font-bold text-[#FAF6EC] leading-relaxed line-clamp-2">
            «{question.text}»
          </p>
        </div>
      ) : (
        /* Calm Standalone Editorial Prompt Card (Zero Yellow/Black Sticker Clutter) */
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenModal}
          className="bg-[#FFFDF9] hover:bg-white border border-[#EAE4D7] hover:border-[#D5CEBC] rounded-[22px] p-3.5 sm:p-4 transition-all cursor-pointer text-right group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="w-3.5 h-3.5 text-[#C9648B] shrink-0" />
              <span className="text-xs font-black text-[#191817] whitespace-nowrap">سوال امروز</span>
              <span className="text-[11px] font-medium text-[#8A8479] truncate">· {categoryMeta.label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-7 h-7 rounded-full hover:bg-[#EFECE2] flex items-center justify-center text-[#8A8479] hover:text-[#191817] transition-colors cursor-pointer"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-[#191817] flex items-center gap-0.5 whitespace-nowrap">
                <span>{isRevealed ? "مشاهده پاسخ‌ها" : hasMyAnswer ? `منتظر ${partnerName}` : hasPartnerAnswer ? "پارتنر جواب داده" : "ثبت پاسخ"}</span>
                <ChevronLeft className="w-3.5 h-3.5 text-[#8A8479]" />
              </span>
            </div>
          </div>

          <p className="mt-2 text-[13px] sm:text-sm font-bold text-[#191817] leading-relaxed line-clamp-2">
            {question.text}
          </p>
        </motion.div>
      )}

      {/* --- HISTORY MODAL --- */}
      <AnimatePresence>
        {showHistoryModal && (
          <div
            className="fixed inset-0 bg-[#1B1B1A]/60 backdrop-blur-xs flex items-center justify-center p-4 z-60"
            dir="rtl"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHistoryModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-lg p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col text-right shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D4] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#F6C3E5] flex items-center justify-center text-[#1B1B1A]">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-[#1B1B1A]">تاریخچه چالش‌های روزانه</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="w-8 h-8 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] flex items-center justify-center text-[#1B1B1A] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1">
                {isLoadingHistory ? (
                  <div className="text-center py-10 text-xs text-[#78746B] font-bold">
                    در حال بارگذاری تاریخچه...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-[#78746B] font-bold">
                      هنوز تاریخچه‌ای ثبت نشده است. با پاسخ دادن به سوالات امروز، اولین خاطره را بسازید!
                    </p>
                  </div>
                ) : (
                  historyList.map((item) => {
                    const qObj = getDailyQuestionForDate(item.questionDate);
                    return (
                      <div
                        key={item.id}
                        className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-4 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#78746B]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{item.questionDate}</span>
                          </span>
                          <span className="text-[#10B981] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>قفل بازشده</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-black text-[#1B1B1A]">
                          {qObj.text}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="bg-[#FAF6EC] p-2.5 rounded-xl border border-[#E8E2D4]">
                            <span className="font-bold block text-[10px] text-[#78746B] mb-0.5">
                              پاسخ اول:
                            </span>
                            <p className="font-semibold text-[#1B1B1A]">{item.user1Answer}</p>
                          </div>
                          <div className="bg-[#FFF0F7] p-2.5 rounded-xl border border-[#F8BBD0]">
                            <span className="font-bold block text-[10px] text-[#EC407A] mb-0.5">
                              پاسخ دوم:
                            </span>
                            <p className="font-semibold text-[#1B1B1A]">{item.user2Answer}</p>
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
