import { performance } from "node:perf_hooks";
import { applySafetyPolicy } from "./safety.js";
import type {
  DecisionEngine,
  DecisionResult,
  TransactionScenario,
} from "./types.js";
import { validateDecision } from "./validation.js";

async function evaluateOne(
  engine: DecisionEngine,
  scenario: TransactionScenario,
): Promise<DecisionResult> {
  const started = performance.now();
  try {
    const raw = await engine.evaluate(scenario);
    const decision = validateDecision(raw);
    const safety = applySafetyPolicy(scenario, decision);
    return {
      ...decision,
      ...safety,
      engine: engine.name,
      scenarioId: scenario.id,
      latencyMs: performance.now() - started,
      costUsd: raw.costUsd ?? 0,
      inputTokens: raw.inputTokens ?? 0,
      outputTokens: raw.outputTokens ?? 0,
      valid: true,
    };
  } catch (error) {
    return {
      engine: engine.name,
      scenarioId: scenario.id,
      amountAnomaly: 0,
      counterpartyRisk: 0,
      behaviorChange: 0,
      recommendedAction: "REVIEW",
      enforcedAction: "REVIEW",
      confidence: 0,
      rationale: "Invalid engine output; route to human review.",
      holdAuthorized: false,
      requiresHumanApproval: true,
      latencyMs: performance.now() - started,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function concurrentMap<T, U>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<U>,
): Promise<U[]> {
  const results = new Array<U>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) results[index] = await task(item);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

export async function runEngine(
  engine: DecisionEngine,
  scenarios: TransactionScenario[],
  repeatCount: number,
  concurrency: number,
): Promise<{ results: DecisionResult[]; repeats: DecisionResult[] }> {
  const results = await concurrentMap(scenarios, concurrency, (scenario) =>
    evaluateOne(engine, scenario),
  );
  const ambiguousRuns = scenarios
    .filter((scenario) => scenario.ambiguous)
    .flatMap((scenario) => Array.from({ length: repeatCount }, () => scenario));
  const repeats = await concurrentMap(ambiguousRuns, concurrency, (scenario) =>
    evaluateOne(engine, scenario),
  );
  return { results, repeats };
}
