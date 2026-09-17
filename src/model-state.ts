import type { TransactionScenario } from "./types.js";

export function toModelState(scenario: TransactionScenario) {
  return {
    description: scenario.description,
    amountUsd: scenario.amountUsd,
    customerMedianAmountUsd: scenario.customerMedianAmountUsd,
    newCounterparty: scenario.newCounterparty,
    counterpartyAgeDays: scenario.counterpartyAgeDays,
    accountAgeDays: scenario.accountAgeDays,
    velocity24h: scenario.velocity24h,
    usualVelocity24h: scenario.usualVelocity24h,
    countryChanged: scenario.countryChanged,
    deviceChanged: scenario.deviceChanged,
    recentCredentialReset: scenario.recentCredentialReset,
    sanctionsMatch: scenario.sanctionsMatch,
  };
}
