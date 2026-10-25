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
const localeBlockSchema = z.object({ heading: z.string().trim().max(100).optional(), body: z.string().trim().max(600).optional(), button: z.string().trim().max(80).optional() }).strict();
const languageMap = <T extends z.ZodTypeAny>(schema: T) => z.object({ ar: schema, fr: schema, en: schema, kab: schema }).partial().strict();
const contentBlockSchema = z.object({
  id: z.string().uuid(), enabled: z.boolean(), target: z.enum(["none", "search", "pharmacy", "directory", "journey"]), copy: languageMap(localeBlockSchema),
  appearance: z.object({ tone: z.enum(["soft", "plain", "brand"]), align: z.enum(["start", "center"]) }).strict().optional(),
}).strict();

export const landingContentSchema = z.object({
  version: z.literal(1),
  copy: languageMap(localeCopySchema),
  sections: z.object(Object.fromEntries(landingSectionKeys.map(key => [key, z.boolean().optional()]))).strict(),
  order: z.array(z.enum(landingSectionKeys)).length(landingSectionKeys.length).refine(values => new Set(values).size === landingSectionKeys.length),
  blocks: z.array(contentBlockSchema).max(8),
  layout: z.array(z.union([z.enum(landingSectionKeys), z.string().uuid()])).max(14).optional(),
}).strict().superRefine((content, context) => {
  if (new Set(content.blocks.map(block => block.id)).size !== content.blocks.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["blocks"], message: "Each content section needs a unique identifier." });
  }
  if (!content.layout) return;
  const ids = new Set([...landingSectionKeys, ...content.blocks.map(block => block.id)]);
  if (content.layout.length !== ids.size || new Set(content.layout).size !== ids.size || content.layout.some(id => !ids.has(id))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["layout"], message: "Include each section exactly once." });
  }
});

export const emptyLandingContent: LandingContent = {
  version: 1, copy: {}, sections: {}, order: [...landingSectionKeys], blocks: [],
};

/** Older saved pages keep their original order until the owner rearranges them. */
export function landingLayout(content: LandingContent): string[] {
  return content.layout ?? [...content.order, ...content.blocks.map(block => block.id)];
}

export function reorderLanding(content: LandingContent, source: string, target: string, after = false): LandingContent {
  const layout = [...landingLayout(content)];
  if (source === target || !layout.includes(source) || !layout.includes(target)) return content;
  layout.splice(layout.indexOf(source), 1);
  layout.splice(layout.indexOf(target) + Number(after), 0, source);
  if (layout.every((id, index) => id === landingLayout(content)[index])) return content;
  return { ...content, layout, order: layout.filter((id): id is LandingSectionKey => (landingSectionKeys as readonly string[]).includes(id)) };
}

export function parseLandingContent(value: unknown): LandingContent {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return emptyLandingContent; }
  }
  const result = landingContentSchema.safeParse(parsed);
  return result.success ? result.data : emptyLandingContent;
}
