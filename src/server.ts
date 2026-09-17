import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runEngine } from "./benchmark.js";
import { buildEngines } from "./engines/config.js";
import { calculateMetrics } from "./metrics.js";
import { smokeScenarios } from "./scenarios.js";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "../web");
const port = Number(process.env.PORT ?? 4173);
let cachedReport: Promise<unknown> | undefined;

async function runSmokeReport() {
  const engines = buildEngines(new Set(["rules", "typesafe", "llm"]));
  const report = [];
  for (const engine of engines) {
    const runs = await runEngine(engine, smokeScenarios, 2, 4);
    report.push({
      engine: engine.name,
      metrics: calculateMetrics(
        engine.name,
        runs.results,
        runs.repeats,
        smokeScenarios,
      ),
      ...runs,
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    scenarioCount: smokeScenarios.length,
    repeatCount: 2,
    report,
  };
}

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

const assets: Record<string, { file: string; type: string }> = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
  "/styles.css": { file: "styles.css", type: "text/css; charset=utf-8" },
};

createServer(async (request, response) => {
  const url = new URL(
    request.url ?? "/",
    `http://${request.headers.host ?? "localhost"}`,
  );
  if (url.pathname === "/health")
    return sendJson(response, 200, { status: "ok" });
  if (url.pathname === "/api/report") {
    cachedReport ??= runSmokeReport();
    try {
      return sendJson(response, 200, await cachedReport);
    } catch (error) {
      cachedReport = undefined;
      return sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Benchmark failed",
      });
    }
  }

  const asset = assets[url.pathname];
  if (!asset) return sendJson(response, 404, { error: "Not found" });
  response.writeHead(200, { "Content-Type": asset.type });
  response.end(await readFile(join(webRoot, asset.file)));
}).listen(port, "0.0.0.0", () => {
  console.log(`One-Bench report server listening on port ${port}`);
});
