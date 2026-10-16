"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LandingPage } from "@/components/landing-page";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PublicDirectory } from "@/components/public-directory";
import { publicLanguage } from "@/lib/public-page";
import type { LandingContent } from "@/lib/landing-content";
import type { Language } from "@/lib/i18n";
const LegacyApp = dynamic(() => import("@/components/lqadwa-app"), { ssr: false });

export function PublicLanding({ initialLanguage, initialDark, initialContent }: { initialLanguage: Language; initialDark: boolean; initialContent: LandingContent }) {
  const [language, setLanguage] = useState(initialLanguage), [dark, setDark] = useState(initialDark);
  const [legacy, setLegacy] = useState(false);
  useEffect(() => {
    let active = true;
    const sync = () => { if (active) setLegacy(/^#(pharmacy|pharmacist|map|bookings|account|admin)$/.test(location.hash)); };
    queueMicrotask(sync); window.addEventListener("hashchange", sync);
    return () => { active = false; window.removeEventListener("hashchange", sync); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("dawa-language", language); localStorage.setItem("dawa-theme", dark ? "dark" : "light");
    const suffix = `; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    document.cookie = `lqadwa-language=${language}${suffix}`; document.cookie = `lqadwa-theme=${dark ? "dark" : "light"}${suffix}`;
  }, [language, dark]);
  if (legacy) return <LegacyApp initialLandingContent={initialContent} />;
  const changeLanguage = (value: Language) => {
    setLanguage(publicLanguage(value)); const url = new URL(location.href);
    if (value === "ar") url.searchParams.delete("lang"); else url.searchParams.set("lang", value);
    history.replaceState(null, "", url);
  };
  return <div className="app-shell is-signed-out">
    <a className="skip-link" href="#main">{language === "ar" ? "تجاوز إلى المحتوى" : language === "fr" ? "Aller au contenu" : language === "kab" ? "Ruḥ ɣer ugbur" : "Skip to content"}</a>
    <SiteHeader signedOut role="client" view="search" language={language} dark={dark} name="" unread={0} navigate={() => window.scrollTo({ top: 0, behavior: "auto" })} onLanguage={changeLanguage} onTheme={() => setDark(value => !value)} onNotifications={() => {}} />
    <main id="main" className="main-layout" tabIndex={-1}><LandingPage language={language} startHref="#find-a-pharmacy" content={initialContent}><PublicDirectory language={language} /></LandingPage></main>
    <SiteFooter language={language} signedOut role="client" />
  </div>;
}
