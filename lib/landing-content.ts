import { z } from "zod";
import type { Language } from "@/lib/i18n";

export const landingLanguages = ["ar", "fr", "en", "kab"] as const satisfies readonly Language[];
export const landingCopyKeys = [
  "titleA", "titleB", "lead", "explore", "clientFree", "journey", "search", "scanHelp", "confirm", "confirmHelp", "collect", "collectHelp",
  "tools", "scan", "scanBody", "scanAction", "route", "routeBody", "stock", "stockBody", "join", "offer", "offerBody", "free", "month",
  "android", "androidBody", "questions", "delivery", "aDelivery", "coverage", "aCoverage", "reserve", "aReserve",
] as const;
export const landingSectionKeys = ["journey", "tools", "pharmacy", "offer", "android", "faq"] as const;
export const contentPageKeys = ["home", "how-it-works", "for-pharmacies", "safety", "pricing", "help", "privacy"] as const;
export type ContentPageKey = typeof contentPageKeys[number];
export const contentAssets = ["/art/neighbourhood.webp", "/art/pharmacy.webp", "/art/prescription.webp", "/art/walk.webp"] as const;
export const contentBlockKinds = ["text", "cta", "image", "cards", "steps", "faq", "divider"] as const;
export const contentTargets = ["none", "search", "pharmacy", "directory", "journey", "how-it-works", "for-pharmacies", "safety", "pricing", "help", "privacy"] as const;
export const maxContentBlocks = 40;
export type LandingCopyKey = typeof landingCopyKeys[number];
export type LandingSectionKey = typeof landingSectionKeys[number];
export type LandingContent = z.infer<typeof landingContentSchema>;

const localeCopySchema = z.object(Object.fromEntries(landingCopyKeys.map(key => [key, z.string().trim().min(1).max(600).optional()]))).strict();
const localeBlockSchema = z.object({ heading: z.string().trim().max(160).optional(), body: z.string().trim().max(2000).optional(), button: z.string().trim().max(80).optional(), alt: z.string().trim().max(200).optional(), previousPrice: z.string().trim().max(80).optional() }).strict();
const languageMap = <T extends z.ZodTypeAny>(schema: T) => z.object({ ar: schema, fr: schema, en: schema, kab: schema }).partial().strict();
const contentBlockSchema = z.object({
  id: z.string().uuid(), enabled: z.boolean(), target: z.enum(contentTargets), copy: languageMap(localeBlockSchema),
  kind: z.enum(contentBlockKinds).optional(),
  image: z.enum(contentAssets).optional(),
  items: z.array(z.object({ id: z.string().uuid(), copy: languageMap(z.object({ heading: z.string().trim().max(160), body: z.string().trim().max(1200) }).strict()) }).strict()).max(12).refine(items => new Set(items.map(item => item.id)).size === items.length).optional(),
  appearance: z.object({ tone: z.enum(["soft", "plain", "brand", "sky", "sand"]), align: z.enum(["start", "center"]), width: z.enum(["full", "content", "narrow"]).optional(), spacing: z.enum(["compact", "comfortable", "spacious"]).optional(), columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }).strict().optional(),
}).strict();

export const landingContentSchema = z.object({
  version: z.literal(1),
  page: z.enum(contentPageKeys).optional(),
  hero: z.object({ enabled: z.boolean(), image: z.enum(contentAssets).optional(), alt: languageMap(z.string().trim().min(1).max(200)).optional() }).strict().optional(),
  copy: languageMap(localeCopySchema),
  sections: z.object(Object.fromEntries(landingSectionKeys.map(key => [key, z.boolean().optional()]))).strict(),
  order: z.array(z.enum(landingSectionKeys)).length(landingSectionKeys.length).refine(values => new Set(values).size === landingSectionKeys.length),
  blocks: z.array(contentBlockSchema).max(maxContentBlocks),
  layout: z.array(z.union([z.literal("hero"), z.enum(landingSectionKeys), z.string().uuid()])).max(maxContentBlocks + 7).optional(),
}).strict().superRefine((content, context) => {
  if (content.page === "privacy" && content.hero?.enabled) {
    const locales = landingLanguages.filter(language => content.copy[language]?.titleA || content.copy[language]?.lead);
    if (!locales.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["hero", "enabled"], message: "Add an introduction title and body before enabling it." });
    for (const language of locales) if (!content.copy[language]?.titleA || !content.copy[language]?.lead) context.addIssue({ code: z.ZodIssueCode.custom, path: ["copy", language], message: "Complete the introduction title and body in this language." });
  }
  if (new Set(content.blocks.map(block => block.id)).size !== content.blocks.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["blocks"], message: "Each content section needs a unique identifier." });
  }
  if (!content.layout) return;
  const ids = new Set([...(content.page && content.page !== "home" ? [] : landingSectionKeys), ...content.blocks.map(block => block.id), ...(content.layout.includes("hero") ? ["hero"] : [])]);
  if (content.layout.length !== ids.size || new Set(content.layout).size !== ids.size || content.layout.some(id => !ids.has(id))) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["layout"], message: "Include each section exactly once." });
  }
});

export const emptyLandingContent: LandingContent = {
  version: 1, copy: {}, sections: {}, order: [...landingSectionKeys], blocks: [],
};

export const landingDraftFileMaxBytes = 524_288;
const draftFileSchema = z.object({ format: z.literal("lqadwa-landing-draft"), fileVersion: z.literal(1), content: landingContentSchema }).strict();
export function exportLandingDraft(content: LandingContent) {
  return JSON.stringify(draftFileSchema.parse({ format: "lqadwa-landing-draft", fileVersion: 1, content }), null, 2);
}
export function importLandingDraft(raw: string): LandingContent {
  if (new TextEncoder().encode(raw).length > landingDraftFileMaxBytes) throw new Error("DRAFT_FILE_TOO_LARGE");
  return draftFileSchema.parse(JSON.parse(raw)).content;
}

/** Older saved pages keep their original order until the owner rearranges them. */
export function landingLayout(content: LandingContent): string[] {
  return content.layout ?? [...(content.page && content.page !== "home" ? [] : content.order), ...content.blocks.map(block => block.id)];
}

export function pageLayout(content: LandingContent): string[] {
  const layout = landingLayout(content);
  return layout.includes("hero") ? layout : ["hero", ...layout];
}

export function reorderLanding(content: LandingContent, source: string, target: string, after = false): LandingContent {
  const layout = [...pageLayout(content)];
  if (source === target || !layout.includes(source) || !layout.includes(target)) return content;
  layout.splice(layout.indexOf(source), 1);
  layout.splice(layout.indexOf(target) + Number(after), 0, source);
  if (layout.every((id, index) => id === pageLayout(content)[index])) return content;
  return { ...content, layout, order: content.page && content.page !== "home" ? content.order : layout.filter((id): id is LandingSectionKey => (landingSectionKeys as readonly string[]).includes(id)) };
}

export function parseLandingContent(value: unknown): LandingContent {
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { return emptyLandingContent; }
  }
  const result = landingContentSchema.safeParse(parsed);
  return result.success ? result.data : emptyLandingContent;
}
