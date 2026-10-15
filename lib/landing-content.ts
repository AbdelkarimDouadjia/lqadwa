import { z } from "zod";
import type { Language } from "@/lib/i18n";

export const landingLanguages = ["ar", "fr", "en", "kab"] as const satisfies readonly Language[];
export const landingCopyKeys = [
  "titleA", "titleB", "lead", "explore", "clientFree", "journey", "search", "scanHelp", "confirm", "confirmHelp", "collect", "collectHelp",
  "tools", "scan", "scanBody", "scanAction", "route", "routeBody", "stock", "stockBody", "join", "offer", "offerBody", "free", "month",
  "android", "androidBody", "questions", "delivery", "aDelivery", "coverage", "aCoverage", "reserve", "aReserve",
] as const;
export const landingSectionKeys = ["journey", "tools", "pharmacy", "offer", "android", "faq"] as const;
export type LandingCopyKey = typeof landingCopyKeys[number];
export type LandingSectionKey = typeof landingSectionKeys[number];
export type LandingContent = z.infer<typeof landingContentSchema>;

const localeCopySchema = z.object(Object.fromEntries(landingCopyKeys.map(key => [key, z.string().trim().min(1).max(600).optional()]))).strict();
const localeBlockSchema = z.object({ heading: z.string().trim().min(1).max(100).optional(), body: z.string().trim().min(1).max(600).optional(), button: z.string().trim().min(1).max(80).optional() }).strict();
const languageMap = <T extends z.ZodTypeAny>(schema: T) => z.object({ ar: schema, fr: schema, en: schema, kab: schema }).partial().strict();
const contentBlockSchema = z.object({
  id: z.string().uuid(), enabled: z.boolean(), target: z.enum(["none", "search", "pharmacy", "directory", "journey"]), copy: languageMap(localeBlockSchema),
}).strict();

export const landingContentSchema = z.object({
  version: z.literal(1),
  copy: languageMap(localeCopySchema),
  sections: z.object(Object.fromEntries(landingSectionKeys.map(key => [key, z.boolean().optional()]))).strict(),
  order: z.array(z.enum(landingSectionKeys)).length(landingSectionKeys.length).refine(values => new Set(values).size === landingSectionKeys.length),
  blocks: z.array(contentBlockSchema).max(8),
}).strict();

export const emptyLandingContent: LandingContent = {
  version: 1, copy: {}, sections: {}, order: [...landingSectionKeys], blocks: [],
};

export function parseLandingContent(value: unknown): LandingContent {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return emptyLandingContent; }
  }
  const result = landingContentSchema.safeParse(parsed);
  return result.success ? result.data : emptyLandingContent;
}
