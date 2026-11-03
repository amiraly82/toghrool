import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Sparkles, 
  Lock, 
  Unlock, 
  Send, 
  History, 
  X, 
  Heart, 
  CheckCircle2, 
  HelpCircle, 
  Clock, 
  MessageCircle,
  Eye,
  Calendar
} from "lucide-react";
import { DailyQuestion, DailyQuestionAnswerState, UserProfile } from "../types";
import { getDailyQuestionForDate, QUESTION_CATEGORIES } from "../utils/dailyQuestions";
import { fetchFromPhpApi } from "../apiClient";
import { toPersianDigits } from "../utils/jalali";

interface DailyQuestionCardProps {
  userProfile: UserProfile;
  partnerProfile: UserProfile | null;
  onRefreshProfile?: () => void;
}

export default function DailyQuestionCard({
  userProfile,
  partnerProfile
}: DailyQuestionCardProps) {
  const [todayDateStr, setTodayDateStr] = useState<string>(() => {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tehran",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });

  const [question, setQuestion] = useState<DailyQuestion>(() =>
    getDailyQuestionForDate(todayDateStr)
  );

  const [answerState, setAnswerState] = useState<DailyQuestionAnswerState | null>(null);
  const [myInputAnswer, setMyInputAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch daily question status from backend
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
        if (res.myAnswer) {
          setMyInputAnswer(res.myAnswer);
        }
      }
    } catch (e) {
      console.warn("Error fetching daily question state:", e);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Re-check periodically
    const timer = setInterval(fetchStatus, 8000);
    return () => clearInterval(timer);
  }, [todayDateStr, userProfile.coupleId]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myInputAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetchFromPhpApi("answerDailyQuestion", {
        date: todayDateStr,
        questionId: question.id,
        answer: myInputAnswer.trim()
      });

      if (res && res.status === "success") {
        setAnswerState((prev) => ({
          date: todayDateStr,
          question,
          myAnswer: res.myAnswer,
          myAnsweredAt: res.myAnsweredAt,
          hasPartnerAnswered: prev?.hasPartnerAnswered || false,
          partnerAnswer: res.partnerAnswer || null,
          partnerAnsweredAt: prev?.partnerAnsweredAt || null,
          isRevealed: !!res.isRevealed
        }));

        if (res.isRevealed) {
          // Both have answered - Celebrate!
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#F6C3E5", "#FF8DA1", "#FAF6EC", "#A7B86C", "#F6DC6B"]
          });
        } else {
          // Normal submit
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 }
          });
        }
      }
    } catch (err) {
      console.error("Error submitting daily answer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    setIsLoadingHistory(true);
    try {
      const res = await fetchFromPhpApi("getDailyQuestionsHistory", {});
      if (res && res.status === "success" && Array.isArray(res.history)) {
        setHistoryList(res.history);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const categoryMeta = QUESTION_CATEGORIES[question.category] || QUESTION_CATEGORIES.nostalgia;
  const partnerName = partnerProfile?.displayName || "پارتنر شما";

  const isRevealed = answerState?.isRevealed === true;
  const hasMyAnswer = !!answerState?.myAnswer;
  const hasPartnerAnswer = answerState?.hasPartnerAnswered === true;

  return (
    <div className="w-full mb-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-[28px] p-5 sm:p-6 shadow-xs relative overflow-hidden text-right"
      >
        {/* Top Header Track */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#FAF6EC] border border-[#E5E0D2] flex items-center justify-center text-base">
              {categoryMeta.emoji}
            </span>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] font-bold text-[#78746B]">چالش ۳ دقیقه‌ای امروز</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${categoryMeta.bg} ${categoryMeta.color} border ${categoryMeta.border}`}>
                  {categoryMeta.label}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenHistory}
            className="flex items-center gap-1 text-[11px] font-bold text-[#78746B] hover:text-[#1B1B1A] bg-[#FAF6EC] hover:bg-[#EFECE2] border border-[#E8E2D4] px-2.5 py-1.5 rounded-full transition-colors cursor-pointer"
            title="مشاهده تاریخچه پاسخ‌های قبلی"
          >
            <History className="w-3.5 h-3.5" />
            <span>تاریخچه</span>
          </button>
        </div>

        {/* Question Text */}
        <div className="mb-5">
          <h3 className="text-base sm:text-lg font-black text-[#1B1B1A] leading-relaxed">
            {question.text}
          </h3>
        </div>

        {/* --- SCENARIO 1: BOTH HAVE ANSWERED (BLIND REVEAL UNLOCKED) --- */}
        {isRevealed && (
          <div className="space-y-3.5">
            <div className="bg-[#FAF6EC] border border-[#E5E0D2] rounded-2xl p-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-[#1B1B1A]">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <span>قفل پاسخ‌های امروز باز شد! پاسخ‌های همدیگر را بخوانید 🥰</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* My Answer Card */}
              <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E8E2D4]/70">
                    <span className="text-xs font-black text-[#1B1B1A] flex items-center gap-1">
                      <span>پاسخ من</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    </span>
                    <span className="text-[10px] text-[#9E9A8F]">ثبت‌شده</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#1B1B1A] whitespace-pre-line leading-relaxed">
                    {answerState?.myAnswer}
                  </p>
                </div>
              </div>

              {/* Partner Answer Card */}
              <div className="bg-[#FFF0F7] border border-[#F8BBD0] rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#F8BBD0]/70">
                    <span className="text-xs font-black text-[#1B1B1A] flex items-center gap-1">
                      <span>پاسخ {partnerName}</span>
                      <Heart className="w-3.5 h-3.5 text-[#EC407A] fill-current" />
                    </span>
                    <span className="text-[10px] text-[#D81B60]">همگام</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#1B1B1A] whitespace-pre-line leading-relaxed">
                    {answerState?.partnerAnswer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SCENARIO 2: USER HAS ANSWERED, PARTNER HAS NOT YET --- */}
        {!isRevealed && hasMyAnswer && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* User's Answer */}
              <div className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#E8E2D4]">
                  <span className="text-xs font-black text-[#1B1B1A] flex items-center gap-1">
                    <span>پاسخ من (ثبت شد)</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#1B1B1A] whitespace-pre-line leading-relaxed">
                  {answerState?.myAnswer}
                </p>
              </div>

              {/* Locked Partner Preview */}
              <div className="relative bg-[#FAF6EC] border border-dashed border-[#D5CEBC] rounded-2xl p-4 overflow-hidden flex flex-col items-center justify-center text-center min-h-[100px]">
                <div className="w-9 h-9 rounded-full bg-[#EFECE2] text-[#78746B] flex items-center justify-center mb-2">
                  <Lock className="w-4 h-4" />
                </div>
                <p className="text-xs font-black text-[#1B1B1A]">
                  در انتظار پاسخ {partnerName}
                </p>
                <p className="text-[10px] text-[#78746B] mt-1 max-w-[200px] leading-relaxed">
                  به محض اینکه او هم پاسخ خود را بنویسد، قفل هر دو جواب همزمان باز می‌شود!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- SCENARIO 3: USER HAS NOT ANSWERED YET --- */}
        {!isRevealed && !hasMyAnswer && (
          <form onSubmit={handleSubmitAnswer} className="space-y-3">
            {hasPartnerAnswer && (
              <div className="bg-[#FFF0F7] border border-[#F8BBD0] rounded-2xl p-3 flex items-center gap-2 text-xs font-bold text-[#D81B60]">
                <span className="text-base">🎁</span>
                <span>{partnerName} به سوال امروز پاسخ داده است! برای باز شدن قفل و خواندن جوابش، پاسخ خودت رو بنویس.</span>
              </div>
            )}

            <div className="relative">
              <textarea
                value={myInputAnswer}
                onChange={(e) => setMyInputAnswer(e.target.value)}
                placeholder="پاسخ صادقانه و دلنشین خودت رو اینجا بنویس..."
                className="w-full px-4 py-3 bg-[#FAF6EC] focus:bg-[#FFFDF8] border border-[#E8E2D4] focus:border-[#1B1B1A] rounded-2xl text-xs sm:text-sm text-[#1B1B1A] placeholder-[#9E9A8F] h-24 resize-none font-medium focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[10px] font-medium text-[#78746B] flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#A6A297]" />
                <span>پاسخ شما تا زمان ثبت پاسخ پارتنر کاملاً محفوظ و مخفی می‌ماند.</span>
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !myInputAnswer.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#1B1B1A] hover:bg-[#323230] text-[#FAF6EC] text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "در حال ثبت..." : "ثبت پاسخ من"}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* --- HISTORY MODAL --- */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 bg-[#1B1B1A]/45 backdrop-blur-[2px] flex items-center justify-center p-4 z-50" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#FAF6EC] border border-[#E8E2D4] rounded-[32px] w-full max-w-lg p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D4] mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#F6C3E5] flex items-center justify-center text-[#1B1B1A]">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-[#1B1B1A]">تاریخچه گفت‌وگوهای روزانه</h3>
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
                      <div key={item.id} className="bg-[#FFFDF8] border border-[#E8E2D4] rounded-2xl p-4 space-y-2.5">
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
                        <h4 className="text-xs sm:text-sm font-black text-[#1B1B1A]">{qObj.text}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          <div className="bg-[#FAF6EC] p-2.5 rounded-xl border border-[#E8E2D4]">
                            <span className="font-bold block text-[10px] text-[#78746B] mb-0.5">پاسخ اول:</span>
                            <p className="font-semibold text-[#1B1B1A]">{item.user1Answer}</p>
                          </div>
                          <div className="bg-[#FFF0F7] p-2.5 rounded-xl border border-[#F8BBD0]">
                            <span className="font-bold block text-[10px] text-[#EC407A] mb-0.5">پاسخ دوم:</span>
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
