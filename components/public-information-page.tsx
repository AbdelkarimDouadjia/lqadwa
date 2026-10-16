import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicInfoCopy, type PublicInfoPath } from "@/lib/public-information-copy";
import { editorialText } from "@/lib/editorial-copy";
import type { Language } from "@/lib/i18n";

const actionHref = (page: PublicInfoPath) => page === "safety" ? "/privacy" : page === "for-pharmacies" || page === "pricing" ? "/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy" : "/login?mode=register&return_to=%2F%3Fspace%3Dsearch";
const pageLinks: PublicInfoPath[] = ["how-it-works", "for-pharmacies", "safety", "pricing", "help"];
const pageHref = (page: PublicInfoPath, language: Language) => `/${page}${language === "ar" ? "" : `?lang=${language}`}`;

export function PublicInformationPage({ page, language }: { page: PublicInfoPath; language: Language }) {
  const copy = publicInfoCopy(language, page);
  const labels: Record<PublicInfoPath, string> = {
    "how-it-works": editorialText(language, "howPage"),
    "for-pharmacies": editorialText(language, "pharmacyPage"),
    safety: editorialText(language, "safetyPage"),
    pricing: editorialText(language, "pricingPage"),
    help: editorialText(language, "helpPage"),
  };
  return <article className="editorial-page public-information-page">
    <header className="public-info-hero">
      <div className="public-info-intro">
        <h1>{copy.title}</h1>
        <p>{copy.summary}</p>
        <Button asChild><a href={actionHref(page)}>{copy.action}<ArrowUpRight aria-hidden="true" /></a></Button>
      </div>
      <figure className="public-info-image"><img src={copy.image} width="1200" height="900" fetchPriority="high" alt={copy.imageAlt} /></figure>
    </header>
    <ul className="public-info-facts" aria-label={copy.label}>{copy.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>
    {copy.price && <aside className="public-info-price" aria-label={editorialText(language, "pricingPage")}>
      <div><strong>{copy.price.amount}</strong><p>{copy.price.period}</p></div>
      <div className="public-info-price-note"><del>{copy.price.oldAmount}</del><p>{copy.price.note}</p></div>
    </aside>}
    <div className="public-info-sections">{copy.sections.map(section => <section className="public-info-section" key={section.title}>
      <h2>{section.title}</h2>
      <div><p>{section.body}</p><p className="public-info-detail">{section.detail}</p></div>
    </section>)}</div>
    {copy.questions && <section className="public-info-questions"><h2>{copy.label}</h2><div>{copy.questions.map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>}
    <nav className="public-info-related" aria-label={editorialText(language, "helpPage")}>
      {pageLinks.filter(item => item !== page).map(item => <a href={pageHref(item, language)} key={item}>{labels[item]}<ArrowUpRight aria-hidden="true" /></a>)}
    </nav>
  </article>;
}
