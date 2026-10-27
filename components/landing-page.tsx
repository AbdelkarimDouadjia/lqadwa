"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { version } from "@/package.json";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { editorialText } from "@/lib/editorial-copy";
import { emptyLandingContent, landingLayout, type LandingContent, type LandingCopyKey, type LandingSectionKey } from "@/lib/landing-content";
import { landingDefaultCopy } from "@/lib/landing-copy";

type Props = { language: Language; startHref?: string; children?: ReactNode; content?: LandingContent; hideDirectory?: boolean; renderEditorSection?: (id: string, node: ReactNode) => ReactNode };
const sectionLinks = {
  none: "", search: "/login?mode=register&return_to=%2F%3Fspace%3Dsearch",
  pharmacy: "/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy", directory: "#find-a-pharmacy", journey: "#how-it-works",
} as const;

export function LandingPage({ language, startHref = "/login?mode=register&return_to=%2F%3Fspace%3Dsearch", children, content = emptyLandingContent, hideDirectory = false, renderEditorSection }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof editorialText>[1]) => editorialText(language, key);
  const copy = (key: LandingCopyKey) => {
    const override = content.copy[language]?.[key];
    if (override !== undefined) return override;
    return landingDefaultCopy(language, key);
  };
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>("[data-arrive]");
    if (!elements || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("has-arrived"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [content]);
  const wrap = (id: string, node: ReactNode) => renderEditorSection ? renderEditorSection(id, node) : node;

  const sections = {
    journey: <section id="how-it-works" className="editorial-journey"><h2 data-arrive="type">{copy("journey")}</h2><ol role="list"><li data-arrive="step"><h3>{copy("search")}</h3><p>{copy("scanHelp")}</p></li><li data-arrive="step"><h3>{copy("confirm")}</h3><p>{copy("confirmHelp")}</p></li><li data-arrive="step"><h3>{copy("collect")}</h3><p>{copy("collectHelp")}</p></li></ol></section>,
    tools: <section id="why-lqadwa" className="editorial-tools"><h2 data-arrive="type">{copy("tools")}</h2><div className="editorial-cards"><article className="editorial-card scan-card" data-arrive="surface"><div className="editorial-card-copy"><h3>{copy("scan")}</h3><p>{copy("scanBody")}</p><a href="/login?return_to=%2F%3Fspace%3Dsearch">{copy("scanAction")}</a></div><img src="/art/prescription.webp" width="900" height="900" loading="lazy" alt={t("scanAlt")} /></article><article className="editorial-card route-card" data-arrive="picture"><img src="/art/walk.webp" width="900" height="900" loading="lazy" alt={t("walkAlt")} /><div className="editorial-card-copy"><h3>{copy("route")}</h3><p>{copy("routeBody")}</p><a href={startHref}>{copy("explore")}</a></div></article></div></section>,
    pharmacy: <section id="for-pharmacies" className="editorial-pharmacy"><div className="pharmacy-picture" data-arrive="picture"><img src="/art/pharmacy.webp" width="900" height="900" loading="lazy" alt={t("stockAlt")} /></div><div className="pharmacy-copy"><h2 data-arrive="type">{copy("stock")}</h2><p data-arrive="step">{copy("stockBody")}</p><Button asChild><a href="/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy">{copy("join")}</a></Button></div></section>,
    offer: <section className="editorial-offer"><h2 data-arrive="type">{copy("offer")}</h2><div className="offer-details"><p data-arrive="step">{copy("offerBody")}</p><div className="offer-price" data-arrive="surface"><strong>{copy("free")}</strong><del>{copy("month")}</del></div></div></section>,
    android: <section className="editorial-android"><div><h2 data-arrive="type">{copy("android")}</h2><p>{copy("androidBody")}</p></div><nav className="android-actions" aria-label={copy("android")} data-arrive="surface"><Button asChild><a href={`/downloads/lqadwa-release.apk?v=${version}`}><Download aria-hidden="true" />Android 64-bit</a></Button><a href={`/downloads/lqadwa-release-armv7.apk?v=${version}`}>Android 32-bit</a></nav></section>,
    faq: <section id="questions" className="editorial-faq"><h2 data-arrive="type">{copy("questions")}</h2>{([ ["delivery", "aDelivery"], ["coverage", "aCoverage"], ["reserve", "aReserve"] ] as const).map(([question, answer]) => <article key={question} data-arrive="step"><h3>{copy(question)}</h3><p>{copy(answer)}</p></article>)}</section>,
  };
  const custom = new Map(content.blocks.map(block => {
    const text = block.copy[language]!;
    const targetVisible = block.target !== "journey" || content.sections.journey !== false;
    const visible = block.enabled && text?.heading?.trim() && text?.body?.trim();
    return [block.id, visible || renderEditorSection ? <section className={`editorial-custom-section block-tone-${block.appearance?.tone ?? "soft"} block-align-${block.appearance?.align ?? "start"}`} key={block.id} data-arrive="surface"><h2>{text?.heading}</h2><p>{text?.body}</p>{text?.button && block.target !== "none" && targetVisible && <Button asChild><a href={sectionLinks[block.target]}>{text.button}<ArrowUpRight aria-hidden="true" /></a></Button>}</section> : null] as const;
  }));

  return <div ref={root} className="editorial-page">
    {wrap("hero", <section className="editorial-hero"><h1><span className="hero-line">{copy("titleA")}<span className="headline-window" aria-hidden="true"><img src="/art/neighbourhood.webp" width="1600" height="1067" alt="" /></span></span><span className="hero-line">{copy("titleB")}</span></h1><div className="hero-under"><p>{copy("lead")}</p><div className="landing-actions"><Button asChild><a href={startHref}>{copy("explore")}<ArrowUpRight aria-hidden="true" /></a></Button><span>{copy("clientFree")}</span></div></div><figure className="editorial-cover" data-arrive="picture"><img src="/art/neighbourhood.webp" width="1600" height="1067" fetchPriority="high" alt={t("heroAlt")} /><figcaption>{t("artwork")}</figcaption></figure></section>)}
    {!hideDirectory && <div className="editorial-directory" data-arrive="surface">{children}</div>}
    {landingLayout(content).map(id => {
      const builtIn = id in sections;
      if (builtIn && content.sections[id as LandingSectionKey] === false && !renderEditorSection) return null;
      const node = builtIn ? sections[id as LandingSectionKey] : custom.get(id);
      return node ? <div key={id}>{wrap(id, node)}</div> : null;
    })}
  </div>;
}
