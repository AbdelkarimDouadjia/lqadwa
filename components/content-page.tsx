import type { ReactNode } from "react";
import type { Language } from "@/lib/i18n";
import { pageLayout, type ContentPageKey, type LandingContent } from "@/lib/landing-content";
import { pageDefaultCopy, contentPageLabels } from "@/lib/content-pages";
import { ContentBlock, contentTargetHref } from "@/components/content-block";
import { Button } from "@/components/ui/button";

export function ContentPage({ page, language, content, renderEditorSection }: { page: Exclude<ContentPageKey, "home">; language: Language; content: LandingContent; renderEditorSection?: (id: string, node: ReactNode) => ReactNode }) {
  const copy = (key: "titleA" | "lead" | "explore") => content.copy[language]?.[key] ?? pageDefaultCopy(page, language, key);
  const wrap = (id: string, node: ReactNode) => renderEditorSection ? renderEditorSection(id, node) : node;
  return <article className="editorial-page public-information-page content-managed-page">
    {pageLayout(content).map(id => {
      if (id === "hero") return content.hero?.enabled === false && !renderEditorSection ? null : <div key={id}>{wrap(id, <header className="public-info-hero"><div className="public-info-intro"><h1>{copy("titleA")}</h1><p>{copy("lead")}</p>{copy("explore") && <Button asChild><a href={contentTargetHref(page === "safety" ? "privacy" : page === "pricing" || page === "for-pharmacies" ? "pharmacy" : "search")}>{copy("explore")}</a></Button>}</div>{content.hero?.image && <figure className="public-info-image"><img src={content.hero.image} width="1200" height="900" alt="" /></figure>}</header>)}</div>;
      const block = content.blocks.find(block => block.id === id);
      return block && <div key={id}>{wrap(id, <ContentBlock block={block} language={language} editing={!!renderEditorSection} />)}</div>;
    })}
    {page !== "privacy" && <nav className="public-info-related" aria-label={contentPageLabels.help[language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3]}>{(["how-it-works", "for-pharmacies", "safety", "pricing", "help"] as const).filter(key => key !== page).map(key => <a key={key} href={`/${key}${language === "ar" ? "" : `?lang=${language}`}`}>{contentPageLabels[key][language === "ar" ? 0 : language === "fr" ? 1 : language === "en" ? 2 : 3]}<span aria-hidden="true">↗</span></a>)}</nav>}
  </article>;
}
