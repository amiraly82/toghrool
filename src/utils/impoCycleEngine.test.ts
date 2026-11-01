import { describe, it, expect } from "vitest";
import { 
  calculateCycleStatus, 
  daysBetween, 
  predictFutureCycles 
} from "./impoCycleEngine";
import { ImpoPeriodSettings } from "../types";

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
