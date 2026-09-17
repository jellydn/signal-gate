export const actions = ["ALLOW", "REVIEW", "HOLD"] as const;
export type Action = (typeof actions)[number];

export const categories = [
  "normal",
  "suspicious",
  "legitimate_anomaly",
  "adversarial",
] as const;
export type Category = (typeof categories)[number];

export interface TransactionScenario {
  id: string;
  category: Category;
  description: string;
  amountUsd: number;
  customerMedianAmountUsd: number;
  newCounterparty: boolean;
  counterpartyAgeDays: number;
  accountAgeDays: number;
  velocity24h: number;
  usualVelocity24h: number;
  countryChanged: boolean;
  deviceChanged: boolean;
  recentCredentialReset: boolean;
  sanctionsMatch: boolean;
  expectedAction: Action;
  ambiguous: boolean;
}

export interface DecisionPayload {
  amountAnomaly: number;
  counterpartyRisk: number;
  behaviorChange: number;
  recommendedAction: Action;
  confidence: number;
  rationale: string;
}

export interface DecisionResult extends DecisionPayload {
  engine: string;
  scenarioId: string;
  enforcedAction: Action;
  holdAuthorized: boolean;
  requiresHumanApproval: boolean;
  latencyMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  valid: boolean;
  error?: string;
}

export interface DecisionEngine {
  readonly name: string;
  evaluate(scenario: TransactionScenario): Promise<
    DecisionPayload & {
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
    }
  >;
}

export interface EngineMetrics {
  engine: string;
  runs: number;
  accuracy: number;
  falseAllowRate: number;
  falseHoldOrReviewRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  costPer1kUsd: number;
  consistency: number;
  calibrationError: number;
  outputFailureRate: number;
}
