import { describe, expect, it } from "vitest";
import { applySafetyPolicy } from "../src/safety.js";
import { scenarios } from "../src/scenarios.js";
import type { DecisionPayload } from "../src/types.js";

const recommendation = (
  recommendedAction: DecisionPayload["recommendedAction"],
): DecisionPayload => ({
  amountAnomaly: 0.9,
  counterpartyRisk: 0.9,
  behaviorChange: 0.9,
  recommendedAction,
  confidence: 0.9,
  rationale: "test",
});

describe("deterministic safety policy", () => {
  it("downgrades a model-only HOLD to REVIEW and requires a human", () => {
    const normal = scenarios.find((scenario) => scenario.category === "normal");
    if (!normal) throw new Error("Normal scenario fixture is missing");
    expect(applySafetyPolicy(normal, recommendation("HOLD"))).toEqual({
      enforcedAction: "REVIEW",
      holdAuthorized: false,
      requiresHumanApproval: true,
    });
  });

  it("enforces HOLD when deterministic account-takeover thresholds are met", () => {
    const attack = scenarios.find(
      (scenario) => scenario.category === "adversarial" && !scenario.ambiguous,
    );
    if (!attack) throw new Error("Adversarial scenario fixture is missing");
    expect(applySafetyPolicy(attack, recommendation("ALLOW"))).toEqual({
      enforcedAction: "HOLD",
      holdAuthorized: true,
      requiresHumanApproval: false,
    });
  });
});
