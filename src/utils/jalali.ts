// @ts-ignore
import { toJalaali, toGregorian, jalaaliMonthLength, isLeapJalaaliYear } from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
];

export const JALALI_WEEKDAYS = [
  "شنبه", "یک", "دو", "سه", "چهار", "پنج", "جمعه"
];

export function toPersianDigits(n: number | string): string {
  const farsiDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(n).replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const res = toJalaali(gy, gm, gd);
  return [res.jy, res.jm, res.jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const res = toGregorian(jy, jm, jd);
  return [res.gy, res.gm, res.gd];
}

export function getDaysInJalaliMonth(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

export function isJalaliLeapYear(jy: number): boolean {
  return isLeapJalaaliYear(jy);
}

export function getTehranDate(): Date {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const dateMap: { [key: string]: string } = {};
    parts.forEach(p => dateMap[p.type] = p.value);
    return new Date(
      parseInt(dateMap.year, 10),
      parseInt(dateMap.month, 10) - 1,
      parseInt(dateMap.day, 10),
      parseInt(dateMap.hour, 10),
      parseInt(dateMap.minute, 10),
      parseInt(dateMap.second, 10)
    );
  } catch {
    return new Date();
  }
}

export function formatPersianDate(dateStr: string, withYear: boolean = true): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const gy = parseInt(parts[0], 10);
  const gm = parseInt(parts[1], 10);
  const gd = parseInt(parts[2], 10);
  if (isNaN(gy) || isNaN(gm) || isNaN(gd)) return dateStr;
  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
  return withYear
    ? `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`
    : `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]}`;
}

export function toGregorianIsoString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
