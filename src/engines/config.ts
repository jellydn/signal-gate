import type { DecisionEngine } from "../types.js";
import { GeneralLlmEngine } from "./llm.js";
import { RulesEngine } from "./rules.js";
import { TypeSafeEngine } from "./typesafe.js";

export function buildEngines(names: Set<string>): DecisionEngine[] {
  const engines: DecisionEngine[] = [];
  if (names.has("rules")) engines.push(new RulesEngine());

  if (names.has("typesafe")) {
    const apiKey =
      process.env.TYPESAFE_AI_API_KEY ?? process.env.TYPESAFE_API_KEY;
    if (apiKey) engines.push(new TypeSafeEngine(apiKey));
    else
      console.warn(
        "Skipping TypeSafe: set TYPESAFE_AI_API_KEY or TYPESAFE_API_KEY.",
      );
  }

  if (names.has("llm")) {
    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;
    const apiKey = process.env.LLM_API_KEY ?? openRouterKey;
    if (apiKey) {
      engines.push(
        new GeneralLlmEngine({
          apiKey,
          baseUrl:
            process.env.LLM_BASE_URL ??
            (openRouterKey
              ? "https://openrouter.ai/api/v1"
              : "https://api.openai.com/v1"),
          model: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
        }),
      );
    } else {
      console.warn(
        "Skipping general LLM: set LLM_API_KEY or OPEN_ROUTER_API_KEY.",
      );
    }
  }
  return engines;
}
