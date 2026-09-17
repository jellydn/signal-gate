import { toModelState } from "../model-state.js";
import type {
  DecisionEngine,
  DecisionPayload,
  TransactionScenario,
} from "../types.js";
import { validateDecision } from "../validation.js";

interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
}

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class GeneralLlmEngine implements DecisionEngine {
  readonly name: string;
  private readonly inputPrice: number;
  private readonly outputPrice: number;

  constructor(private readonly config: LlmConfig) {
    this.name = `llm:${config.model}`;
    this.inputPrice = Number(process.env.LLM_INPUT_USD_PER_MILLION ?? 0);
    this.outputPrice = Number(process.env.LLM_OUTPUT_USD_PER_MILLION ?? 0);
  }

  async evaluate(scenario: TransactionScenario): Promise<
    DecisionPayload & {
      inputTokens: number;
      outputTokens: number;
      costUsd: number;
    }
  > {
    const response = await fetch(
      `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a financial anomaly triage model. Return JSON only. Scores and confidence must be 0..1. recommendedAction must be ALLOW, REVIEW, or HOLD. Recommendations never execute a hold.",
            },
            {
              role: "user",
              content: `Evaluate this synthetic transaction. Required keys: amountAnomaly, counterpartyRisk, behaviorChange, recommendedAction, confidence, rationale.\n${JSON.stringify(toModelState(scenario))}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) {
      throw new Error(
        `LLM HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`,
      );
    }
    const body = (await response.json()) as ChatCompletion;
    const content = body.choices?.[0]?.message?.content;
    if (!content)
      throw new Error("LLM response did not contain message content");
    const decision = validateDecision(JSON.parse(content));
    const inputTokens = body.usage?.prompt_tokens ?? 0;
    const outputTokens = body.usage?.completion_tokens ?? 0;
    return {
      ...decision,
      inputTokens,
      outputTokens,
      costUsd:
        body.usage?.cost ??
        (inputTokens * this.inputPrice + outputTokens * this.outputPrice) /
          1_000_000,
    };
  }
}
