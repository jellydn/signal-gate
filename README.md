# One-Bench

One-Bench tests whether TypeSafe Jev/System One is a fast probabilistic decision layer for
behavioral anomaly detection in financial platforms. It compares Jev with deterministic rules
and a configurable general-purpose LLM on the same synthetic data.

This is an evaluation harness, not a production fraud system. It contains no real financial data
and no engine can directly freeze funds.

## What it measures

- 100 labeled synthetic scenarios: 25 each for normal, suspicious, legitimate anomaly, and
  adversarial behavior.
- Structured decisions with amount anomaly, counterparty risk, behavior change, recommended
  action, confidence, rationale, latency, estimated cost, and validity.
- Accuracy, false allow, false hold/review, p50/p95 latency, cost per 1,000 decisions,
  repeated-case consistency, expected calibration error, and output failures.
- Repeated evaluation of ambiguous cases to expose unstable model behavior.

Labels are benchmark hypotheses, not ground truth from production. Change the corpus and policy
before using the results for a product decision.

## Safety boundary

Rules and models produce recommendations. `src/safety.ts` owns the enforced action:

- A deterministic sanctions match or a strong account-takeover threshold can authorize `HOLD`.
- A model-only `HOLD` becomes `REVIEW` and requires human approval.
- A deterministic threshold can override a model `ALLOW` recommendation.
- Invalid output fails closed to `REVIEW`.

This separation follows TypeSafe's guidance: ask narrow independent questions, compose their
answers in code, and keep side effects in deterministic control flow.

## Install and run

Requirements: Node.js 20+ and pnpm.

```sh
pnpm install
pnpm bench
```

`pnpm bench` uses all configured engines. It writes detailed JSON to the ignored `results/`
directory and prints a comparison table. To select engines:

```sh
pnpm bench -- --engines rules,typesafe
pnpm bench -- --engines llm
```

The fast offline smoke benchmark is:

```sh
pnpm bench:smoke
```

## Configuration

Copy `.env.example` only for local development. Do not commit `.env` files or credentials.

| Variable | Purpose |
| --- | --- |
| `TYPESAFE_AI_API_KEY` or `TYPESAFE_API_KEY` | TypeSafe credential. The former matches this Amp project's managed secret. |
| `TYPESAFE_MODEL` | System One model; defaults to `jev-latest`. |
| `OPEN_ROUTER_API_KEY` or `LLM_API_KEY` | General LLM credential. `LLM_API_KEY` takes precedence. |
| `LLM_BASE_URL` | OpenAI-compatible API root. Defaults to OpenRouter when its key is used. |
| `LLM_MODEL` | General LLM model; defaults to `openai/gpt-4o-mini`. |
| `*_INPUT_USD_PER_MILLION`, `*_OUTPUT_USD_PER_MILLION` | Price inputs for estimated cost. Defaults to zero when unknown. OpenRouter-reported request cost takes precedence. |
| `BENCH_CONCURRENCY` | Concurrent requests; defaults to 4. |
| `BENCH_REPEAT_COUNT` | Runs per ambiguous case; defaults to 3. |

TypeSafe uses one `systemOne()` call per decision. The call batches three Noul questions and one
Choice question. The SDK supplies typed answers, token usage, and retry handling for 429/529
responses.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm bench:smoke
```

Cost is zero when pricing variables and provider-reported cost are absent. Set current provider
prices before comparing cost. Output failures remain in the JSON report with an error summary but
without credentials or request headers.
