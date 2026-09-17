import { mkdir, writeFile } from "node:fs/promises";
import { runEngine } from "./benchmark.js";
import { GeneralLlmEngine } from "./engines/llm.js";
import { RulesEngine } from "./engines/rules.js";
import { TypeSafeEngine } from "./engines/typesafe.js";
import { calculateMetrics } from "./metrics.js";
import { printReport } from "./report.js";
import { scenarios } from "./scenarios.js";
import type { DecisionEngine } from "./types.js";

function selectedEngineNames(): Set<string> {
  const index = process.argv.indexOf("--engines");
  const value = index >= 0 ? process.argv[index + 1] : "rules,typesafe,llm";
  return new Set((value ?? "").split(",").filter(Boolean));
}

function buildEngines(names: Set<string>): DecisionEngine[] {
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

async function main(): Promise<void> {
  const smoke = process.argv.includes("--smoke");
  const selectedScenarios = smoke
    ? [scenarios[0], scenarios[25], scenarios[50], scenarios[75]].filter(
        (scenario) => scenario !== undefined,
      )
    : scenarios;
  const repeatCount = smoke ? 1 : Number(process.env.BENCH_REPEAT_COUNT ?? 3);
  const concurrency = Number(process.env.BENCH_CONCURRENCY ?? 4);
  const engines = buildEngines(selectedEngineNames());
  if (engines.length === 0)
    throw new Error("No benchmark engines are available.");

  const report = [];
  for (const engine of engines) {
    console.log(
      `Running ${engine.name} on ${selectedScenarios.length} scenarios...`,
    );
    const runs = await runEngine(
      engine,
      selectedScenarios,
      repeatCount,
      concurrency,
    );
    report.push({
      engine: engine.name,
      metrics: calculateMetrics(
        engine.name,
        runs.results,
        runs.repeats,
        selectedScenarios,
      ),
      ...runs,
    });
  }

  printReport(report.map((entry) => entry.metrics));
  await mkdir("results", { recursive: true });
  const outputPath = `results/benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(
    outputPath,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), scenarioCount: selectedScenarios.length, report }, null, 2)}\n`,
  );
  console.log(`Structured results: ${outputPath}`);
}

await main();
