const percent = (value) => `${(value * 100).toFixed(1)}%`;
const milliseconds = (value) => `${value.toFixed(0)} ms`;
const actionClass = (action) => `action-${action.toLowerCase()}`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderCards(report) {
  const container = document.querySelector("#engine-cards");
  container.replaceChildren(
    ...report.map(({ engine, metrics }) => {
      const card = element("article", "engine-card");
      card.append(element("h3", "", engine));
      card.append(element("p", "score", percent(metrics.accuracy)));
      card.append(element("p", "score-label", "recommendation accuracy"));
      const stats = element("dl", "card-stats");
      for (const [label, value] of [
        ["Median latency", milliseconds(metrics.p50LatencyMs)],
        ["Consistency", percent(metrics.consistency)],
        ["Cost / 1K", `$${metrics.costPer1kUsd.toFixed(4)}`],
        ["Output failures", percent(metrics.outputFailureRate)],
      ]) {
        const group = element("div");
        group.append(element("dt", "", label), element("dd", "", value));
        stats.append(group);
      }
      card.append(stats);
      return card;
    }),
  );
}

function renderMetrics(report) {
  const body = document.querySelector("#metrics-body");
  body.replaceChildren(
    ...report.map(({ engine, metrics }) => {
      const row = element("tr");
      for (const value of [
        engine,
        percent(metrics.accuracy),
        percent(metrics.falseAllowRate),
        percent(metrics.falseHoldOrReviewRate),
        milliseconds(metrics.p50LatencyMs),
        milliseconds(metrics.p95LatencyMs),
        percent(metrics.consistency),
        percent(metrics.outputFailureRate),
      ]) {
        row.append(element("td", "", value));
      }
      return row;
    }),
  );
}

function renderDecisions(report) {
  const container = document.querySelector("#decision-list");
  container.replaceChildren(
    ...report.flatMap(({ engine, results }) =>
      results.map((result) => {
        const card = element("article", "decision-card");
        const title = element("div");
        title.append(
          element("h3", "", result.scenarioId),
          element("p", "", engine),
        );
        card.append(title);
        for (const [label, value, className = ""] of [
          [
            "Recommended",
            result.recommendedAction,
            actionClass(result.recommendedAction),
          ],
          [
            "Policy result",
            result.enforcedAction,
            actionClass(result.enforcedAction),
          ],
          ["Confidence", percent(result.confidence)],
          ["Latency", milliseconds(result.latencyMs)],
        ]) {
          const field = element("div", "decision-value");
          field.append(
            element("span", "", label),
            element("strong", className, value),
          );
          card.append(field);
        }
        return card;
      }),
    ),
  );
}

async function loadReport() {
  const status = document.querySelector("#status-pill");
  const button = document.querySelector("#refresh-button");
  status.className = "status-pill";
  status.textContent = "Running smoke test…";
  button.disabled = true;
  try {
    const response = await fetch("/api/report");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Benchmark request failed");
    renderCards(data.report);
    renderMetrics(data.report);
    renderDecisions(data.report);
    document.querySelector("#run-meta").textContent =
      `${data.scenarioCount} categories · ${data.repeatCount} repeats · ${new Date(data.generatedAt).toLocaleString()}`;
    status.className = "status-pill ready";
    status.textContent = `${data.report.length} engines ready`;
  } catch (error) {
    status.className = "status-pill error";
    status.textContent = "Benchmark failed";
    document
      .querySelector("#engine-cards")
      .replaceChildren(element("article", "placeholder-card", error.message));
  } finally {
    button.disabled = false;
  }
}

document.querySelector("#refresh-button").addEventListener("click", () => {
  loadReport();
});

loadReport();
