import { ImpoPeriodSettings, CycleGoalMode, ImpoDailyLog } from "../types";
import { formatPersianDate, toPersianDigits, toGregorianIsoString, gregorianToJalali, JALALI_MONTHS } from "./jalali";

export type CyclePhaseType = 
  | 'period'
  | 'follicular'
  | 'fertile'
  | 'ovulation'
  | 'luteal'
  | 'pms'
  | 'due'
  | 'delayed';

export interface CycleStatusResult {
  diffDays: number;
  currentCycleDay: number;
  isDelayed: boolean;
  delayedDays: number;
  cycleLength: number;
  periodLength: number;
  ovulationDay: number;
  fertileStartDay: number;
  fertileEndDay: number;
  pmsStartDay: number;
  daysUntilNextPeriod: number;
  phase: CyclePhaseType;
  phaseTitle: string;
  phaseSubtitle: string;
  stageDescription: string;
  stageColor: {
    primary: string;
    light: string;
    border: string;
    gradient: string;
    badgeBg: string;
    text: string;
  };
  chanceOfPregnancy: string;
  progressPercent: number;
  selfCareTip: string;
  partnerTip: string;
  nutritionTip: string;
}

export interface CycleHistoryItem {
  cycleIndex: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (start of next cycle)
  lengthDays: number;
  isValid: boolean;
  exclusionReason?: 'out_of_bounds' | 'mad_outlier';
}

export interface CycleLengthEstimate {
  mean: number;
  median: number;
  sd: number;
  nCycles: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface DateInterval {
  median: string; // YYYY-MM-DD
  lo80: string; // YYYY-MM-DD
  hi80: string; // YYYY-MM-DD
  rangePersian?: string;
}

export interface CyclePredictionItem {
  cycleIndex: number;
  nextStart: DateInterval;
  ovulation: DateInterval;
  fertileWindow: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
    rangePersian?: string;
  };
  daysUntilStart: number;
  isDelayed: boolean;
  delayedDays: number;
}

export interface CyclePredictionResult {
  nextStart: DateInterval;
  ovulation: DateInterval;
  fertileWindow: {
    start: string;
    end: string;
    rangePersian?: string;
  };
  nCycles: number;
  confidence: 'low' | 'medium' | 'high';
  estimatedCycleLength: number;
  estimatedCycleSd: number;
  isPregnant: boolean;
  pregnancyMessage?: string;
  hasOvulationPeakSignal?: boolean;
  ovulationPeakDate?: string;
  isFertileDischargeObserved?: boolean;
  cycles: CyclePredictionItem[];
}

export interface PredictedCycle {
  cycleIndex: number;
  startDateIso: string;
  startDatePersian: string;
  startDateRangePersian?: string;
  lo80Iso?: string;
  hi80Iso?: string;
  daysUntilStart: number;
  isDelayed: boolean;
  delayedDays: number;
  ovulationDateIso: string;
  ovulationDatePersian: string;
  ovulationDateRangePersian?: string;
  fertileWindowStartPersian: string;
  fertileWindowEndPersian: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface BiorhythmResult {
  physical: number; // -100 to 100
  emotional: number;
  intellectual: number;
  daysAlive: number;
  summary: string;
}

/**
 * Calculates calendar day difference (b - a) normalized to UTC midnight.
 * Guarantees no 1-day off errors during Daylight Saving Time (DST) switches (e.g. March 29 / October 31).
 */
export function daysBetween(a: Date | string, b: Date | string): number {
  const toUtc = (input: Date | string): number => {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return Date.UTC(parts[0], parts[1] - 1, parts[2]);
      }
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const utcA = toUtc(a);
  const utcB = toUtc(b);
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Adds integer days to an ISO YYYY-MM-DD date string using UTC arithmetic.
 */
export function addDays(dateIso: string, days: number): string {
  const parts = dateIso.split('T')[0].split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Calculates statistical median of a numeric array.
 */
export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculates Median Absolute Deviation (MAD).
 */
export function calculateMad(numbers: number[], median?: number): number {
  if (numbers.length === 0) return 0;
  const med = median !== undefined ? median : calculateMedian(numbers);
  const deviations = numbers.map(x => Math.abs(x - med));
  return calculateMedian(deviations);
}

/**
 * Formats a Persian date range string cleanly (e.g. "حدوداً ۱۱ تا ۱۴ آبان").
 */
export function formatDateRangePersian(startIso: string, endIso: string): string {
  if (!startIso) return "";
  if (!endIso || startIso === endIso) {
    return formatPersianDate(startIso, false);
  }

  const [gy1, gm1, gd1] = startIso.split('T')[0].split('-').map(Number);
  const [gy2, gm2, gd2] = endIso.split('T')[0].split('-').map(Number);

  if (isNaN(gy1) || isNaN(gm1) || isNaN(gd1) || isNaN(gy2) || isNaN(gm2) || isNaN(gd2)) {
    return `${startIso} تا ${endIso}`;
  }

  const [jy1, jm1, jd1] = gregorianToJalali(gy1, gm1, gd1);
  const [jy2, jm2, jd2] = gregorianToJalali(gy2, gm2, gd2);

  if (jy1 === jy2 && jm1 === jm2 && jd1 === jd2) {
    return `${toPersianDigits(jd1)} ${JALALI_MONTHS[jm1 - 1]}`;
  }

  if (jy1 === jy2 && jm1 === jm2) {
    return `حدوداً ${toPersianDigits(jd1)} تا ${toPersianDigits(jd2)} ${JALALI_MONTHS[jm1 - 1]}`;
  }

  if (jy1 === jy2) {
    return `حدوداً ${toPersianDigits(jd1)} ${JALALI_MONTHS[jm1 - 1]} تا ${toPersianDigits(jd2)} ${JALALI_MONTHS[jm2 - 1]}`;
  }

  return `حدوداً ${toPersianDigits(jd1)} ${JALALI_MONTHS[jm1 - 1]} ${toPersianDigits(jy1)} تا ${toPersianDigits(jd2)} ${JALALI_MONTHS[jm2 - 1]} ${toPersianDigits(jy2)}`;
}

/**
 * 1) History: Builds consecutive start intervals from logs with isPeriodStart=true and settings.cycleHistory.
 * Excludes cycles outside [18, 60] days or > 3 MAD from median from estimation while keeping them in history.
 */
export function extractCycleHistory(
  logs: ImpoDailyLog[] = [],
  settings?: ImpoPeriodSettings
): CycleHistoryItem[] {
  const dateSet = new Set<string>();

  for (const log of logs) {
    if (log.isPeriodStart && log.date) {
      dateSet.add(log.date.split('T')[0]);
    }
  }

  if (settings?.cycleHistory) {
    for (const h of settings.cycleHistory) {
      if (h.startDate) {
        dateSet.add(h.startDate.split('T')[0]);
      }
    }
  }

  if (settings?.lastPeriodStartDate) {
    dateSet.add(settings.lastPeriodStartDate.split('T')[0]);
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));

  // Deduplicate start dates closer than 10 days (prevent double clicks/accidental multi-starts)
  const dedupedDates: string[] = [];
  for (const d of sortedDates) {
    if (dedupedDates.length === 0) {
      dedupedDates.push(d);
    } else {
      const prev = dedupedDates[dedupedDates.length - 1];
      if (daysBetween(prev, d) >= 10) {
        dedupedDates.push(d);
      }
    }
  }

  const rawIntervals: Array<{ startDate: string; endDate: string; lengthDays: number }> = [];
  for (let i = 0; i < dedupedDates.length - 1; i++) {
    const s = dedupedDates[i];
    const e = dedupedDates[i + 1];
    rawIntervals.push({
      startDate: s,
      endDate: e,
      lengthDays: daysBetween(s, e)
    });
  }

  // Fallback for pre-configured history items with explicit cycleLength
  if (rawIntervals.length === 0 && settings?.cycleHistory && settings.cycleHistory.length > 0) {
    for (const h of settings.cycleHistory) {
      if (h.cycleLength && h.cycleLength > 0) {
        const s = h.startDate || '2026-01-01';
        const e = addDays(s, h.cycleLength);
        rawIntervals.push({
          startDate: s,
          endDate: e,
          lengthDays: h.cycleLength
        });
      }
    }
  }

  if (rawIntervals.length === 0) {
    return [];
  }

  // Filter bounded lengths within [18, 60] for outlier calculation
  const boundedLengths = rawIntervals
    .filter(it => it.lengthDays >= 18 && it.lengthDays <= 60)
    .map(it => it.lengthDays);

  const medianBounded = boundedLengths.length > 0 ? calculateMedian(boundedLengths) : 28;
  const madBounded = boundedLengths.length > 0 ? calculateMad(boundedLengths, medianBounded) : 0;
  // Use effective minimum threshold of 3 days to prevent zero-scale breakdown on identical cycle records
  const madThreshold = Math.max(3 * madBounded, 3.0);

  return rawIntervals.map((item, idx) => {
    let isValid = true;
    let exclusionReason: 'out_of_bounds' | 'mad_outlier' | undefined;

    if (item.lengthDays < 18 || item.lengthDays > 60) {
      isValid = false;
      exclusionReason = 'out_of_bounds';
    } else if (boundedLengths.length >= 3 && Math.abs(item.lengthDays - medianBounded) > madThreshold) {
      isValid = false;
      exclusionReason = 'mad_outlier';
    }

    return {
      cycleIndex: idx + 1,
      startDate: item.startDate,
      endDate: item.endDate,
      lengthDays: item.lengthDays,
      isValid,
      exclusionReason
    };
  });
}

/**
 * 2) Cycle Length Estimation:
 * Median of up to last 6 valid cycles + Bayesian shrinkage to population prior (mu0=28, sigma0=3.5, w0=2).
 * Standard deviation estimated with identical shrinkage.
 */
export function estimateCycleLength(
  history: CycleHistoryItem[],
  initialPriorMean: number = 28
): CycleLengthEstimate {
  const mu0 = initialPriorMean > 0 ? initialPriorMean : 28;
  const sigma0 = 3.5;
  const w0 = 2;

  const validCycles = history.filter(h => h.isValid);
  const recent = validCycles.slice(-6);
  const n = recent.length;

  if (n === 0) {
    return {
      mean: mu0,
      median: mu0,
      sd: sigma0,
      nCycles: 0,
      confidence: 'low'
    };
  }

  const lengths = recent.map(r => r.lengthDays);
  const mObs = calculateMedian(lengths);

  let sObs = sigma0;
  if (n >= 2) {
    const meanObs = lengths.reduce((acc, v) => acc + v, 0) / n;
    const variance = lengths.reduce((acc, v) => acc + Math.pow(v - meanObs, 2), 0) / (n - 1);
    sObs = Math.sqrt(variance);
  }

  const muEst = (w0 * mu0 + n * mObs) / (w0 + n);
  const sigmaEst = Math.max(1.0, (w0 * sigma0 + n * sObs) / (w0 + n));

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (n >= 6) {
    confidence = sigmaEst <= 2.5 ? 'high' : 'medium';
  } else if (n >= 3) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    mean: muEst,
    median: muEst,
    sd: sigmaEst,
    nCycles: n,
    confidence
  };
}

/**
 * 3 & 4) predictCycle:
 * Predicts nextStart {median, lo80, hi80}, ovulation {median, lo80, hi80}, fertileWindow {start, end}.
 * Luteal phase default 13 +- 2 days. Ovulation variance = max(1.0, sigma_cycle^2 - 4).
 * For k-th future cycle, widens interval with sqrt(k). Shows next 2 cycles.
 * Handles recorded signals: ovulation peak, clear discharge, positive pregnancy test.
 */
export function predictCycle(
  history: CycleHistoryItem[],
  logs: ImpoDailyLog[] = [],
  today: Date = new Date(),
  settings?: ImpoPeriodSettings,
  count: number = 2
): CyclePredictionResult {
  const userPrior = settings?.cycleLength && settings.cycleLength >= 18 && settings.cycleLength <= 60 
    ? settings.cycleLength 
    : 28;

  const estimate = estimateCycleLength(history, userPrior);
  const todayIso = toGregorianIsoString(today);

  // Determine latest known period start date
  let latestStartIso = settings?.lastPeriodStartDate;
  if (!latestStartIso) {
    const startLogs = logs.filter(l => l.isPeriodStart).map(l => l.date.split('T')[0]).sort();
    if (startLogs.length > 0) {
      latestStartIso = startLogs[startLogs.length - 1];
    } else {
      latestStartIso = todayIso;
    }
  }

  // Filter logs in current cycle (on or after latest period start date)
  const currentCycleLogs = logs.filter(l => l.date >= latestStartIso);

  // 4) Check for recorded positive pregnancy test
  const hasPositivePregnancy = currentCycleLogs.some(l => l.pregnancyTestResult === 'positive');
  if (hasPositivePregnancy) {
    return {
      nextStart: { median: todayIso, lo80: todayIso, hi80: todayIso },
      ovulation: { median: todayIso, lo80: todayIso, hi80: todayIso },
      fertileWindow: { start: todayIso, end: todayIso },
      nCycles: estimate.nCycles,
      confidence: estimate.confidence,
      estimatedCycleLength: estimate.mean,
      estimatedCycleSd: estimate.sd,
      isPregnant: true,
      pregnancyMessage: "تبریک! تست بارداری مثبت ثبت شده است 🌸🤰 پیش‌بینی دوره‌های قاعدگی متوقف شد. برای مراقبت‌های بارداری با پزشک مشورت کنید.",
      cycles: []
    };
  }

  // 4) Check for ovulation test peak signal
  const peakLogs = currentCycleLogs
    .filter(l => l.ovulationTestResult === 'positive_peak')
    .sort((a, b) => b.date.localeCompare(a.date));
  const peakLog = peakLogs.length > 0 ? peakLogs[0] : null;

  // 4) Supporting sign: clear discharge
  const isFertileDischargeObserved = currentCycleLogs.some(l => l.discharge === 'clear');

  const z80 = 1.28155; // 80% coverage multiplier for normal distribution
  const cycles: CyclePredictionItem[] = [];

  if (peakLog) {
    // Ovulation is the day after peak; Next period = ovulation + 13
    const ovMedianIso = addDays(peakLog.date, 1);
    const ovLoIso = ovMedianIso;
    const ovHiIso = addDays(ovMedianIso, 1);

    const nextStartMedianIso = addDays(ovMedianIso, 13);
    const lutealSd = 2.0;
    const nextStartHalfWidth = Math.round(z80 * lutealSd);
    const nextStartLoIso = addDays(nextStartMedianIso, -nextStartHalfWidth);
    const nextStartHiIso = addDays(nextStartMedianIso, nextStartHalfWidth);

    const fertileStartIso = addDays(ovMedianIso, -5);
    const fertileEndIso = addDays(ovMedianIso, 1);

    const daysUntilStart = daysBetween(todayIso, nextStartMedianIso);
    const isDelayed = daysUntilStart < 0;
    const delayedDays = isDelayed ? Math.abs(daysUntilStart) : 0;

    const cycle1: CyclePredictionItem = {
      cycleIndex: 1,
      nextStart: {
        median: nextStartMedianIso,
        lo80: nextStartLoIso,
        hi80: nextStartHiIso,
        rangePersian: formatDateRangePersian(nextStartLoIso, nextStartHiIso)
      },
      ovulation: {
        median: ovMedianIso,
        lo80: ovLoIso,
        hi80: ovHiIso,
        rangePersian: formatDateRangePersian(ovLoIso, ovHiIso)
      },
      fertileWindow: {
        start: fertileStartIso,
        end: fertileEndIso,
        rangePersian: formatDateRangePersian(fertileStartIso, fertileEndIso)
      },
      daysUntilStart,
      isDelayed,
      delayedDays
    };
    cycles.push(cycle1);

    // Subsequent cycles advance from Cycle 1's median with standard Bayesian shrinkage & sqrt(k)
    for (let k = 2; k <= count; k++) {
      const sigmaK = estimate.sd * Math.sqrt(k);
      const cycleKStartMedianIso = addDays(nextStartMedianIso, Math.round((k - 1) * estimate.mean));
      const cycleKStartHw = Math.round(z80 * sigmaK);
      const cycleKStartLoIso = addDays(cycleKStartMedianIso, -cycleKStartHw);
      const cycleKStartHiIso = addDays(cycleKStartMedianIso, cycleKStartHw);

      const cycleKOvMedianIso = addDays(cycleKStartMedianIso, -13);
      const cycleKOvVar = Math.max(1.0, Math.pow(sigmaK, 2) - 4);
      const cycleKOvHw = Math.round(z80 * Math.sqrt(cycleKOvVar));
      const cycleKOvLoIso = addDays(cycleKOvMedianIso, -cycleKOvHw);
      const cycleKOvHiIso = addDays(cycleKOvMedianIso, cycleKOvHw);

      const cycleKFertileStart = addDays(cycleKOvLoIso, -5);
      const cycleKFertileEnd = addDays(cycleKOvHiIso, 1);

      const daysUntilStartK = daysBetween(todayIso, cycleKStartMedianIso);

      cycles.push({
        cycleIndex: k,
        nextStart: {
          median: cycleKStartMedianIso,
          lo80: cycleKStartLoIso,
          hi80: cycleKStartHiIso,
          rangePersian: formatDateRangePersian(cycleKStartLoIso, cycleKStartHiIso)
        },
        ovulation: {
          median: cycleKOvMedianIso,
          lo80: cycleKOvLoIso,
          hi80: cycleKOvHiIso,
          rangePersian: formatDateRangePersian(cycleKOvLoIso, cycleKOvHiIso)
        },
        fertileWindow: {
          start: cycleKFertileStart,
          end: cycleKFertileEnd,
          rangePersian: formatDateRangePersian(cycleKFertileStart, cycleKFertileEnd)
        },
        daysUntilStart: daysUntilStartK,
        isDelayed: daysUntilStartK < 0,
        delayedDays: daysUntilStartK < 0 ? Math.abs(daysUntilStartK) : 0
      });
    }
  } else {
    // Normal Bayesian prediction for future cycles with sqrt(k) widening
    for (let k = 1; k <= count; k++) {
      const sigmaK = estimate.sd * Math.sqrt(k);
      const daysOffset = Math.round(k * estimate.mean);
      const nextStartMedianIso = addDays(latestStartIso, daysOffset);

      const nextStartHw = Math.round(z80 * sigmaK);
      const nextStartLoIso = addDays(nextStartMedianIso, -nextStartHw);
      const nextStartHiIso = addDays(nextStartMedianIso, nextStartHw);

      // Ovulation: median = nextStart - 13 days
      const ovMedianIso = addDays(nextStartMedianIso, -13);
      // Variance formula: sigma_ov^2 = max(1.0, sigma_k^2 - 4)
      const ovVar = Math.max(1.0, Math.pow(sigmaK, 2) - 4);
      const ovSd = Math.sqrt(ovVar);
      const ovHw = Math.round(z80 * ovSd);
      const ovLoIso = addDays(ovMedianIso, -ovHw);
      const ovHiIso = addDays(ovMedianIso, ovHw);

      // Fertile window covers 5 days before ovulation up to 1 day after
      const fertileStartIso = addDays(ovLoIso, -5);
      const fertileEndIso = addDays(ovHiIso, 1);

      const daysUntilStart = daysBetween(todayIso, nextStartMedianIso);
      const isDelayed = daysUntilStart < 0;
      const delayedDays = isDelayed ? Math.abs(daysUntilStart) : 0;

      cycles.push({
        cycleIndex: k,
        nextStart: {
          median: nextStartMedianIso,
          lo80: nextStartLoIso,
          hi80: nextStartHiIso,
          rangePersian: formatDateRangePersian(nextStartLoIso, nextStartHiIso)
        },
        ovulation: {
          median: ovMedianIso,
          lo80: ovLoIso,
          hi80: ovHiIso,
          rangePersian: formatDateRangePersian(ovLoIso, ovHiIso)
        },
        fertileWindow: {
          start: fertileStartIso,
          end: fertileEndIso,
          rangePersian: formatDateRangePersian(fertileStartIso, fertileEndIso)
        },
        daysUntilStart,
        isDelayed,
        delayedDays
      });
    }
  }

  const primaryCycle = cycles[0];

  return {
    nextStart: primaryCycle.nextStart,
    ovulation: primaryCycle.ovulation,
    fertileWindow: primaryCycle.fertileWindow,
    nCycles: estimate.nCycles,
    confidence: estimate.confidence,
    estimatedCycleLength: estimate.mean,
    estimatedCycleSd: estimate.sd,
    isPregnant: false,
    hasOvulationPeakSignal: Boolean(peakLog),
    ovulationPeakDate: peakLog ? peakLog.date : undefined,
    isFertileDischargeObserved,
    cycles
  };
}

/**
 * Predicts subsequent cycle starts advancing predictably from the base expected period.
 * Returns only 2 future cycles formatted for display.
 */
export function predictFutureCycles(
  settings: ImpoPeriodSettings,
  count: number = 2,
  logs: ImpoDailyLog[] = []
): PredictedCycle[] {
  const history = extractCycleHistory(logs, settings);
  const prediction = predictCycle(history, logs, new Date(), settings, count);

  if (prediction.isPregnant) {
    return [];
  }

  return prediction.cycles.slice(0, count).map(c => ({
    cycleIndex: c.cycleIndex,
    startDateIso: c.nextStart.median,
    startDatePersian: formatPersianDate(c.nextStart.median),
    startDateRangePersian: c.nextStart.rangePersian,
    lo80Iso: c.nextStart.lo80,
    hi80Iso: c.nextStart.hi80,
    daysUntilStart: c.daysUntilStart,
    isDelayed: c.isDelayed,
    delayedDays: c.delayedDays,
    ovulationDateIso: c.ovulation.median,
    ovulationDatePersian: formatPersianDate(c.ovulation.median),
    ovulationDateRangePersian: c.ovulation.rangePersian,
    fertileWindowStartPersian: formatPersianDate(c.fertileWindow.start, false),
    fertileWindowEndPersian: formatPersianDate(c.fertileWindow.end, false),
    confidence: prediction.confidence
  }));
}

/**
 * Calculates cycle status and current phase according to clinical standards.
 */
export function calculateCycleStatus(
  settings: ImpoPeriodSettings,
  today: Date = new Date(),
  overrideCycleLength?: number
): CycleStatusResult {
  const effectiveLength = overrideCycleLength || settings.cycleLength || 28;
  const cycleLength = Math.max(18, Math.min(60, effectiveLength));
  const periodLength = Math.max(2, Math.min(15, settings.periodLength || 5));
  const goalMode: CycleGoalMode = settings.goalMode || 'track';

  const diffDays = daysBetween(settings.lastPeriodStartDate, today);

  // Ovulation & Fertile window calculations (Clinical Standard: 14 days before next period)
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  const fertileStartDay = Math.max(periodLength + 1, ovulationDay - 5);
  const fertileEndDay = Math.min(cycleLength - 2, ovulationDay + 1);
  const pmsStartDay = Math.max(fertileEndDay + 1, cycleLength - 5);

  let currentCycleDay = 1;
  let isDelayed = false;
  let delayedDays = 0;
  let daysUntilNextPeriod = 0;
  let phase: CyclePhaseType = 'follicular';

  if (diffDays < 0) {
    currentCycleDay = 1;
    isDelayed = false;
    delayedDays = 0;
    daysUntilNextPeriod = Math.abs(diffDays);
    phase = 'follicular';
  } else if (diffDays === cycleLength) {
    currentCycleDay = cycleLength + 1;
    isDelayed = false;
    delayedDays = 0;
    daysUntilNextPeriod = 0;
    phase = 'due';
  } else if (diffDays > cycleLength) {
    isDelayed = true;
    delayedDays = diffDays - cycleLength;
    currentCycleDay = diffDays + 1;
    daysUntilNextPeriod = 0;
    phase = 'delayed';
  } else {
    currentCycleDay = diffDays + 1;
    delayedDays = 0;
    isDelayed = false;
    daysUntilNextPeriod = cycleLength - diffDays;

    if (currentCycleDay <= periodLength) {
      phase = 'period';
    } else if (currentCycleDay === ovulationDay) {
      phase = 'ovulation';
    } else if (currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay) {
      phase = 'fertile';
    } else if (currentCycleDay >= pmsStartDay) {
      phase = 'pms';
    } else if (currentCycleDay > fertileEndDay) {
      phase = 'luteal';
    } else {
      phase = 'follicular';
    }
  }

  let phaseTitle = "";
  let phaseSubtitle = "";
  let stageDescription = "";
  let chanceOfPregnancy = "بسیار کم";
  let selfCareTip = "";
  let partnerTip = "";
  let nutritionTip = "";

  let stageColor = {
    primary: "#F6C3E5",
    light: "rgba(246, 195, 229, 0.35)",
    border: "#E5ADD2",
    gradient: "from-[#F6C3E5] to-[#E5ADD2]",
    badgeBg: "bg-[#F6C3E5] text-[#1B1B1A] border-[#E5ADD2]",
    text: "text-[#1B1B1A]"
  };

  switch (phase) {
    case 'due':
      phaseTitle = "امروز زمان مورد انتظار پریود است ⏳";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "روز موعد مورد انتظار قاعدگی"
        : "امروز موعد آغاز پریود شماست";
      stageDescription = "امروز روز موعد و پیش‌بینی‌شده برای آغاز دوره قاعدگی شماست. دیواره رحم در آستانه چرخه جدید قرار دارد. به نشانه‌های بدنتان توجه کنید و آرامش داشته باشید.";
      stageColor = {
        primary: "#F6C3E5",
        light: "rgba(246, 195, 229, 0.35)",
        border: "#E5ADD2",
        gradient: "from-[#F6C3E5] to-[#E5ADD2]",
        badgeBg: "bg-[#F6C3E5] text-[#1B1B1A] border-[#E5ADD2]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "پدهای بهداشتی را در دسترس داشته باشید، لباس‌های راحت بپوشید و نوشیدنی‌های گرم میل کنید.";
      partnerTip = "امروز روز موعد پریود همسرتان است؛ با همدلی و فراهم کردن محیطی آرام در کنار او باشید.";
      nutritionTip = "نوشیدن آب گرم و چای بابونه یا زنجبیل به آرامش عضلات رحم کمک می‌کند.";
      break;

    case 'delayed':
      if (diffDays >= 90) {
        phaseTitle = "نیاز به مشورت با پزشک 🩺";
        phaseSubtitle = "بیش از ۳ ماه عدم قاعدگی";
        stageDescription = "اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.";
        chanceOfPregnancy = "نیاز به بررسی تخصصی";
      } else if (diffDays >= 45) {
        phaseTitle = "ثبت شروع پریود جدید 🌸";
        phaseSubtitle = "پریودت شروع شده؟ همین حالا ثبتش کن";
        stageDescription = "اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید.";
        chanceOfPregnancy = "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود";
      } else {
        phaseTitle = `تاخیر در قاعدگی (${toPersianDigits(delayedDays)} روز تاخیر) ⚠️`;
        if (delayedDays >= 2) {
          phaseSubtitle = goalMode === 'pregnancy'
            ? "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود"
            : `${toPersianDigits(delayedDays)} روز از موعد گذشته است`;
          stageDescription = "تاریخ سررسید پریود شما سپری شده است. نوسانات هورمونی، تغییرات وزنی یا استرس می‌توانند علت تاخیر باشند. اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود.";
          chanceOfPregnancy = "اگر احتمال بارداری هست، بررسی تست بیبی‌چک پیشنهاد می‌شود";
        } else {
          phaseSubtitle = "۱ روز از موعد مورد انتظار گذشته است";
          stageDescription = "یک روز تاخیر در چرخه قاعدگی کاملاً متداول و طبیعی است و اغلب ناشی از استرس روزمره، کم‌خوابی یا تغییرات فصلی است. نیازی به نگرانی نیست.";
          chanceOfPregnancy = "کم";
        }
      }
      stageColor = {
        primary: "#F9C6B8",
        light: "rgba(249, 198, 184, 0.35)",
        border: "#E5A898",
        gradient: "from-[#F9C6B8] to-[#F6C3E5]",
        badgeBg: "bg-[#F9C6B8] text-[#1B1B1A] border-[#E5A898]",
        text: "text-[#D94E4E]"
      };
      selfCareTip = "آرامش خود را حفظ کنید و استرس را کاهش دهید. خواب منظم و نوشیدن دم‌نوش‌های آرام‌بخش توصیه می‌شود.";
      partnerTip = "با آرامش و بدون استرس در کنار او باشید. احساس اطمینان خاطر بهترین کمک شما در این روزهاست.";
      nutritionTip = "آب فراوان بنوشید و از مصرف بیش از حد قهوه و ادویه‌های تند خودداری کنید.";
      break;

    case 'period':
      phaseTitle = `دوران قاعدگی (پریود) 🩸`;
      phaseSubtitle = `روز ${toPersianDigits(currentCycleDay)} از دوره خونریزی`;
      stageDescription = "سطح هورمون‌های استروژن و پروژسترون در پایین‌ترین حد است. دیواره رحم در حال پاکسازی و بازسازی است و بدن نیاز مبرم به استراحت و مراقبت گرم دارد.";
      stageColor = {
        primary: "#F6C3E5",
        light: "rgba(246, 195, 229, 0.35)",
        border: "#E5ADD2",
        gradient: "from-[#F6C3E5] to-[#E5ADD2]",
        badgeBg: "bg-[#F6C3E5] text-[#1B1B1A] border-[#E5ADD2]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "استفاده از کیسه آب گرم روی شکم و کمر، دوش آب ولرم و استراحت کافی دردهای عضلانی را به شدت کاهش می‌دهد.";
      partnerTip = "یک فنجان دمنوش گرم (بابونه، زنجبیل یا نبات‌داغ) برای او آماده کنید و بگذارید بیشتر استراحت کند.";
      nutritionTip = "غذاهای سرشار از آهن مثل اسفناج، عدس، گوشت کم‌چرب و مایعات گرم برای جبران خونریزی میل کنید.";
      break;

    case 'follicular':
      phaseTitle = "فاز فولیکولار (روزهای پرانرژی) 🌱";
      phaseSubtitle = "افزایش ترشح استروژن و شادابی پوست";
      stageDescription = "با پایان پریود، هورمون استروژن روند صعودی خود را آغاز می‌کند. انرژی جسمی و انگیزه فکری بالا می‌رود و زمان فوق‌العاده‌ای برای ورزش، تفریح و پروژه‌های دونفره است.";
      stageColor = {
        primary: "#A7B86C",
        light: "rgba(167, 184, 108, 0.3)",
        border: "#95A758",
        gradient: "from-[#A7B86C] to-[#DCE6B5]",
        badgeBg: "bg-[#DCE6B5] text-[#1B1B1A] border-[#A7B86C]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "کم";
      selfCareTip = "از انگیزه و انرژی بالایتان برای ورزش‌های پرتحرک، یادگیری کارهای جدید و معاشرت‌های لذت‌بخش استفاده کنید.";
      partnerTip = "بهترین فرصت برای قرار دونفره، پیاده‌روی عاشقانه و برنامه‌ریزی سفر است؛ انرژی همسرتان در بالاترین حد است!";
      nutritionTip = "میوه‌ها و سبزیجات تازه، غلات کامل و پروتئین باکیفیت را در سبد غذایی خود جای دهید.";
      break;

    case 'fertile':
      phaseTitle = "پنجره باروری (شانس بالای لقاح) ✨";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "روزهای طلایی برای اقدام به بارداری"
        : (goalMode === 'prevention' ? "روزهای پرخطر - نیاز به مراقبت و پیشگیری" : "افزایش حس جذابیت و شادابی زنانه");
      stageDescription = "تخمدان‌ها در حال آماده‌سازی تخمک نهایی هستند و سطح ترشحات استروژنی شفاف و کشسان می‌شود. اسپرم در این بازه می‌تواند تا ۵ روز در رحم زنده بماند.";
      stageColor = {
        primary: "#B8CEF4",
        light: "rgba(184, 206, 244, 0.35)",
        border: "#9BB8EB",
        gradient: "from-[#B8CEF4] to-[#DCE6FA]",
        badgeBg: "bg-[#B8CEF4] text-[#1B1B1A] border-[#9BB8EB]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "بالا";
      selfCareTip = "توجه به ترشحات دهانه رحم (شبیه سفیده تخم‌مرغ) بهترین نشانه ورود به بارورترین روزهای ماه است.";
      partnerTip = "عواطف و صمیمیت فیزیکی در اوج پذیرش است؛ کلمات محبت‌آمیز و نگاه‌های پرعشق تاثیر دوچندان دارد.";
      nutritionTip = "مصرف آنتی‌اکسیدان‌ها، ویتامین C، مغزیجات (گردو و بادام) و آووکادو به کیفیت تخمک‌گذاری کمک شایانی می‌کند.";
      break;

    case 'ovulation':
      phaseTitle = "روز تخمک‌گذاری (اوج باروری) 🥚";
      phaseSubtitle = goalMode === 'pregnancy'
        ? "بالاترین شانس بارداری در تمام ماه!"
        : "رهاسازی تخمک و اوج تمایل به صمیمیت";
      stageDescription = "تخمک از فولیکول رها شده و به مدت ۱۲ الی ۲۴ ساعت در لوله فالوپ آماده لقاح است. این روز قله احساسی، فیزیکی و بیولوژیکی چرخه قاعدگی شماست.";
      stageColor = {
        primary: "#A7B86C",
        light: "rgba(167, 184, 108, 0.35)",
        border: "#8FA153",
        gradient: "from-[#A7B86C] to-[#DCE6B5]",
        badgeBg: "bg-[#A7B86C] text-[#1B1B1A] border-[#8FA153]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "بسیار بالا (اوج)";
      selfCareTip = "ممکن است تیر کشیدن مختصری در یک سمت زیر شکم حس کنید (میتل‌اشمرتس) که کاملاً طبیعی و نشانه رهاسازی تخمک است.";
      partnerTip = "امروز روز اوج انرژی و صمیمیت عاطفی همسرتان است؛ با گل و محبت بیشتر این روز را خاص کنید.";
      nutritionTip = "آب زیاد، غذاهای ضدالتهاب، اسید فولیک و پرهیز از فست‌فود در این روز حیاتی است.";
      break;

    case 'luteal':
      phaseTitle = "فاز لوتئال (آرامش پس از تخمک‌گذاری) 🌙";
      phaseSubtitle = "تولید هورمون پروژسترون و کاهش آرام انرژی";
      stageDescription = "با تشکیل جسم زرد، پروژسترون بالا می‌رود تا دیواره رحم را تقویت کند. بدن به آرامی ریتم آرام‌تری به خود می‌گیرد و نیاز به خواب باکیفیت بیشتر می‌شود.";
      stageColor = {
        primary: "#B8CEF4",
        light: "rgba(184, 206, 244, 0.3)",
        border: "#9BB8EB",
        gradient: "from-[#B8CEF4] to-[#EFECE2]",
        badgeBg: "bg-[#B8CEF4]/70 text-[#1B1B1A] border-[#9BB8EB]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "کم";
      selfCareTip = "از کارهای سنگین و اضافه‌کاری کم کنید. دوش شبانه و زمان‌بندی منظم خواب به تعادل هورمونی شما کمک می‌کند.";
      partnerTip = "شاید همسرتان کمی آرام‌تر یا کم‌حرف‌تر شود؛ نیاز به فضای آرام و درک متقابل در این روزها پررنگ است.";
      nutritionTip = "منیزیم (موز، اسفناج، شکلات تلخ و دانه کدو) از دردهای احتمالی آینده جلوگیری می‌کند.";
      break;

    case 'pms':
      phaseTitle = "سندرم پیش از قاعدگی (PMS) 🍂";
      phaseSubtitle = "نوسانات هورمونی و حساسیت عاطفی طبیعی";
      stageDescription = "افت ناگهانی پروژسترون و استروژن پیش از خونریزی ممکن است باعث حساسیت پستان‌ها، نفخ، خستگی، کم‌حوصلگی یا نوسانات خلقی شود. این وضعیت کاملاً فیزیولوژیک است.";
      stageColor = {
        primary: "#F6DC6B",
        light: "rgba(246, 220, 107, 0.35)",
        border: "#E5C954",
        gradient: "from-[#F6DC6B] to-[#F9E795]",
        badgeBg: "bg-[#F6DC6B] text-[#1B1B1A] border-[#E5C954]",
        text: "text-[#1B1B1A]"
      };
      chanceOfPregnancy = "بسیار کم";
      selfCareTip = "مصرف کافئین و شکر را محدود کنید چون اضطراب و ورم را تشدید می‌کنند. پیاده‌روی سبک و تنفس عمیق معجزه می‌کند.";
      partnerTip = "صبوری، محبت بی‌قید و شرط، بغل گرم و عدم انتقاد، بزرگ‌ترین هدیه شما به پارتنرتان در روزهای PMS است.";
      nutritionTip = "غذاهای کم‌نمک برای پیشگیری از نفخ و آب زیاد و دمنوش اسطوخودوس یا بادرنجبویه مصرف کنید.";
      break;
  }

  const progressPercent = isDelayed 
    ? 100 
    : Math.min(100, Math.max(0, Math.round((currentCycleDay / cycleLength) * 100)));

  return {
    diffDays,
    currentCycleDay,
    isDelayed,
    delayedDays,
    cycleLength,
    periodLength,
    ovulationDay,
    fertileStartDay,
    fertileEndDay,
    pmsStartDay,
    daysUntilNextPeriod,
    phase,
    phaseTitle,
    phaseSubtitle,
    stageDescription,
    stageColor,
    chanceOfPregnancy,
    progressPercent,
    selfCareTip,
    partnerTip,
    nutritionTip
  };
}

export function calculateBiorhythm(birthDateStr?: string, targetDate: Date = new Date()): BiorhythmResult | null {
  if (!birthDateStr) return null;
  try {
    const daysAlive = daysBetween(birthDateStr, targetDate);
    if (daysAlive <= 0) return null;

    const physical = Math.round(Math.sin((2 * Math.PI * daysAlive) / 23) * 100);
    const emotional = Math.round(Math.sin((2 * Math.PI * daysAlive) / 28) * 100);
    const intellectual = Math.round(Math.sin((2 * Math.PI * daysAlive) / 33) * 100);

    let summary = "ریتم‌های زیستی شما در وضعیت متعادل قرار دارند.";
    if (physical > 50 && emotional > 50) {
      summary = "انرژی جسمانی و شادابی عاطفی شما در اوج است! روز عالی برای تحرک و ساختن خاطرات دونفره.";
    } else if (emotional < -40) {
      summary = "ریتم عاطفی در نقطه کف است. استراحت، پذیرش احساسات و معاشرت با آرامش توصیه می‌شود.";
    } else if (intellectual > 60) {
      summary = "تمرکز ذهنی و حل مسئله شما در بالاترین بازدهی است.";
    }

    return {
      physical,
      emotional,
      intellectual,
      daysAlive,
      summary
    };
  } catch {
    return null;
  }
}
