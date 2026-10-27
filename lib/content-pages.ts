import { emptyLandingContent, landingLanguages, type ContentPageKey, type LandingContent, type LandingCopyKey, type LandingSectionKey } from "./landing-content.ts";
import { publicInfoCopy } from "./public-information-copy.ts";
import { landingDefaultCopy } from "./landing-copy.ts";
import { editorialText } from "./editorial-copy.ts";
import type { Language } from "./i18n";

export const contentPageLabels: Record<ContentPageKey, readonly string[]> = {
  home: ["الصفحة الرئيسية", "Accueil", "Home", "Asebter agejdan"],
  "how-it-works": ["كيف تعمل", "Fonctionnement", "How it works", "Amek i iteddu"],
  "for-pharmacies": ["للصيدليات", "Pour les pharmacies", "For pharmacies", "I tsaymitin"],
  safety: ["الثقة والخصوصية", "Sécurité", "Safety", "Taɣellist"],
  pricing: ["الأسعار", "Tarifs", "Pricing", "Isuma"],
  help: ["المساعدة", "Aide", "Help", "Tallalt"],
  privacy: ["مقدمة الخصوصية", "Introduction confidentialité", "Privacy introduction", "Tazwart n tbaḍnit"],
};
export const contentPageHref = (page: ContentPageKey) => page === "home" ? "/" : `/${page}`;
export const contentPageId = (page: ContentPageKey) => page === "home" ? "main" : `page:${page}`;
const id = (number: number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;

/** Defaults become editable drafts on first load; no live row is inserted on a read. */
export function defaultPageContent(page: ContentPageKey): LandingContent {
  if (page === "home") return structuredClone(emptyLandingContent);
  const result: LandingContent = { ...structuredClone(emptyLandingContent), page, hero: { enabled: page !== "privacy" }, blocks: [] };
  if (page === "privacy") return result;
  for (const language of landingLanguages) {
    const copy = publicInfoCopy(language, page);
    result.copy[language] = { titleA: copy.title, lead: copy.summary, explore: copy.action };
    result.hero = { enabled: true, image: copy.image as NonNullable<LandingContent["hero"]>["image"], alt: { ...result.hero?.alt, [language]: copy.imageAlt } };
    const add = (index: number, kind: "text" | "cards" | "faq" | "cta", heading: string, body: string, items?: { heading: string; body: string }[]) => {
      let block = result.blocks.find(block => block.id === id(index));
      if (!block) { block = { id: id(index), kind, enabled: true, target: "none", copy: {}, appearance: { tone: "plain", align: "start", columns: kind === "cards" ? 3 : 1 }, ...(items ? { items: items.map((_, item) => ({ id: id(index * 100 + item + 1), copy: {} })) } : {}) }; result.blocks.push(block); }
      block.copy[language] = { heading, body };
      items?.forEach((item, position) => { block!.items![position].copy[language] = item; });
    };
    add(1, "cards", copy.label, "", copy.facts.map(fact => ({ heading: fact, body: "" })));
    copy.sections.forEach((section, index) => add(index + 2, "text", section.title, `${section.body}\n\n${section.detail}`));
    if (copy.price) { add(20, "cta", copy.price.amount, `${copy.price.period}\n${copy.price.note}`); result.blocks.find(block => block.id === id(20))!.copy[language]!.previousPrice = copy.price.oldAmount; }
    if (copy.questions) add(21, "faq", copy.label, "", copy.questions.map(item => ({ heading: item.question, body: item.answer })));
  }
  return result;
}

export function pageDefaultCopy(page: ContentPageKey, language: Language, key: LandingCopyKey) {
  if (page === "home") return landingDefaultCopy(language, key);
  if (page === "privacy") return "";
  const copy = publicInfoCopy(language, page);
  return key === "titleA" ? copy.title : key === "lead" ? copy.summary : key === "explore" ? copy.action : "";
}

export function pageDefaultHeroAlt(page: ContentPageKey, language: Language) {
  return page === "home" ? editorialText(language, "heroAlt") : page === "privacy" ? "" : publicInfoCopy(language, page).imageAlt;
}

export function flexibleLandingSection(content: LandingContent, section: Exclude<LandingSectionKey, "android">, blockId: string, itemIds: string[]): LandingContent["blocks"][number] {
  const definitions: Record<Exclude<LandingSectionKey, "android">, { kind: "steps" | "cards" | "image" | "cta" | "faq"; heading: LandingCopyKey; body?: LandingCopyKey; button?: LandingCopyKey; items?: [LandingCopyKey, LandingCopyKey][] }> = {
    journey: { kind: "steps", heading: "journey", items: [["search", "scanHelp"], ["confirm", "confirmHelp"], ["collect", "collectHelp"]] },
    tools: { kind: "cards", heading: "tools", items: [["scan", "scanBody"], ["route", "routeBody"]] },
    pharmacy: { kind: "image", heading: "stock", body: "stockBody", button: "join" },
    offer: { kind: "cta", heading: "offer", body: "offerBody", button: "free" },
    faq: { kind: "faq", heading: "questions", items: [["delivery", "aDelivery"], ["coverage", "aCoverage"], ["reserve", "aReserve"]] },
  };
  const definition = definitions[section];
  const block: LandingContent["blocks"][number] = { id: blockId, kind: definition.kind, enabled: true, target: section === "pharmacy" || section === "offer" ? "pharmacy" : "none", copy: {}, appearance: { tone: "soft", align: "start", columns: definition.kind === "steps" ? 3 : 2 }, ...(definition.kind === "image" ? { image: "/art/pharmacy.webp" } : {}), ...(definition.items ? { items: definition.items.map((_, index) => ({ id: itemIds[index], copy: {} })) } : {}) };
  for (const language of landingLanguages) {
    const copy = (key: LandingCopyKey) => content.copy[language]?.[key] ?? landingDefaultCopy(language, key);
    block.copy[language] = { heading: copy(definition.heading), body: definition.body ? copy(definition.body) : "", ...(definition.button ? { button: copy(definition.button) } : {}) };
    definition.items?.forEach(([heading, body], index) => { block.items![index].copy[language] = { heading: copy(heading), body: copy(body) }; });
  }
  return block;
}
