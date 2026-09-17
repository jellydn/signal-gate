import type {
  DecisionEngine,
  DecisionPayload,
  TransactionScenario,
} from "../types.js";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export class RulesEngine implements DecisionEngine {
  readonly name = "rules";

  async evaluate(scenario: TransactionScenario): Promise<DecisionPayload> {
    const amountRatio = scenario.amountUsd / scenario.customerMedianAmountUsd;
    const velocityRatio =
      scenario.velocity24h / Math.max(1, scenario.usualVelocity24h);
    const amountAnomaly = clamp((amountRatio - 1) / 9);
    const counterpartyRisk = clamp(
      (scenario.newCounterparty ? 0.55 : 0) +
        (scenario.counterpartyAgeDays < 14 ? 0.3 : 0) +
        (scenario.sanctionsMatch ? 0.5 : 0),
    );
    const behaviorChange = clamp(
      (velocityRatio - 1) / 8 +
        (scenario.countryChanged ? 0.2 : 0) +
        (scenario.deviceChanged ? 0.2 : 0) +
        (scenario.recentCredentialReset ? 0.25 : 0),
    );
    const risk =
      amountAnomaly * 0.3 + counterpartyRisk * 0.35 + behaviorChange * 0.35;
    const recommendedAction =
      risk >= 0.68 ? "HOLD" : risk >= 0.32 ? "REVIEW" : "ALLOW";

    return {
      amountAnomaly,
      counterpartyRisk,
      behaviorChange,
      recommendedAction,
      confidence: clamp(
        Math.abs(risk - (recommendedAction === "ALLOW" ? 0.32 : 0.68)) * 2 +
          0.55,
      ),
      rationale: `Weighted deterministic risk ${risk.toFixed(2)} from amount, counterparty, and behavior signals.`,
    };
  }
}
