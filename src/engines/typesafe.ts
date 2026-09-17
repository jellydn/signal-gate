import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { toModelState } from "../model-state.js";
import type {
  DecisionEngine,
  DecisionPayload,
  TransactionScenario,
} from "../types.js";

const questionCriteria = {
  true: "The signal is materially anomalous or risky for this customer.",
  false: "The signal is consistent with safe customer behavior.",
} as const;

export class TypeSafeEngine implements DecisionEngine {
  readonly name = "typesafe-jev";
  private readonly client: TypeSafeClient;
  private readonly inputPrice: number;
  private readonly outputPrice: number;

  constructor(apiKey: string) {
    this.client = new TypeSafeClient({
      apiKey,
      defaultModel: process.env.TYPESAFE_MODEL ?? "jev-latest",
      timeout: 15_000,
    });
    this.inputPrice = Number(process.env.TYPESAFE_INPUT_USD_PER_MILLION ?? 0);
    this.outputPrice = Number(process.env.TYPESAFE_OUTPUT_USD_PER_MILLION ?? 0);
  }

  async evaluate(scenario: TransactionScenario): Promise<
    DecisionPayload & {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  > {
    const response = await this.client.systemOne({
      state: toModelState(scenario),
      questions: {
        amountAnomaly: noul(
          "Is the transaction amount anomalous for this customer?",
          questionCriteria,
        ),
        counterpartyRisk: noul(
          "Is the counterparty materially risky?",
          questionCriteria,
        ),
        behaviorChange: noul(
          "Does this transaction show a material behavior change?",
          questionCriteria,
        ),
        recommendedAction: choice(
          "What risk action should an analyst consider?",
          {
            ALLOW: "Signals support normal processing.",
            REVIEW: "Signals are mixed or suspicious and need human review.",
            HOLD: "Signals indicate acute risk. This is only a recommendation, not authorization.",
          },
        ),
      },
    });
    const { answers, usage } = response;
    const action = answers.recommendedAction.choice;
    return {
      amountAnomaly: answers.amountAnomaly.noul,
      counterpartyRisk: answers.counterpartyRisk.noul,
      behaviorChange: answers.behaviorChange.noul,
      recommendedAction: action,
      confidence: answers.recommendedAction.confidence,
      rationale: `Jev probabilities: amount=${answers.amountAnomaly.noul.toFixed(2)}, counterparty=${answers.counterpartyRisk.noul.toFixed(2)}, behavior=${answers.behaviorChange.noul.toFixed(2)}; action=${action}.`,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      costUsd:
        (usage.input_tokens * this.inputPrice +
          usage.output_tokens * this.outputPrice) /
        1_000_000,
    };
  }
}
