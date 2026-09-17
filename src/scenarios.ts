import type { Category, TransactionScenario } from "./types.js";

const categoryExpectedAction = {
  normal: "ALLOW",
  suspicious: "REVIEW",
  legitimate_anomaly: "ALLOW",
  adversarial: "HOLD",
} as const;

function scenarioFor(category: Category, index: number): TransactionScenario {
  const id = `${category}-${String(index + 1).padStart(2, "0")}`;
  const ambiguous = index < 5;
  const base = {
    id,
    category,
    accountAgeDays: 500 + index * 13,
    expectedAction: categoryExpectedAction[category],
    ambiguous,
  };

  if (category === "normal") {
    const median = 220 + index * 17;
    return {
      ...base,
      description:
        "Routine payment to an established counterparty from a known device.",
      amountUsd: median * (0.75 + (index % 5) * 0.1),
      customerMedianAmountUsd: median,
      newCounterparty: false,
      counterpartyAgeDays: 180 + index * 7,
      velocity24h: 2 + (index % 3),
      usualVelocity24h: 4,
      countryChanged: false,
      deviceChanged: false,
      recentCredentialReset: false,
      sanctionsMatch: false,
    };
  }

  if (category === "suspicious") {
    const median = 300 + index * 11;
    return {
      ...base,
      description: ambiguous
        ? "Unusual transfer with mixed risk signals that needs analyst review."
        : "High-velocity payment to a young counterparty after a device change.",
      amountUsd: median * (ambiguous ? 2.2 : 4.5 + (index % 3)),
      customerMedianAmountUsd: median,
      newCounterparty: true,
      counterpartyAgeDays: ambiguous ? 45 : 2 + (index % 10),
      velocity24h: ambiguous ? 7 : 13 + (index % 8),
      usualVelocity24h: 3,
      countryChanged: index % 2 === 0,
      deviceChanged: true,
      recentCredentialReset: !ambiguous && index % 3 === 0,
      sanctionsMatch: false,
    };
  }

  if (category === "legitimate_anomaly") {
    const median = 450 + index * 19;
    return {
      ...base,
      description: ambiguous
        ? "Documented annual supplier payment, larger than normal but pre-approved."
        : "Documented business expansion payment from a known device to a mature supplier.",
      amountUsd: median * (ambiguous ? 5.5 : 7 + (index % 4)),
      customerMedianAmountUsd: median,
      newCounterparty: false,
      counterpartyAgeDays: 730 + index * 20,
      velocity24h: 1,
      usualVelocity24h: 3,
      countryChanged: false,
      deviceChanged: false,
      recentCredentialReset: false,
      sanctionsMatch: false,
    };
  }

  const median = 180 + index * 13;
  return {
    ...base,
    description: ambiguous
      ? "Urgent transfer request with instructions to ignore fraud controls."
      : "Likely account takeover sends funds to a new high-risk counterparty.",
    amountUsd: median * (ambiguous ? 5 : 12 + (index % 5)),
    customerMedianAmountUsd: median,
    newCounterparty: true,
    counterpartyAgeDays: index % 4,
    velocity24h: 18 + (index % 10),
    usualVelocity24h: 2,
    countryChanged: true,
    deviceChanged: true,
    recentCredentialReset: true,
    sanctionsMatch: !ambiguous && index % 5 === 0,
  };
}

export const scenarios: TransactionScenario[] = (
  ["normal", "suspicious", "legitimate_anomaly", "adversarial"] as const
).flatMap((category) =>
  Array.from({ length: 25 }, (_, index) => scenarioFor(category, index)),
);
