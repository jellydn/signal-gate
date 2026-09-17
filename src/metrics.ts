import type {
  Action,
  DecisionResult,
  EngineMetrics,
  TransactionScenario,
} from "./types.js";

const mean = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;

function percentile(values: number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[
      Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)
    ] ?? 0
  );
}

function expectedById(scenarios: TransactionScenario[]): Map<string, Action> {
  return new Map(
    scenarios.map((scenario) => [scenario.id, scenario.expectedAction]),
  );
}

function calibrationError(
  results: DecisionResult[],
  expected: Map<string, Action>,
): number {
  const bins = Array.from({ length: 10 }, () => [] as DecisionResult[]);
  for (const result of results.filter((item) => item.valid)) {
    bins[Math.min(9, Math.floor(result.confidence * 10))]?.push(result);
  }
  const total = results.filter((result) => result.valid).length;
  if (total === 0) return 0;
  return bins.reduce((error, bin) => {
    if (bin.length === 0) return error;
    const accuracy = mean(
      bin.map((result) =>
        Number(result.recommendedAction === expected.get(result.scenarioId)),
      ),
    );
    return (
      error +
      (bin.length / total) *
        Math.abs(accuracy - mean(bin.map((item) => item.confidence)))
    );
  }, 0);
}

function repeatConsistency(repeats: DecisionResult[]): number {
  const groups = new Map<string, DecisionResult[]>();
  for (const result of repeats.filter((item) => item.valid)) {
    groups.set(result.scenarioId, [
      ...(groups.get(result.scenarioId) ?? []),
      result,
    ]);
  }
  return mean(
    [...groups.values()].map((group) => {
      const counts = new Map<Action, number>();
      for (const result of group) {
        counts.set(
          result.recommendedAction,
          (counts.get(result.recommendedAction) ?? 0) + 1,
        );
      }
      return Math.max(...counts.values()) / group.length;
    }),
  );
}

export function calculateMetrics(
  engine: string,
  results: DecisionResult[],
  repeats: DecisionResult[],
  scenarios: TransactionScenario[],
): EngineMetrics {
  const expected = expectedById(scenarios);
  const valid = results.filter((result) => result.valid);
  const expectedRisk = valid.filter(
    (result) => expected.get(result.scenarioId) !== "ALLOW",
  );
  const expectedAllow = valid.filter(
    (result) => expected.get(result.scenarioId) === "ALLOW",
  );

  return {
    engine,
    runs: results.length + repeats.length,
    accuracy: mean(
      valid.map((result) =>
        Number(result.recommendedAction === expected.get(result.scenarioId)),
      ),
    ),
    falseAllowRate: mean(
      expectedRisk.map((result) =>
        Number(result.recommendedAction === "ALLOW"),
      ),
    ),
    falseHoldOrReviewRate: mean(
      expectedAllow.map((result) =>
        Number(result.recommendedAction !== "ALLOW"),
      ),
    ),
    p50LatencyMs: percentile(
      valid.map((result) => result.latencyMs),
      0.5,
    ),
    p95LatencyMs: percentile(
      valid.map((result) => result.latencyMs),
      0.95,
    ),
    costPer1kUsd:
      valid.length === 0
        ? 0
        : (valid.reduce((sum, item) => sum + item.costUsd, 0) / valid.length) *
          1000,
    consistency: repeatConsistency(repeats),
    calibrationError: calibrationError(valid, expected),
    outputFailureRate: mean(
      [...results, ...repeats].map((result) => Number(!result.valid)),
    ),
  };
}
