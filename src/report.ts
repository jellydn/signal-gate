import type { EngineMetrics } from "./types.js";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function printReport(metrics: EngineMetrics[]): void {
  console.table(
    metrics.map((item) => ({
      engine: item.engine,
      runs: item.runs,
      accuracy: percent(item.accuracy),
      falseAllow: percent(item.falseAllowRate),
      falseHoldReview: percent(item.falseHoldOrReviewRate),
      p50Ms: item.p50LatencyMs.toFixed(1),
      p95Ms: item.p95LatencyMs.toFixed(1),
      costPer1kUsd: item.costPer1kUsd.toFixed(4),
      consistency: percent(item.consistency),
      calibrationError: item.calibrationError.toFixed(3),
      outputFailures: percent(item.outputFailureRate),
    })),
  );
}
