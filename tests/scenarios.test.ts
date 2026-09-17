import { describe, expect, it } from "vitest";
import { scenarios } from "../src/scenarios.js";

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
});
