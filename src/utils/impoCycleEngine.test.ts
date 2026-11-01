import { describe, it, expect } from "vitest";
import { 
  calculateCycleStatus, 
  daysBetween, 
  predictFutureCycles,
  extractCycleHistory,
  estimateCycleLength,
  predictCycle,
  formatDateRangePersian,
  CycleHistoryItem
} from "./impoCycleEngine";
import { ImpoPeriodSettings, ImpoDailyLog } from "../types";

describe("impoCycleEngine - daysBetween helper & DST handling", () => {
  it("calculates exact calendar day differences regardless of time or timezone offset", () => {
    expect(daysBetween("2026-05-01", "2026-05-01")).toBe(0);
    expect(daysBetween("2026-05-01", "2026-05-02")).toBe(1);
    expect(daysBetween("2026-05-10", "2026-05-07")).toBe(-3);
  });

  it("handles crossing March 29 DST transition without 1-day off errors", () => {
    // 25 March to 5 April spans March 29 (daylight saving switch)
    const diff = daysBetween("2026-03-25", "2026-04-05");
    expect(diff).toBe(11);

    // Exactly 28 days spanning March 29
    const diff28 = daysBetween("2026-03-01", "2026-03-29");
    expect(diff28).toBe(28);
  });

  it("handles crossing October 31 DST transition without 1-day off errors", () => {
    // 25 October to 5 November spans October 31 (daylight saving fall switch)
    const diff = daysBetween("2026-10-25", "2026-11-05");
    expect(diff).toBe(11);

    // Exactly 28 days spanning October 31
    const diff28 = daysBetween("2026-10-03", "2026-10-31");
    expect(diff28).toBe(28);
  });
});

describe("impoCycleEngine - calculateCycleStatus for cycleLength=28", () => {
  const baseSettings: ImpoPeriodSettings = {
    cycleLength: 28,
    periodLength: 5,
    lastPeriodStartDate: "2026-05-15",
    goalMode: "track"
  };

  const getTargetDate = (baseIso: string, diffDays: number): Date => {
    const [y, m, d] = baseIso.split("-").map(Number);
    return new Date(y, m - 1, d + diffDays);
  };

  it("diffDays = -3 (lastPeriodStartDate in the future)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, -3);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(-3);
    expect(status.phase).toBe("follicular");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(3);
    expect(status.isDelayed).toBe(false);
  });

  it("diffDays = 0 (first day of menstrual cycle)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 0);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(0);
    expect(status.phase).toBe("period");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(28);
    expect(status.isDelayed).toBe(false);
  });

  it("diffDays = 27 (last day before expected due date)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 27);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(27);
    expect(status.phase).toBe("pms");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(1);
    expect(status.isDelayed).toBe(false);
  });

  it("diffDays = 28 (off-by-one fix: exact due date -> phase 'due', no red alert, no pregnancy test suggestion)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 28);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(28);
    expect(status.phase).toBe("due");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(0);
    expect(status.isDelayed).toBe(false);
    expect(status.phaseTitle).toContain("امروز زمان مورد انتظار پریود است");
    expect(status.chanceOfPregnancy).toBe("بسیار کم");
  });

  it("diffDays = 29 (1 day delay -> phase 'delayed', delayedDays=1, no pregnancy test suggestion yet)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 29);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(29);
    expect(status.phase).toBe("delayed");
    expect(status.delayedDays).toBe(1);
    expect(status.daysUntilNextPeriod).toBe(0);
    expect(status.isDelayed).toBe(true);
    expect(status.chanceOfPregnancy).not.toContain("بیبی‌چک");
  });

  it("diffDays = 44 (16 days delay -> pregnancy test suggested with suggestive tone)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 44);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(44);
    expect(status.phase).toBe("delayed");
    expect(status.delayedDays).toBe(16);
    expect(status.daysUntilNextPeriod).toBe(0);
    expect(status.isDelayed).toBe(true);
    expect(status.chanceOfPregnancy).toContain("اگر احتمال بارداری هست");
  });

  it("diffDays = 45 (ceiling 45+: new period card prompt + doctor consult message)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 45);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(45);
    expect(status.phase).toBe("delayed");
    expect(status.delayedDays).toBe(17);
    expect(status.daysUntilNextPeriod).toBe(0);
    expect(status.isDelayed).toBe(true);
    expect(status.phaseSubtitle).toContain("پریودت شروع شده؟ همین حالا ثبتش کن");
    expect(status.stageDescription).toContain("اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید");
  });

  it("diffDays = 90 (ceiling 90+: doctor consult only)", () => {
    const today = getTargetDate(baseSettings.lastPeriodStartDate, 90);
    const status = calculateCycleStatus(baseSettings, today);

    expect(status.diffDays).toBe(90);
    expect(status.phase).toBe("delayed");
    expect(status.delayedDays).toBe(62);
    expect(status.daysUntilNextPeriod).toBe(0);
    expect(status.isDelayed).toBe(true);
    expect(status.phaseTitle).toContain("مشورت با پزشک");
    expect(status.stageDescription).toContain("اگر بیش از ۳ ماه پریود نشده‌اید یا بارداری رد شده است، با پزشک مشورت کنید");
  });

  it("handles exact due date across March 29", () => {
    const settings: ImpoPeriodSettings = {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: "2026-03-01"
    };
    const march29 = new Date(2026, 2, 29, 12, 0, 0);
    const status = calculateCycleStatus(settings, march29);

    expect(status.diffDays).toBe(28);
    expect(status.phase).toBe("due");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(0);
  });

  it("handles exact due date across October 31", () => {
    const settings: ImpoPeriodSettings = {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: "2026-10-03"
    };
    const oct31 = new Date(2026, 9, 31, 12, 0, 0);
    const status = calculateCycleStatus(settings, oct31);

    expect(status.diffDays).toBe(28);
    expect(status.phase).toBe("due");
    expect(status.delayedDays).toBe(0);
    expect(status.daysUntilNextPeriod).toBe(0);
  });
});

describe("impoCycleEngine - predictFutureCycles when delayed", () => {
  it("keeps next expected cycle as lastStart + cycleLength with delay label and advances future cycles from there", () => {
    const settings: ImpoPeriodSettings = {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: "2026-04-01"
    };
    const predictions = predictFutureCycles(settings, 3);

    expect(predictions).toHaveLength(3);
    // Cycle 1: 2026-04-01 + 28 days = 2026-04-29
    expect(predictions[0].startDateIso).toBe("2026-04-29");
    // Cycle 2: 2026-04-01 + 56 days = 2026-05-27
    expect(predictions[1].startDateIso).toBe("2026-05-27");
    // Cycle 3: 2026-04-01 + 84 days = 2026-06-24
    expect(predictions[2].startDateIso).toBe("2026-06-24");
  });
});

describe("impoCycleEngine - extractCycleHistory & outlier filtering", () => {
  it("builds history from consecutive period starts and excludes bounds and MAD outliers from estimation while keeping them in history", () => {
    // Consecutive start dates:
    // 2026-01-01 -> 2026-01-29 (28d)
    // 2026-01-29 -> 2026-02-26 (28d)
    // 2026-02-26 -> 2026-03-27 (29d)
    // 2026-03-27 -> 2026-05-11 (45d -> MAD outlier)
    // 2026-05-11 -> 2026-05-24 (13d -> out_of_bounds)
    // 2026-05-24 -> 2026-06-21 (28d)
    const logs: ImpoDailyLog[] = [
      { id: "1", date: "2026-01-01", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "2", date: "2026-01-29", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "3", date: "2026-02-26", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "4", date: "2026-03-27", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "5", date: "2026-05-11", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "6", date: "2026-05-24", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" },
      { id: "7", date: "2026-06-21", isPeriodDay: true, isPeriodStart: true, loggedByUid: "u1", loggedByName: "N", createdAt: "" }
    ];

    const history = extractCycleHistory(logs);
    expect(history).toHaveLength(6);

    expect(history[0].lengthDays).toBe(28);
    expect(history[0].isValid).toBe(true);

    expect(history[1].lengthDays).toBe(28);
    expect(history[1].isValid).toBe(true);

    expect(history[2].lengthDays).toBe(29);
    expect(history[2].isValid).toBe(true);

    // 45 days is > 3 MAD outlier from 28
    expect(history[3].lengthDays).toBe(45);
    expect(history[3].isValid).toBe(false);
    expect(history[3].exclusionReason).toBe("mad_outlier");

    // 13 days is < 18 out_of_bounds
    expect(history[4].lengthDays).toBe(13);
    expect(history[4].isValid).toBe(false);
    expect(history[4].exclusionReason).toBe("out_of_bounds");

    expect(history[5].lengthDays).toBe(28);
    expect(history[5].isValid).toBe(true);
  });
});

describe("impoCycleEngine - estimateCycleLength with scarce data (n=0, 1, 2)", () => {
  it("n=0: falls back to user prior with low confidence", () => {
    const history: CycleHistoryItem[] = [];
    const est = estimateCycleLength(history, 30);

    expect(est.nCycles).toBe(0);
    expect(est.mean).toBe(30);
    expect(est.sd).toBe(3.5);
    expect(est.confidence).toBe("low");
  });

  it("n=1: performs Bayesian shrinkage to prior (weight=2), keeps low confidence", () => {
    const history: CycleHistoryItem[] = [
      { cycleIndex: 1, startDate: "2026-01-01", endDate: "2026-02-02", lengthDays: 32, isValid: true }
    ];
    // Prior: mu0 = 28, sigma0 = 3.5. n = 1, obs = 32.
    // muEst = (2*28 + 1*32) / 3 = 88 / 3 ~= 29.333
    const est = estimateCycleLength(history, 28);

    expect(est.nCycles).toBe(1);
    expect(est.mean).toBeCloseTo(29.333, 2);
    expect(est.sd).toBe(3.5);
    expect(est.confidence).toBe("low");
  });

  it("n=2: incorporates observed variance and shrinkage, keeps low confidence", () => {
    const history: CycleHistoryItem[] = [
      { cycleIndex: 1, startDate: "2026-01-01", endDate: "2026-01-31", lengthDays: 30, isValid: true },
      { cycleIndex: 2, startDate: "2026-01-31", endDate: "2026-03-04", lengthDays: 32, isValid: true }
    ];
    // Observed median = 31. Observed SD = sqrt(( (30-31)^2 + (32-31)^2 ) / 1) = sqrt(2) ~= 1.4142
    // muEst = (2*28 + 2*31) / 4 = 118 / 4 = 29.5
    // sigmaEst = (2*3.5 + 2*1.4142) / 4 ~= (7 + 2.8284) / 4 ~= 2.457
    const est = estimateCycleLength(history, 28);

    expect(est.nCycles).toBe(2);
    expect(est.mean).toBeCloseTo(29.5, 1);
    expect(est.sd).toBeCloseTo(2.457, 2);
    expect(est.confidence).toBe("low");
  });

  it("n=4: confidence advances to medium", () => {
    const history: CycleHistoryItem[] = [
      { cycleIndex: 1, startDate: "2026-01-01", endDate: "2026-01-29", lengthDays: 28, isValid: true },
      { cycleIndex: 2, startDate: "2026-01-29", endDate: "2026-02-26", lengthDays: 28, isValid: true },
      { cycleIndex: 3, startDate: "2026-02-26", endDate: "2026-03-27", lengthDays: 29, isValid: true },
      { cycleIndex: 4, startDate: "2026-03-27", endDate: "2026-04-24", lengthDays: 28, isValid: true }
    ];
    const est = estimateCycleLength(history, 28);

    expect(est.nCycles).toBe(4);
    expect(est.confidence).toBe("medium");
  });

  it("n=6 with low SD: confidence advances to high", () => {
    const history: CycleHistoryItem[] = [
      { cycleIndex: 1, startDate: "2026-01-01", endDate: "2026-01-29", lengthDays: 28, isValid: true },
      { cycleIndex: 2, startDate: "2026-01-29", endDate: "2026-02-26", lengthDays: 28, isValid: true },
      { cycleIndex: 3, startDate: "2026-02-26", endDate: "2026-03-27", lengthDays: 29, isValid: true },
      { cycleIndex: 4, startDate: "2026-03-27", endDate: "2026-04-24", lengthDays: 28, isValid: true },
      { cycleIndex: 5, startDate: "2026-04-24", endDate: "2026-05-22", lengthDays: 28, isValid: true },
      { cycleIndex: 6, startDate: "2026-05-22", endDate: "2026-06-19", lengthDays: 28, isValid: true }
    ];
    const est = estimateCycleLength(history, 28);

    expect(est.nCycles).toBe(6);
    expect(est.confidence).toBe("high");
    expect(est.sd).toBeLessThanOrEqual(2.5);
  });
});

describe("impoCycleEngine - predictCycle signals", () => {
  it("handles ovulationTestResult === 'positive_peak' to pin-point ovulation and period", () => {
    const settings: ImpoPeriodSettings = {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: "2026-05-01"
    };
    const logs: ImpoDailyLog[] = [
      {
        id: "log_peak",
        date: "2026-05-14",
        isPeriodDay: false,
        ovulationTestResult: "positive_peak",
        loggedByUid: "u1",
        loggedByName: "N",
        createdAt: ""
      }
    ];

    const result = predictCycle([], logs, new Date("2026-05-15"), settings);

    expect(result.hasOvulationPeakSignal).toBe(true);
    // Peak on 2026-05-14 -> Ovulation is 2026-05-15 (day after peak)
    expect(result.ovulation.median).toBe("2026-05-15");
    // Next period = Ovulation (2026-05-15) + 13 days = 2026-05-28
    expect(result.nextStart.median).toBe("2026-05-28");
    // Fertile window covers 5 days before ovulation up to 1 day after
    expect(result.fertileWindow.start).toBe("2026-05-10");
    expect(result.fertileWindow.end).toBe("2026-05-16");
  });

  it("handles pregnancyTestResult === 'positive' by stopping period prediction and returning banner", () => {
    const settings: ImpoPeriodSettings = {
      cycleLength: 28,
      periodLength: 5,
      lastPeriodStartDate: "2026-05-01"
    };
    const logs: ImpoDailyLog[] = [
      {
        id: "log_preg",
        date: "2026-05-25",
        isPeriodDay: false,
        pregnancyTestResult: "positive",
        loggedByUid: "u1",
        loggedByName: "N",
        createdAt: ""
      }
    ];

    const result = predictCycle([], logs, new Date("2026-05-26"), settings);

    expect(result.isPregnant).toBe(true);
    expect(result.pregnancyMessage).toContain("تبریک! تست بارداری مثبت ثبت شده است");
    expect(result.cycles).toHaveLength(0);
  });
});

describe("impoCycleEngine - formatDateRangePersian", () => {
  it("formats dates in the same month as 'حدوداً X تا Y [ماه]'", () => {
    // 2026-11-01 is 10 Aban, 2026-11-04 is 13 Aban
    const text = formatDateRangePersian("2026-11-01", "2026-11-04");
    expect(text).toBe("حدوداً ۱۰ تا ۱۳ آبان");
  });

  it("formats dates spanning month boundaries as 'حدوداً X [ماه۱] تا Y [ماه۲]'", () => {
    // 2026-10-20 is 28 Mehr, 2026-10-24 is 2 Aban
    const text = formatDateRangePersian("2026-10-20", "2026-10-24");
    expect(text).toBe("حدوداً ۲۸ مهر تا ۲ آبان");
  });
});
