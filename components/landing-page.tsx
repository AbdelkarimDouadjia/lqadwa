"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { version } from "@/package.json";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { ex } from "@/lib/experience-copy";
import { editorialText } from "@/lib/editorial-copy";

export function LandingPage({ language, startHref = "/login?mode=register&return_to=%2F%3Fspace%3Dsearch", children }: { language: Language; startHref?: string; children?: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const t = (key: Parameters<typeof editorialText>[1]) => editorialText(language, key);
  const old = (key: Parameters<typeof ex>[1]) => ex(language, key);
  useEffect(() => {
    const elements = root.current?.querySelectorAll<HTMLElement>("[data-arrive]");
    if (!elements || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add("has-arrived"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return <div ref={root} className="editorial-page">
    <section className="editorial-hero">
      <h1><span className="hero-line">{t("titleA")}<span className="headline-window" aria-hidden="true"><img src="/art/neighbourhood.webp" width="1600" height="1067" alt="" /></span></span><span className="hero-line">{t("titleB")}</span></h1>
      <div className="hero-under"><p>{t("lead")}</p><div className="landing-actions"><Button asChild><a href={startHref}>{t("explore")}<ArrowUpRight aria-hidden="true" /></a></Button><span>{old("clientFree")}</span></div></div>
      <figure className="editorial-cover" data-arrive="picture"><img src="/art/neighbourhood.webp" width="1600" height="1067" fetchPriority="high" alt={t("heroAlt")} /><figcaption>{t("artwork")}</figcaption></figure>
    </section>
    <div className="editorial-directory" data-arrive="surface">{children}</div>
    <section id="how-it-works" className="editorial-journey">
      <h2 data-arrive="type">{t("journey")}</h2>
      <ol role="list">{([ ["search", "scanHelp"], ["confirm", "confirmHelp"], ["collect", "collectHelp"] ] as const).map(([title, description]) => <li key={title} data-arrive="step"><h3>{t(title)}</h3><p>{old(description)}</p></li>)}</ol>
    </section>
    <section id="why-lqadwa" className="editorial-tools">
      <h2 data-arrive="type">{t("tools")}</h2>
      <div className="editorial-cards">
        <article className="editorial-card scan-card" data-arrive="surface"><div className="editorial-card-copy"><h3>{t("scan")}</h3><p>{t("scanBody")}</p><a href="/login?return_to=%2F%3Fspace%3Dsearch">{t("scanAction")}</a></div><img src="/art/prescription.webp" width="900" height="900" loading="lazy" alt={t("scanAlt")} /></article>
        <article className="editorial-card route-card" data-arrive="picture"><img src="/art/walk.webp" width="900" height="900" loading="lazy" alt={t("walkAlt")} /><div className="editorial-card-copy"><h3>{t("route")}</h3><p>{t("routeBody")}</p><a href={startHref}>{t("explore")}</a></div></article>
      </div>
    </section>
    <section id="for-pharmacies" className="editorial-pharmacy">
      <div className="pharmacy-picture" data-arrive="picture"><img src="/art/pharmacy.webp" width="900" height="900" loading="lazy" alt={t("stockAlt")} /></div>
      <div className="pharmacy-copy"><h2 data-arrive="type">{t("stock")}</h2><p data-arrive="step">{t("stockBody")}</p><Button asChild><a href="/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy">{old("join")}</a></Button></div>
    </section>
    <section className="editorial-offer"><h2 data-arrive="type">{t("offer")}</h2><div className="offer-details"><p data-arrive="step">{t("offerBody")}</p><div className="offer-price" data-arrive="surface"><strong>{old("free")}</strong><del>{t("month")}</del></div></div></section>
    <section className="editorial-android"><div><h2 data-arrive="type">{t("android")}</h2><p>{t("androidBody")}</p></div><nav className="android-actions" aria-label={t("android")} data-arrive="surface"><Button asChild><a href={`/downloads/lqadwa-release.apk?v=${version}`}><Download aria-hidden="true" />Android 64-bit</a></Button><a href={`/downloads/lqadwa-release-armv7.apk?v=${version}`}>Android 32-bit</a></nav></section>
    <section id="questions" className="editorial-faq"><h2 data-arrive="type">{t("questions")}</h2>{([ ["delivery", "aDelivery"], ["coverage", "aCoverage"], ["reserve", "aReserve"] ] as const).map(([question, answer]) => <article key={question} data-arrive="step"><h3>{t(question)}</h3><p>{old(answer)}</p></article>)}</section>
  </div>;
}
