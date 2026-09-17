import { describe, expect, it } from "vitest";
import { toModelState } from "../src/model-state.js";
import { scenarios } from "../src/scenarios.js";

describe("model state", () => {
  it("does not expose benchmark labels or metadata to model engines", () => {
    const scenario = scenarios[0];
    if (!scenario) throw new Error("Scenario fixture is missing");

    const state = toModelState(scenario);

    expect(state).not.toHaveProperty("expectedAction");
    expect(state).not.toHaveProperty("category");
    expect(state).not.toHaveProperty("ambiguous");
    expect(state).not.toHaveProperty("id");
    expect(state).toHaveProperty("amountUsd", scenario.amountUsd);
  });
});
