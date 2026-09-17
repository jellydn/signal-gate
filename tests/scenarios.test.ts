import { describe, expect, it } from "vitest";
import { scenarios, smokeScenarios } from "../src/scenarios.js";

describe("synthetic benchmark corpus", () => {
  it("contains 100 balanced labeled scenarios", () => {
    expect(scenarios).toHaveLength(100);
    for (const category of [
      "normal",
      "suspicious",
      "legitimate_anomaly",
      "adversarial",
    ]) {
      expect(
        scenarios.filter((scenario) => scenario.category === category),
      ).toHaveLength(25);
    }
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(100);
  });

  it("uses one ambiguous case from each category for smoke runs", () => {
    expect(smokeScenarios.map((scenario) => scenario.category)).toEqual([
      "normal",
      "suspicious",
      "legitimate_anomaly",
      "adversarial",
    ]);
    expect(smokeScenarios.every((scenario) => scenario.ambiguous)).toBe(true);
  });
});
