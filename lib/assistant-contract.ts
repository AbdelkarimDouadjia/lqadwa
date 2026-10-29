import { z } from "zod";

export const assistantLanguage = z.enum(["ar", "fr", "en", "kab"]);
const query = z.string().trim().min(2).max(400);
// The caller chooses an allowlisted read; neither a model nor the caller supplies SQL, URLs or an owner.
export const assistantInput = z.discriminatedUnion("tool", [
  z.object({ tool: z.literal("chat"), language: assistantLanguage, query, previous: z.array(query).max(2).default([]), externalConsent: z.literal(true), evaluation:z.boolean().default(false) }).strict(),
  z.object({ tool: z.literal("help"), language: assistantLanguage, query, previous: z.array(query).max(2).default([]) }).strict(),
  z.object({ tool: z.literal("catalog"), language: assistantLanguage, query: z.string().trim().min(2).max(100) }).strict(),
  z.object({ tool: z.literal("medicine"), language: assistantLanguage, medicineId: z.string().regex(/^miph-2026-08:\d{5}$/) }).strict(),
  z.object({ tool: z.literal("pharmacies"), language: assistantLanguage, area: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/), night: z.boolean().default(false) }).strict(),
  z.object({ tool: z.literal("requests"), language: assistantLanguage }).strict(),
  z.object({ tool: z.literal("request-status"), language: assistantLanguage, requestId: z.string().uuid() }).strict(),
]);
export type AssistantInput = z.infer<typeof assistantInput>;
export type AssistantCitation = { id: string; title: string; url: string; updated: string; hash: string; text: string };
export type AssistantAnswer = {
  mode: "retrieval" | "model-selected-evidence" | "grounded-chat" | "general-chat" | "tool" | "abstain" | "safety";
  text: string; citations: AssistantCitation[]; asOf: string; fallback?: boolean;
  limit?: number;
  // Typed records are rendered as plain text, never interpreted as model instructions or HTML.
  records?: { id: string; title: string; details: string[]; action?: "medicine" | "request-status" }[];
};
export function assistantPolicy(config: { GROUNDED_ASSISTANT_ENABLED?: string; ASSISTANT_EVIDENCE_AI_ENABLED?: string }) {
  const enabled = config.GROUNDED_ASSISTANT_ENABLED === "true";
  return { enabled, evidenceAI: enabled && config.ASSISTANT_EVIDENCE_AI_ENABLED === "true" };
}
