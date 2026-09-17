import { z } from "zod";
import type { DecisionPayload } from "./types.js";

export const decisionPayloadSchema = z.object({
  amountAnomaly: z.number().min(0).max(1),
  counterpartyRisk: z.number().min(0).max(1),
  behaviorChange: z.number().min(0).max(1),
  recommendedAction: z.enum(["ALLOW", "REVIEW", "HOLD"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(500),
});

export function validateDecision(value: unknown): DecisionPayload {
  return decisionPayloadSchema.parse(value);
}
