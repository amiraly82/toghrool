import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  X,
  Sparkles,
  Lock,
  Heart,
  CheckCircle2,
  Send,
  History,
  Calendar
} from "lucide-react";
import { UserProfile, DailyQuestion, DailyQuestionAnswerState } from "../types";
import {
  getTehranDateString,
  getDailyQuestionForDate,
  QUESTION_CATEGORIES
} from "../utils/dailyQuestions";
import { fetchFromPhpApi } from "../apiClient";
import { toPersianDigits, gregorianToJalali, JALALI_MONTHS } from "../utils/jalali";

export interface DailyQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  partnerProfile: UserProfile | null;
  onAnswerSubmitted?: () => void;
}

export default function DailyQuestionModal({
  isOpen,
  onClose,
  userProfile,
  partnerProfile,
  onAnswerSubmitted
}: DailyQuestionModalProps) {
  const [todayDateStr] = useState<string>(() => getTehranDateString());
  const [question] = useState<DailyQuestion>(() => getDailyQuestionForDate(todayDateStr));

  const [answerState, setAnswerState] = useState<DailyQuestionAnswerState | null>(null);
  const [myInputAnswer, setMyInputAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justSubmittedWaiting, setJustSubmittedWaiting] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const partnerName = partnerProfile?.displayName || "پارتنر شما";
  const categoryMeta = QUESTION_CATEGORIES[question.category] || QUESTION_CATEGORIES.nostalgia;

  const jalaliDateFormatted = (() => {
    try {
      const parts = todayDateStr.split("-").map(Number);
      if (parts.length === 3) {
        const [jy, jm, jd] = gregorianToJalali(parts[0], parts[1], parts[2]);
        return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
      }
    } catch {}
    return todayDateStr;
  })();

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
      console.warn("Error fetching daily question status:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setJustSubmittedWaiting(false);
    }
  }, [isOpen, todayDateStr, userProfile.coupleId]);

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
        const isNowRevealed = !!res.isRevealed;

        setAnswerState({
          date: todayDateStr,
          question,
          myAnswer: res.myAnswer,
          myAnsweredAt: res.myAnsweredAt,
          hasPartnerAnswered: true,
          partnerAnswer: res.partnerAnswer || null,
          partnerAnsweredAt: null,
          isRevealed: isNowRevealed
        });

        const userKey = userProfile.uid || "me";
        try {
          localStorage.setItem(`toghrool_daily_q_modal_${userKey}_${todayDateStr}`, "true");
        } catch {}

        if (onAnswerSubmitted) {
          onAnswerSubmitted();
        }

        if (isNowRevealed) {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#EBA2F8", "#F29B47", "#5ED46A", "#FFFF66"]
          });
        } else {
          confetti({
            particleCount: 35,
            spread: 55,
            origin: { y: 0.65 }
          });
          setJustSubmittedWaiting(true);

          setTimeout(() => {
            setJustSubmittedWaiting(false);
            onClose();
          }, 1300);
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

  const isRevealed = answerState?.isRevealed === true;
  const hasMyAnswer = !!answerState?.myAnswer;
  const hasPartnerAnswer = answerState?.hasPartnerAnswered === true;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-[#1C1C1C]/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] w-full max-w-lg p-5 sm:p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] relative overflow-hidden text-right my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar: Category Pill & Close (X) */}
          <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b-[1.5px] border-[#1C1C1C]/20">
            <div className="flex items-center gap-2.5">
              <span className="w-11 h-11 rounded-full bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-lg shrink-0">
                {categoryMeta.emoji}
              </span>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-[#1C1C1C]">چالش ۳ دقیقه‌ای امروز</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBA2F8] text-[#1C1C1C] border-[1.5px] border-[#1C1C1C]">
                    {categoryMeta.label}
                  </span>
                </div>
                <span className="text-[10px] text-[#1C1C1C]/75 font-bold block mt-0.5">
                  {jalaliDateFormatted}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-10 h-10 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] transition-transform active:translate-y-0.5 cursor-pointer shrink-0"
              title="بستن"
            >
              <X className="w-4 h-4 stroke-[1.9]" />
            </button>
          </div>

          {/* Question Box */}
          <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 sm:p-5 mb-4">
            <h3 className="text-base sm:text-lg font-black text-[#1C1C1C] leading-relaxed">
              «{question.text}»
            </h3>
          </div>

          {/* --- CASE A: USER JUST SUBMITTED & WAITING AUTO-CLOSE --- */}
          {justSubmittedWaiting ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-2 bg-[#5ED46A] rounded-[24px] border-[1.5px] border-[#1C1C1C]"
            >
              <div className="w-12 h-12 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 stroke-[1.9]" />
              </div>
              <h4 className="text-sm sm:text-base font-bold text-[#1C1C1C]">
                پاسخ قشنگت ثبت شد! 💖
              </h4>
              <p className="text-xs text-[#1C1C1C]/80 font-medium max-w-[260px] mx-auto leading-relaxed">
                تا زمان ثبت پاسخ {partnerName}، پاسخت کاملاً محفوظ می‌ماند.
              </p>
            </motion.div>
          ) : isRevealed ? (
            /* --- CASE B: BOTH HAVE ANSWERED (BLIND REVEAL UNLOCKED) --- */
            <div className="space-y-4">
              <div className="bg-[#5ED46A] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-center justify-center gap-2 text-xs font-bold text-[#1C1C1C]">
                <Sparkles className="w-4 h-4 text-[#1C1C1C] stroke-[1.9]" />
                <span>قفل پاسخ‌های امروز باز شد! پاسخ‌های همدیگر را بخوانید 🥰</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* My Answer */}
                <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b-[1.5px] border-[#1C1C1C]/15">
                      <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1">
                        <span>پاسخ من</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      </span>
                      <span className="text-[10px] font-medium text-[#1C1C1C]/70">ثبت‌شده</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-[#1C1C1C] whitespace-pre-line leading-relaxed">
                      {answerState?.myAnswer}
                    </p>
                  </div>
                </div>

                {/* Partner Answer */}
                <div className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[22px] p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b-[1.5px] border-[#1C1C1C]/15">
                      <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1">
                        <span>پاسخ {partnerName}</span>
                        <Heart className="w-3.5 h-3.5 text-[#1C1C1C] fill-current" />
                      </span>
                      <span className="text-[10px] font-medium text-[#1C1C1C]/80">همگام</span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-[#1C1C1C] whitespace-pre-line leading-relaxed">
                      {answerState?.partnerAnswer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs sm:text-sm font-bold rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#FFFF66]" />
                  <span>دیدم و لذت بردم ✨ بستن</span>
                </button>
              </div>
            </div>
          ) : hasMyAnswer ? (
            /* --- CASE C: I ANSWERED, PARTNER HAS NOT YET --- */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* User's Answer */}
                <div className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] p-4">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b-[1.5px] border-[#1C1C1C]/15">
                    <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1">
                      <span>پاسخ من (ثبت شد)</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#1C1C1C] whitespace-pre-line leading-relaxed">
                    {answerState?.myAnswer}
                  </p>
                </div>

                {/* Locked Partner Preview */}
                <div className="relative bg-[#A9ABEE] border-[1.5px] border-[#1C1C1C] rounded-[22px] p-4 overflow-hidden flex flex-col items-center justify-center text-center min-h-[110px]">
                  <div className="w-10 h-10 rounded-full bg-white border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] flex items-center justify-center mb-2">
                    <Lock className="w-4 h-4 stroke-[1.9]" />
                  </div>
                  <p className="text-xs font-bold text-[#1C1C1C]">
                    در انتظار پاسخ {partnerName}
                  </p>
                  <p className="text-[10px] text-[#1C1C1C]/85 font-medium mt-1 max-w-[210px] leading-relaxed">
                    به محض ثبت پاسخ او، قفل هر دو جواب همزمان باز می‌شود!
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs font-bold rounded-full transition-colors cursor-pointer"
                >
                  بستن پنجره
                </button>
              </div>
            </div>
          ) : (
            /* --- CASE D: USER HAS NOT ANSWERED YET (MAIN MODAL ACTION) --- */
            <form onSubmit={handleSubmitAnswer} className="space-y-3.5">
              {hasPartnerAnswer && (
                <div className="bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] rounded-[20px] p-3 flex items-center gap-2.5 text-xs font-bold text-[#1C1C1C]">
                  <span className="text-base shrink-0">🎁</span>
                  <span>
                    {partnerName} به سوال امروز پاسخ داده است! برای باز شدن قفل و خواندن جوابش،
                    پاسخ خودت رو بنویس.
                  </span>
                </div>
              )}

              <div>
                <textarea
                  value={myInputAnswer}
                  onChange={(e) => setMyInputAnswer(e.target.value)}
                  placeholder="پاسخ صادقانه و دلنشین خودت رو اینجا بنویس..."
                  className="w-full px-4 py-3 bg-white border-[1.5px] border-[#1C1C1C] rounded-[22px] text-xs sm:text-sm text-[#1C1C1C] placeholder-[#1C1C1C]/50 h-28 resize-none font-medium focus:outline-none"
                  autoFocus
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] text-[#1C1C1C]/80 font-bold pr-1">
                  <Lock className="w-3.5 h-3.5 text-[#1C1C1C] shrink-0" />
                  <span>پاسخ شما تا زمان پاسخ پارتنر کاملاً مخفی و دوطرفه محفوظ می‌ماند.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !myInputAnswer.trim()}
                    className="flex-1 py-3.5 bg-[#1C1C1C] hover:bg-[#1C1C1C] text-white border-[1.5px] border-[#1C1C1C] text-xs sm:text-sm font-bold rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:translate-y-0.5"
                  >
                    <Send className="w-3.5 h-3.5 text-[#FFFF66]" />
                    <span>{isSubmitting ? "در حال ثبت..." : "ثبت پاسخ من"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-5 py-3.5 bg-white hover:bg-[#FFFF66] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-xs font-bold rounded-full transition-colors cursor-pointer shrink-0"
                  >
                    بعداً
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer: History Link */}
          <div className="mt-4 pt-3 border-t-[1.5px] border-[#1C1C1C]/20 flex items-center justify-between text-[11px] text-[#1C1C1C]">
            <button
              type="button"
              onClick={handleOpenHistory}
              className="flex items-center gap-1.5 font-bold bg-white border-[1.5px] border-[#1C1C1C] px-3 py-1.5 rounded-full hover:bg-[#FFFF66] transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 stroke-[1.9]" />
              <span>مشاهده تاریخچه چالش‌های قبلی</span>
            </button>
            <span className="text-[10px] font-bold text-[#1C1C1C]/75">طغرل ✦ ۳ دقیقه صمیمیت</span>
          </div>
        </motion.div>

        {/* --- SUB-MODAL: HISTORY --- */}
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
                className="bg-[#F6F4F0] border-[1.5px] border-[#1C1C1C] rounded-[28px] w-full max-w-lg p-5 sm:p-6 overflow-hidden max-h-[85vh] flex flex-col text-right shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)]"
              >
                <div className="flex items-center justify-between pb-3.5 border-b-[1.5px] border-[#1C1C1C]/20 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#EBA2F8] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C]">
                      <History className="w-5 h-5 stroke-[1.9]" />
                    </div>
                    <h3 className="text-base font-black text-[#1C1C1C]">تاریخچه چالش‌های روزانه</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="w-9 h-9 rounded-full bg-[#F29B47] border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] transition-colors cursor-pointer"
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
                    <div className="text-center py-10 bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-6">
                      <p className="text-xs text-[#1C1C1C] font-bold">
                        هنوز چالش بازگشایی‌شده‌ای ثبت نشده است. با پاسخ دادن به سوال امروز، اولین
                        خاطره را بسازید!
                      </p>
                    </div>
                  ) : (
                    historyList.map((item) => {
                      const qObj = getDailyQuestionForDate(item.questionDate);
                      return (
                        <div
                          key={item.id}
                          className="bg-white border-[1.5px] border-[#1C1C1C] rounded-[24px] p-4 space-y-2.5"
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
                              <span className="font-bold block text-[10px] text-[#1C1C1C]/75 mb-0.5">
                                پاسخ اول:
                              </span>
                              <p className="font-medium text-[#1C1C1C]">{item.user1Answer}</p>
                            </div>
                            <div className="bg-[#EBA2F8]/50 p-2.5 rounded-xl border-[1.5px] border-[#1C1C1C]">
                              <span className="font-bold block text-[10px] text-[#1C1C1C]/75 mb-0.5">
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
    </AnimatePresence>
  );
}
