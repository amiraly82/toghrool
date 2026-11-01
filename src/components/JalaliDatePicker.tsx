import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { 
  formatPersianDate, toPersianDigits, gregorianToJalali, jalaliToGregorian, 
  getDaysInJalaliMonth, JALALI_MONTHS, JALALI_WEEKDAYS, getTehranDate 
} from "../utils/jalali";

export interface JalaliDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function JalaliDatePicker({
  value,
  onChange,
  placeholder = "انتخاب تاریخ شمسی...",
  className = ""
}: JalaliDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const today = getTehranDate();
  const [todayJy, todayJm, todayJd] = gregorianToJalali(today.getFullYear(), today.getMonth() + 1, today.getDate());

  let initialYear = todayJy;
  let initialMonth = todayJm;

  if (value) {
    const parts = value.split("-");
    if (parts.length === 3) {
      const gy = parseInt(parts[0], 10);
      const gm = parseInt(parts[1], 10);
      const gd = parseInt(parts[2], 10);
      if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
        const [jy, jm] = gregorianToJalali(gy, gm, gd);
        initialYear = jy;
        initialMonth = jm;
      }
    }
  }

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        const gy = parseInt(parts[0], 10);
        const gm = parseInt(parts[1], 10);
        const gd = parseInt(parts[2], 10);
        if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
          const [jy, jm] = gregorianToJalali(gy, gm, gd);
          setViewYear(jy);
          setViewMonth(jm);
        }
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayNum: number) => {
    const [gy, gm, gd] = jalaliToGregorian(viewYear, viewMonth, dayNum);
    const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const [gy, gm, gd] = jalaliToGregorian(todayJy, todayJm, todayJd);
    const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 340 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const daysInMonth = getDaysInJalaliMonth(viewYear, viewMonth);
  const [gFirstY, gFirstM, gFirstD] = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDayGDate = new Date(gFirstY, gFirstM - 1, gFirstD);
  const offset = (firstDayGDate.getDay() + 1) % 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }

  let activeJy = -1;
  let activeJm = -1;
  let activeJd = -1;
  if (value) {
    const parts = value.split("-");
    if (parts.length === 3) {
      const gy = parseInt(parts[0], 10);
      const gm = parseInt(parts[1], 10);
      const gd = parseInt(parts[2], 10);
      if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
        [activeJy, activeJm, activeJd] = gregorianToJalali(gy, gm, gd);
      }
    }
  }

  const yearsRange = [];
  for (let y = todayJy - 15; y <= todayJy + 5; y++) {
    yearsRange.push(y);
  }

  return (
    <div ref={containerRef} className={`relative w-full text-right ${className}`} dir="rtl">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/30 flex items-center justify-between cursor-pointer shadow-sm hover:border-slate-300 transition-all font-medium"
      >
        <span className={value ? "text-slate-800 font-bold" : "text-slate-400"}>
          {value ? formatPersianDate(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 right-0 sm:left-auto sm:w-[320px] ${
              openUpward ? "bottom-full mb-2" : "top-full mt-2"
            } bg-white/98 backdrop-blur-md border border-pink-100 rounded-2xl shadow-2xl p-4 z-[999] text-right`}
          >
            {/* Header: Month and Year navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-all"
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="bg-slate-50 border border-slate-200 text-xs font-black rounded-lg px-2 py-1 text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {JALALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="bg-slate-50 border border-slate-200 text-xs font-black rounded-lg px-2 py-1 text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  {yearsRange.map((y) => (
                    <option key={y} value={y}>
                      {toPersianDigits(y)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition-all"
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] font-bold ${
                    idx === 6 ? "text-rose-500 font-black" : "text-slate-400"
                  }`}
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {cells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="h-8 w-8" />;
                }

                const isSelected =
                  activeJy === viewYear &&
                  activeJm === viewMonth &&
                  activeJd === dayNum;

                const isToday =
                  todayJy === viewYear &&
                  todayJm === viewMonth &&
                  todayJd === dayNum;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => handleSelectDay(dayNum)}
                    className={`h-8 w-8 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? "bg-rose-500 text-white shadow-md shadow-rose-200 scale-105"
                        : isToday
                        ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {toPersianDigits(dayNum)}
                  </button>
                );
              })}
            </div>

            {/* Action buttons (Today, Clear) */}
            <div className="flex items-center justify-between border-t border-slate-100 mt-3 pt-2 text-[11px] font-bold">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-rose-500 hover:text-rose-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
              >
                انتخاب امروز
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  پاک کردن
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
