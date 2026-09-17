import type { Action, DecisionPayload, TransactionScenario } from "./types.js";

export interface SafetyDecision {
  enforcedAction: Action;
  holdAuthorized: boolean;
  requiresHumanApproval: boolean;
}

export function meetsDeterministicHoldThreshold(
  scenario: TransactionScenario,
): boolean {
  const amountRatio = scenario.amountUsd / scenario.customerMedianAmountUsd;
  return (
    scenario.sanctionsMatch ||
    (scenario.recentCredentialReset &&
      scenario.deviceChanged &&
      scenario.newCounterparty &&
      amountRatio >= 8)
  );
}

export function applySafetyPolicy(
  scenario: TransactionScenario,
  recommendation: DecisionPayload,
): SafetyDecision {
  if (meetsDeterministicHoldThreshold(scenario)) {
    return {
      enforcedAction: "HOLD",
      holdAuthorized: true,
      requiresHumanApproval: false,
    };
  }
  if (recommendation.recommendedAction === "HOLD") {
    // A probabilistic model can escalate, but it cannot freeze funds by itself.
    return {
      enforcedAction: "REVIEW",
      holdAuthorized: false,
      requiresHumanApproval: true,
    };
  }
  return {
    enforcedAction: recommendation.recommendedAction,
    holdAuthorized: false,
    requiresHumanApproval: false,
  };
}
