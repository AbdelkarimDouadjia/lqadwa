import { z } from "zod";
// No free-form tool names, SQL, URLs, account IDs or mutation tools.
export const assistantToolInput = z.discriminatedUnion("tool", [
  z.object({tool:z.literal("catalog"),query:z.string().trim().min(2).max(100)}).strict(),
  z.object({tool:z.literal("request-status"),request:z.string().uuid()}).strict(),
  z.object({tool:z.literal("help"),topic:z.enum(["pickup","privacy","availability","support"])}).strict(),
]);
export const approvedHelp = {
  pickup:{text:"Collect at the pharmacy. Bring the original prescription when required. The pharmacist decides whether dispensing requirements are met.",source:"/safety"},
  privacy:{text:"Prescription images and full transcription stay on your device by default. Account export and deletion are available from your account.",source:"/privacy"},
  availability:{text:"Catalog inclusion does not confirm pharmacy stock. Availability must be confirmed by a participating pharmacy for your request.",source:"/how-it-works"},
  support:{text:"Use the support page to contact the operator. This assistant cannot diagnose, prescribe, change a dose or authorize substitution.",source:"/help"},
} as const;
