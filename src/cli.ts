import { mkdir, writeFile } from "node:fs/promises";
import { runEngine } from "./benchmark.js";
import { buildEngines } from "./engines/config.js";
import { calculateMetrics } from "./metrics.js";
import { printReport } from "./report.js";
import { scenarios, smokeScenarios } from "./scenarios.js";

function selectedEngineNames(): Set<string> {
  const index = process.argv.indexOf("--engines");
  const value = index >= 0 ? process.argv[index + 1] : "rules,typesafe,llm";
  return new Set((value ?? "").split(",").filter(Boolean));
}

async function main(): Promise<void> {
  const smoke = process.argv.includes("--smoke");
  const selectedScenarios = smoke ? smokeScenarios : scenarios;
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
