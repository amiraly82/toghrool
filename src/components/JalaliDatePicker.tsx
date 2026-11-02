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
  for (let y = 1300; y <= todayJy + 10; y++) {
    yearsRange.push(y);
  }

  const handleMonthChange = (newMonth: number) => {
    setViewMonth(newMonth);
    const baseDay = activeJd > 0 ? activeJd : 1;
    const maxDay = getDaysInJalaliMonth(viewYear, newMonth);
    const clampedDay = Math.min(baseDay, maxDay);
    const [gy, gm, gd] = jalaliToGregorian(viewYear, newMonth, clampedDay);
    const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    onChange(dateStr);
  };

  const handleYearChange = (newYear: number) => {
    setViewYear(newYear);
    const baseDay = activeJd > 0 ? activeJd : 1;
    const maxDay = getDaysInJalaliMonth(newYear, viewMonth);
    const clampedDay = Math.min(baseDay, maxDay);
    const [gy, gm, gd] = jalaliToGregorian(newYear, viewMonth, clampedDay);
    const dateStr = `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
    onChange(dateStr);
  };

  return (
    <div ref={containerRef} className={`relative w-full text-right ${className}`} dir="rtl">
      <button
        type="button"
        onClick={toggleOpen}
        className="w-full px-4 py-3 bg-[#EFECE2] hover:bg-[#E5E0D2] border border-transparent focus:border-[#1B1B1A] rounded-2xl text-xs text-[#1B1B1A] focus:outline-none flex items-center justify-between cursor-pointer transition-colors font-medium"
      >
        <span className={value ? "text-[#1B1B1A] font-bold" : "text-[#78746B]"}>
          {value ? formatPersianDate(value) : placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-[#1B1B1A] stroke-[1.7]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? -8 : 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 right-0 sm:left-auto sm:w-[344px] ${
              openUpward ? "bottom-full mb-2" : "top-full mt-2"
            } bg-[#FFFDF8] border border-[#1B1B1A]/15 rounded-[28px] p-5 z-[999] text-right shadow-xl`}
          >
            {/* Header: < Month Year > */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A] cursor-pointer transition-colors"
                title="ماه قبل"
              >
                <ChevronRight className="w-4 h-4 stroke-[1.8]" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={viewMonth}
                  onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                  className="bg-[#EFECE2] hover:bg-[#E5E0D2] text-sm font-bold text-[#1B1B1A] cursor-pointer focus:outline-none text-center px-2.5 py-1.5 rounded-full transition-colors"
                >
                  {JALALI_MONTHS.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={viewYear}
                  onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
                  className="bg-[#EFECE2] hover:bg-[#E5E0D2] text-sm font-bold text-[#1B1B1A] cursor-pointer focus:outline-none text-center px-2.5 py-1.5 rounded-full transition-colors"
                >
                  {yearsRange.map((y) => (
                    <option key={y} value={y}>
                      {toPersianDigits(y)}
                    </option>
                  ))}
                </select>

                {(viewYear !== todayJy || viewMonth !== todayJm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewYear(todayJy);
                      setViewMonth(todayJm);
                    }}
                    className="px-2.5 py-1.5 bg-[#1B1B1A] hover:bg-[#2F2E2C] text-[#FAF6EC] rounded-full text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                    title="پرش به ماه و تاریخ امروز"
                  >
                    <CalendarIcon className="w-3 h-3 stroke-[2]" />
                    <span>امروز</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-9 h-9 rounded-full border border-dashed border-[#A6A297] hover:border-[#1B1B1A] hover:bg-[#EFECE2] flex items-center justify-center text-[#1B1B1A] cursor-pointer transition-colors"
                title="ماه بعد"
              >
                <ChevronLeft className="w-4 h-4 stroke-[1.8]" />
              </button>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-2 text-center mb-3">
              {JALALI_WEEKDAYS.map((w, idx) => (
                <span
                  key={idx}
                  className="text-xs font-medium text-[#78746B]"
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
                    className={`aspect-square rounded-[14px] transition-colors flex flex-col items-center justify-center cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#1B1B1A] text-[#FAF6EC]"
                        : isToday
                        ? "bg-[#F6C3E5] text-[#1B1B1A]"
                        : "bg-[#EFECE2] hover:bg-[#E5E0D2] text-[#1B1B1A]"
                    } ${isToday && !isSelected ? "border-[1.8px] border-dashed border-[#1B1B1A]" : ""}`}
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
            <div className="flex items-center justify-between border-t border-[#E8E2D4] mt-4 pt-3 text-xs font-bold">
              <button
                type="button"
                onClick={handleSelectToday}
                className="bg-[#1B1B1A] text-[#FAF6EC] hover:bg-[#2F2E2C] transition-colors cursor-pointer py-1.5 px-3.5 rounded-full text-[11px]"
              >
                انتخاب امروز
              </button>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[#78746B] hover:text-[#1B1B1A] transition-colors cursor-pointer py-1.5 px-3 rounded-full hover:bg-[#EFECE2] flex items-center gap-1 text-[11px]"
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
