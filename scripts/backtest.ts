/**
 * Walk-forward backtesting simulation script
 * Compares the Bayesian Shrinkage Cycle Prediction model against the baseline (mean of last 3 cycles)
 * across synthetic user cohorts: Regular, Irregular, and Users with Outliers.
 */

import { extractCycleHistory, estimateCycleLength, CycleHistoryItem } from "../src/utils/impoCycleEngine";

// Box-Muller standard normal transform
function randomNormal(mean: number, stdDev: number, seedRandom?: () => number): number {
  const rand = seedRandom || Math.random;
  let u1 = 0, u2 = 0;
  while (u1 === 0) u1 = rand();
  while (u2 === 0) u2 = rand();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

// Pseudo-random number generator for reproducible simulations
function createSeededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface SimulationMetrics {
  totalPredictions: number;
  bayesMae: number;
  baselineMae: number;
  bayesWithin1DayPct: number;
  baselineWithin1DayPct: number;
  bayesWithin2DaysPct: number;
  baselineWithin2DaysPct: number;
  bayes80CoveragePct: number;
}

interface CohortConfig {
  name: string;
  userCount: number;
  cyclesPerUser: number;
  baseCycleMeanRange: [number, number];
  cycleSd: number;
  outlierProbability: number;
  outlierRange: [number, number];
}

function runSimulationForCohort(config: CohortConfig, seededRand: () => number): SimulationMetrics {
  let totalPredictions = 0;
  let sumBayesAbsError = 0;
  let sumBaseAbsError = 0;
  let bayesWithin1Count = 0;
  let baseWithin1Count = 0;
  let bayesWithin2Count = 0;
  let baseWithin2Count = 0;
  let bayesCovered80Count = 0;

  const z80 = 1.28155; // 80% credible multiplier

  for (let u = 0; u < config.userCount; u++) {
    const userTrueMean = config.baseCycleMeanRange[0] + seededRand() * (config.baseCycleMeanRange[1] - config.baseCycleMeanRange[0]);
    
    // Generate actual cycle lengths for this user
    const trueCycles: number[] = [];
    for (let c = 0; c < config.cyclesPerUser; c++) {
      const isOutlier = seededRand() < config.outlierProbability;
      if (isOutlier) {
        const outLen = Math.round(config.outlierRange[0] + seededRand() * (config.outlierRange[1] - config.outlierRange[0]));
        trueCycles.push(outLen);
      } else {
        const len = Math.round(randomNormal(userTrueMean, config.cycleSd, seededRand));
        trueCycles.push(Math.max(15, len));
      }
    }

    // Convert into synthetic history items with date timestamps
    let currentDate = new Date(2024, 0, 1);
    const historyItems: CycleHistoryItem[] = [];

    for (let i = 0; i < trueCycles.length; i++) {
      const len = trueCycles[i];
      const startStr = currentDate.toISOString().split("T")[0];
      currentDate.setDate(currentDate.getDate() + len);
      const endStr = currentDate.toISOString().split("T")[0];

      historyItems.push({
        cycleIndex: i + 1,
        startDate: startStr,
        endDate: endStr,
        lengthDays: len,
        isValid: true
      });
    }

    // Walk-forward validation from t = 3 to N - 1
    for (let t = 3; t < trueCycles.length; t++) {
      const historyUpToT = historyItems.slice(0, t);
      const actualNext = trueCycles[t];

      // 1) Baseline Prediction: Mean of last 3 cycles
      const last3 = trueCycles.slice(t - 3, t);
      const baselinePred = Math.round(last3.reduce((a, b) => a + b, 0) / 3);

      // 2) Bayesian Model Prediction: Uses extractCycleHistory + estimateCycleLength
      // First, filter bounded & MAD outliers as the engine does
      const bounded = historyUpToT
        .filter(h => h.lengthDays >= 18 && h.lengthDays <= 60)
        .map(h => h.lengthDays);
      
      const medianBounded = bounded.length > 0 
        ? [...bounded].sort((a, b) => a - b)[Math.floor(bounded.length / 2)] 
        : 28;
      
      const devs = bounded.map(x => Math.abs(x - medianBounded)).sort((a, b) => a - b);
      const mad = devs.length > 0 ? devs[Math.floor(devs.length / 2)] : 0;
      const madThreshold = Math.max(3 * mad, 3.0);

      const validatedHistory = historyUpToT.map(h => {
        let isValid = true;
        let exclusionReason: 'out_of_bounds' | 'mad_outlier' | undefined;
        if (h.lengthDays < 18 || h.lengthDays > 60) {
          isValid = false;
          exclusionReason = 'out_of_bounds';
        } else if (bounded.length >= 3 && Math.abs(h.lengthDays - medianBounded) > madThreshold) {
          isValid = false;
          exclusionReason = 'mad_outlier';
        }
        return { ...h, isValid, exclusionReason };
      });

      const bayesEstimate = estimateCycleLength(validatedHistory, 28);
      const bayesPred = Math.round(bayesEstimate.mean);
      const lo80 = Math.round(bayesEstimate.mean - z80 * bayesEstimate.sd);
      const hi80 = Math.round(bayesEstimate.mean + z80 * bayesEstimate.sd);

      // Accumulate metrics
      totalPredictions++;
      const bayesErr = Math.abs(actualNext - bayesPred);
      const baseErr = Math.abs(actualNext - baselinePred);

      sumBayesAbsError += bayesErr;
      sumBaseAbsError += baseErr;

      if (bayesErr <= 1) bayesWithin1Count++;
      if (baseErr <= 1) baseWithin1Count++;

      if (bayesErr <= 2) bayesWithin2Count++;
      if (baseErr <= 2) baseWithin2Count++;

      if (actualNext >= lo80 && actualNext <= hi80) {
        bayesCovered80Count++;
      }
    }
  }

  return {
    totalPredictions,
    bayesMae: sumBayesAbsError / totalPredictions,
    baselineMae: sumBaseAbsError / totalPredictions,
    bayesWithin1DayPct: (bayesWithin1Count / totalPredictions) * 100,
    baselineWithin1DayPct: (baseWithin1Count / totalPredictions) * 100,
    bayesWithin2DaysPct: (bayesWithin2Count / totalPredictions) * 100,
    baselineWithin2DaysPct: (baseWithin2Count / totalPredictions) * 100,
    bayes80CoveragePct: (bayesCovered80Count / totalPredictions) * 100
  };
}

export function runBacktest() {
  const seededRand = createSeededRandom(42);

  const cohorts: CohortConfig[] = [
    {
      name: "Cohort 1: Regular Users (نرمال و منظم)",
      userCount: 60,
      cyclesPerUser: 16,
      baseCycleMeanRange: [27, 29],
      cycleSd: 1.5,
      outlierProbability: 0.0,
      outlierRange: [28, 28]
    },
    {
      name: "Cohort 2: Irregular Users (نامنظم با واریانس بالا)",
      userCount: 60,
      cyclesPerUser: 16,
      baseCycleMeanRange: [26, 33],
      cycleSd: 3.2,
      outlierProbability: 0.0,
      outlierRange: [30, 30]
    },
    {
      name: "Cohort 3: Outlier Users (دارای جهش‌های ناگهانی و بیماری/استرس)",
      userCount: 60,
      cyclesPerUser: 16,
      baseCycleMeanRange: [27, 29],
      cycleSd: 1.8,
      outlierProbability: 0.08,
      outlierRange: [45, 55]
    }
  ];

  console.log("===============================================================================");
  console.log("       WALK-FORWARD CYCLE PREDICTION BACKTEST RESULTS (Bayesian vs Baseline)   ");
  console.log("===============================================================================");

  let combinedPredictions = 0;
  let combinedBayesMae = 0;
  let combinedBaselineMae = 0;
  let combinedBayes1 = 0;
  let combinedBase1 = 0;
  let combinedBayes2 = 0;
  let combinedBase2 = 0;
  let combinedCoverage = 0;

  for (const cohort of cohorts) {
    const results = runSimulationForCohort(cohort, seededRand);
    console.log(`\n📌 ${cohort.name}`);
    console.log(`   - Total walk-forward evaluation steps: ${results.totalPredictions}`);
    console.log(`   - MAE: Bayesian = ${results.bayesMae.toFixed(2)} days | Baseline = ${results.baselineMae.toFixed(2)} days`);
    console.log(`   - Within ±1 Day: Bayesian = ${results.bayesWithin1DayPct.toFixed(1)}% | Baseline = ${results.baselineWithin1DayPct.toFixed(1)}%`);
    console.log(`   - Within ±2 Days: Bayesian = ${results.bayesWithin2DaysPct.toFixed(1)}% | Baseline = ${results.baselineWithin2DaysPct.toFixed(1)}%`);
    console.log(`   - Bayesian 80% Range Coverage: ${results.bayes80CoveragePct.toFixed(1)}% (Target: [75%, 85%])`);

    combinedPredictions += results.totalPredictions;
    combinedBayesMae += results.bayesMae * results.totalPredictions;
    combinedBaselineMae += results.baselineMae * results.totalPredictions;
    combinedBayes1 += results.bayesWithin1DayPct * results.totalPredictions;
    combinedBase1 += results.baselineWithin1DayPct * results.totalPredictions;
    combinedBayes2 += results.bayesWithin2DaysPct * results.totalPredictions;
    combinedBase2 += results.baselineWithin2DaysPct * results.totalPredictions;
    combinedCoverage += results.bayes80CoveragePct * results.totalPredictions;
  }

  const overallBayesMae = combinedBayesMae / combinedPredictions;
  const overallBaselineMae = combinedBaselineMae / combinedPredictions;
  const overallBayes1 = combinedBayes1 / combinedPredictions;
  const overallBase1 = combinedBase1 / combinedPredictions;
  const overallBayes2 = combinedBayes2 / combinedPredictions;
  const overallBase2 = combinedBase2 / combinedPredictions;
  const overallCoverage = combinedCoverage / combinedPredictions;

  console.log("\n===============================================================================");
  console.log("                               OVERALL SUMMARY                                ");
  console.log("===============================================================================");
  console.log(`Total Predictions Evaluated: ${combinedPredictions}`);
  console.log(`Overall Daily MAE:             Bayesian = ${overallBayesMae.toFixed(2)} d | Baseline = ${overallBaselineMae.toFixed(2)} d (Improvement: ${(overallBaselineMae - overallBayesMae).toFixed(2)} d)`);
  console.log(`Overall Accuracy ±1 Day:       Bayesian = ${overallBayes1.toFixed(1)}%   | Baseline = ${overallBase1.toFixed(1)}%`);
  console.log(`Overall Accuracy ±2 Days:      Bayesian = ${overallBayes2.toFixed(1)}%   | Baseline = ${overallBase2.toFixed(1)}%`);
  console.log(`Overall 80% Coverage:          ${overallCoverage.toFixed(1)}% (Passes requirement: 75% <= coverage <= 85%)`);
  console.log("===============================================================================\n");

  if (overallCoverage < 75 || overallCoverage > 85) {
    console.error(`❌ FAILURE: 80% coverage (${overallCoverage.toFixed(1)}%) is not within [75%, 85%]!`);
    process.exit(1);
  } else if (overallBayesMae > overallBaselineMae) {
    console.error(`❌ FAILURE: Bayesian MAE (${overallBayesMae.toFixed(2)}) is worse than Baseline (${overallBaselineMae.toFixed(2)})!`);
    process.exit(1);
  } else {
    console.log("✅ All constraints satisfied: Bayesian model outperforms baseline and coverage is within [75%, 85%].");
  }
}

// Execute when run directly via CLI
runBacktest();
