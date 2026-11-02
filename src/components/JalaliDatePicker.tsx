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
  for (let y = 1330; y <= todayJy + 5; y++) {
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
            className={`absolute left-0 right-0 sm:left-auto sm:w-[340px] ${
              openUpward ? "bottom-full mb-2" : "top-full mt-2"
            } bg-white border border-slate-100 rounded-3xl shadow-2xl p-5 z-[999] text-right`}
          >
            {/* Header: < Month Year > */}
            <div className="flex items-center justify-between mb-4 px-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-slate-100 rounded-xl text-[#1A1A1A] cursor-pointer transition-all"
                title="ماه قبل"
              >
                <ChevronRight className="w-5 h-5 stroke-[2]" />
              </button>

              <div className="flex items-center gap-1">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="bg-transparent text-base font-bold text-[#1A1A1A] cursor-pointer focus:outline-none text-center appearance-none hover:bg-slate-50 px-1.5 py-0.5 rounded-lg"
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
                  className="bg-transparent text-base font-bold text-[#1A1A1A] cursor-pointer focus:outline-none text-center appearance-none hover:bg-slate-50 px-1.5 py-0.5 rounded-lg"
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
                className="p-1.5 hover:bg-slate-100 rounded-xl text-[#1A1A1A] cursor-pointer transition-all"
                title="ماه بعد"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2]" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-2 text-center mb-3">
              {JALALI_WEEKDAYS.map((w, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-[#757575]"
                >
                  {w}
                </span>
              ))}
            </div>

            {/* Day grid (Squircle Tiles) */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {cells.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
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
                    className={`aspect-square rounded-[14px] transition-all flex flex-col items-center justify-center cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#1B9AAA] text-white shadow-sm"
                        : isToday
                        ? "bg-[#F9CCD8] text-[#7D243C]"
                        : "bg-[#F7F7F7] hover:bg-[#EFEFEF] text-[#1E1E1E]"
                    } ${isToday ? "border-2 border-dashed border-[#222222]" : ""}`}
                  >
                    <span className="text-xs font-bold leading-none">
                      {toPersianDigits(dayNum)}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold leading-none mt-0.5">
                        امروز
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons (Today, Clear) */}
            <div className="flex items-center justify-between border-t border-slate-100 mt-4 pt-2.5 text-xs font-bold">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[#1B9AAA] hover:opacity-80 transition-opacity cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-50"
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
