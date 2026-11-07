import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
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
        /* Neobrutalist Embedded Question Strip inside Home Hero Card */
        <div
          onClick={onOpenModal}
          className="mt-3.5 bg-white border-2 border-[#141414] rounded-[22px] p-3.5 shadow-[0_3px_0_#141414] cursor-pointer text-right group transition-transform active:translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#F5F97A] border-2 border-[#141414] flex items-center justify-center text-[#141414] shrink-0">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
              </span>
              <span className="text-xs font-black text-[#141414] whitespace-nowrap">
                سوال امروز
              </span>
              <span className="text-[10px] font-bold text-[#141414] bg-[#FBC2F3] border border-[#141414] px-2 py-0.5 rounded-full truncate">
                {categoryMeta.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-7 h-7 rounded-full bg-white hover:bg-[#F5F97A] border-2 border-[#141414] flex items-center justify-center text-[#141414] transition-colors cursor-pointer"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>

              <span className="px-2.5 py-1 rounded-full bg-[#242424] text-white border-2 border-[#141414] text-[11px] font-black flex items-center gap-0.5 whitespace-nowrap">
                {isRevealed ? (
                  <span>مشاهده پاسخ‌ها</span>
                ) : hasMyAnswer ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>منتظر {partnerName}</span>
                  </>
                ) : hasPartnerAnswer ? (
                  <span>پارتنر جواب داده</span>
                ) : (
                  <span>پاسخ دادن</span>
                )}
                <ChevronLeft className="w-3 h-3" />
              </span>
            </div>
          </div>

          <p className="mt-2 text-xs sm:text-sm font-black text-[#141414] leading-relaxed line-clamp-2">
            «{question.text}»
          </p>
        </div>
      ) : (
        /* Standalone Neobrutalist Card */
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenModal}
          className="bg-white border-2 border-[#141414] rounded-[26px] p-4 shadow-[0_3px_0_#141414] cursor-pointer text-right group"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-full bg-[#F5F97A] border-2 border-[#141414] flex items-center justify-center text-[#141414] shrink-0">
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
              </span>
              <span className="text-xs font-black text-[#141414] whitespace-nowrap">سوال امروز</span>
              <span className="text-[10px] font-bold bg-[#FBC2F3] border border-[#141414] px-2 py-0.5 rounded-full text-[#141414] truncate">
                {categoryMeta.label}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenHistory}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#141414] flex items-center justify-center text-[#141414] cursor-pointer"
                title="تاریخچه سوال‌ها"
                aria-label="تاریخچه سوال‌ها"
              >
                <History className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
              <span className="px-3 py-1 rounded-full bg-[#242424] text-white border-2 border-[#141414] text-[11px] font-black flex items-center gap-0.5 whitespace-nowrap">
                <span>{isRevealed ? "مشاهده پاسخ‌ها" : hasMyAnswer ? `منتظر ${partnerName}` : hasPartnerAnswer ? "پارتنر جواب داده" : "پاسخ دادن"}</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          <p className="mt-2.5 text-xs sm:text-sm font-black text-[#141414] leading-relaxed line-clamp-2">
            {question.text}
          </p>
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
