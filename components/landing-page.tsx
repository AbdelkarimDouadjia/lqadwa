"use client";
import { version } from "@/package.json";
import { ArrowUpLeft, Search, ScanLine, MapPin, ShieldCheck, Store, Package, Check, Route, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Language } from "@/lib/i18n";
import { ex } from "@/lib/experience-copy";
import { LandingExtras } from "@/components/landing-extras";
import type { ReactNode } from "react";
export function LandingPage({language,startHref="/login?mode=register&return_to=%2F%3Fspace%3Dsearch",children}:{language:Language;startHref?:string;children?:ReactNode}){
 const t=(key:Parameters<typeof ex>[1])=>ex(language,key);
 return <div className="landing-page">
 <section className="landing-hero">
  <div className="landing-hero-copy">
   <span className="landing-kicker"><ShieldCheck/>{t("clientFree")}</span>
   <h1>{t("intro")}</h1><p>{t("lead")}</p>
   <div className="landing-actions">
    <Button asChild><a href={startHref} aria-describedby="landing-availability"><Search/>{t("start")}</a></Button>
    <a className="landing-secondary-link" href="#for-pharmacies"><Store/>{t("price")}</a>
   </div>
   <p id="landing-availability" className="landing-availability">{t("confirmHelp")}</p>
   <a className="landing-download" href={`/downloads/lqadwa-release.apk?v=${version}`}><Smartphone/>{language==="ar"?"متوفر على Android":language==="fr"?"Disponible sur Android":language==="kab"?"Yella deg Android":"Available on Android"}</a>
  </div>
  <div className="landing-illustration" aria-hidden="true"><div className="illustration-grid"/><div className="illustration-route"/><div className="illustration-pin origin"><MapPin/></div><div className="illustration-pin destination"><Store/></div><div className="illustration-brand"><img src="/brand/luqya.png" width="120" height="120" alt=""/><strong>LQADWA</strong></div><div className="illustration-caption"><Route/>{t("map")}</div></div>
 </section>
 {children}
 <section id="how-it-works" className="landing-section"><h2>{t("how")}</h2><div className="landing-steps">{([[ScanLine,"scan","scanHelp"],[Check,"confirm","confirmHelp"],[Store,"collect","collectHelp"]] as const).map(([Icon,title,help],i)=><article key={title}><div><span>{String(i+1).padStart(2,"0")}</span><Icon/></div><h3>{t(title)}</h3><p>{t(help)}</p></article>)}</div></section>
 <section id="why-lqadwa" className="landing-section"><h2>{t("features")}</h2><div className="landing-benefits">{([[MapPin,"map","mapHelp"],[ShieldCheck,"private","privateHelp"],[Package,"stock","stockHelp"]] as const).map(([Icon,title,help])=><article key={title}><span className="square-icon"><Icon/></span><h3>{t(title)}</h3><p>{t(help)}</p></article>)}</div></section>
 <section id="for-pharmacies" className="landing-pharmacy"><div><span className="overline"><Store/>{t("price")}</span><h2>{t("pharmacyTitle")}</h2><p>{t("pharmacyLead")}</p><Button asChild><a href="/login?mode=register&return_to=%2F%3Fspace%3Dpharmacy">{t("join")}<ArrowUpLeft/></a></Button></div><aside><del>300 {language==="ar"?"دج / شهر":language==="fr"?"DA / mois":language==="kab"?"DA / aggur":"DA / month"}</del><strong>{t("free")}</strong><p>{t("until")}</p><span><Check/>{t("clientFree")}</span></aside></section>
 <LandingExtras language={language}/>
 <section id="questions" className="landing-section landing-faq"><span className="overline">LQADWA · FAQ</span><h2>{t("faq")}</h2>{([["qDelivery","aDelivery"],["qCoverage","aCoverage"],["qReserve","aReserve"]] as const).map(([q,a])=><details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>)}<a href="mailto:abdelkarim.douadjia@gmail.com">{t("support")}</a></section></div>;
}
