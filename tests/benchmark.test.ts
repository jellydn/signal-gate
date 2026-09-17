import { describe, expect, it } from "vitest";
import { runEngine } from "../src/benchmark.js";
import { RulesEngine } from "../src/engines/rules.js";
import { calculateMetrics } from "../src/metrics.js";
import { scenarios } from "../src/scenarios.js";

describe("benchmark smoke path", () => {
  it("returns valid structured results, repeats, and metrics", async () => {
    const sample = [
      scenarios[0],
      scenarios[25],
      scenarios[50],
      scenarios[75],
    ].filter((scenario) => scenario !== undefined);
    const runs = await runEngine(new RulesEngine(), sample, 2, 2);
    const metrics = calculateMetrics(
      "rules",
      runs.results,
      runs.repeats,
      sample,
    );

    expect(runs.results).toHaveLength(4);
    expect(runs.repeats).toHaveLength(8);
    expect(runs.results.every((result) => result.valid)).toBe(true);
    expect(runs.results[0]).toMatchObject({
      engine: "rules",
      amountAnomaly: expect.any(Number),
      counterpartyRisk: expect.any(Number),
      behaviorChange: expect.any(Number),
      recommendedAction: expect.stringMatching(/ALLOW|REVIEW|HOLD/),
      enforcedAction: expect.stringMatching(/ALLOW|REVIEW|HOLD/),
      confidence: expect.any(Number),
      rationale: expect.any(String),
      latencyMs: expect.any(Number),
      costUsd: expect.any(Number),
      valid: true,
    });
    expect(metrics.runs).toBe(12);
    expect(metrics.consistency).toBe(1);
    expect(metrics.outputFailureRate).toBe(0);
  });
});
