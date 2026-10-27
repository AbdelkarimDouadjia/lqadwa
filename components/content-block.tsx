import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contentAssets, type LandingContent } from "@/lib/landing-content";
import type { Language } from "@/lib/i18n";

export function contentTargetHref(target: LandingContent["blocks"][number]["target"]) {
  if (target === "search" || target === "pharmacy") return `/login?mode=register&return_to=${encodeURIComponent(`/?space=${target}`)}`;
  if (target === "directory") return "/#find-a-pharmacy";
  if (target === "journey") return "/how-it-works";
  return target === "none" ? "" : `/${target}`;
}
export function ContentBlock({ block, language, editing = false }: { block: LandingContent["blocks"][number]; language: Language; editing?: boolean }) {
  const text = block.copy[language], kind = block.kind ?? "text", items = block.items?.filter(item => item.copy[language]?.heading.trim());
  if (!editing && (!block.enabled || (kind !== "divider" && !text?.heading?.trim() && !text?.body?.trim() && !items?.length))) return null;
  if (kind === "divider") return <div className={`block-width-${block.appearance?.width ?? "full"} block-spacing-${block.appearance?.spacing ?? "comfortable"}`}><hr className="content-divider" /></div>;
  return <section className={`editorial-custom-section content-block block-kind-${kind} block-tone-${block.appearance?.tone ?? "soft"} block-align-${block.appearance?.align ?? "start"} block-width-${block.appearance?.width ?? "full"} block-spacing-${block.appearance?.spacing ?? "comfortable"}`} style={{ "--block-columns": block.appearance?.columns ?? 2 } as React.CSSProperties}>
    {kind === "image" && <figure><img src={block.image ?? contentAssets[0]} width="1200" height="900" loading="lazy" alt={text?.alt ?? ""} /></figure>}
    {text?.previousPrice ? <div className="content-price-line"><h2>{text.heading}</h2><del>{text.previousPrice}</del></div> : text?.heading && <h2>{text.heading}</h2>}{text?.body && <p className="content-block-body">{text.body}</p>}
    {items && kind === "faq" ? <div className="content-faq">{items.map(item => <details key={item.id}><summary>{item.copy[language]!.heading}</summary><p>{item.copy[language]!.body}</p></details>)}</div> : items?.length ? <div className={`content-items ${kind === "steps" ? "content-steps" : ""}`}>{items.map((item, index) => <article key={item.id}>{kind === "steps" && <span aria-hidden="true">{index + 1}</span>}<h3>{item.copy[language]!.heading}</h3>{item.copy[language]!.body && <p>{item.copy[language]!.body}</p>}</article>)}</div> : null}
    {text?.button && block.target !== "none" && <Button asChild><a href={contentTargetHref(block.target)}>{text.button}<ArrowUpRight aria-hidden="true" /></a></Button>}
  </section>;
}
