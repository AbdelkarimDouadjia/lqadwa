"use client";
import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { Language } from "@/lib/i18n";

export function PublicInfoSite({ language, initialDark, children }: { language: Language; initialDark: boolean; children: ReactNode }) {
  const [dark, setDark] = useState(initialDark);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("dawa-language", language);
    localStorage.setItem("dawa-theme", dark ? "dark" : "light");
    const suffix = `; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    document.cookie = `lqadwa-language=${language}${suffix}`;
    document.cookie = `lqadwa-theme=${dark ? "dark" : "light"}${suffix}`;
  }, [language, dark]);
  const changeLanguage = (value: Language) => {
    const url = new URL(location.href);
    if (value === "ar") url.searchParams.delete("lang"); else url.searchParams.set("lang", value);
    location.assign(url);
  };
  const goHome = () => {
    const url = new URL("/", location.origin);
    if (language !== "ar") url.searchParams.set("lang", language);
    location.assign(url);
  };
  return <div className="app-shell is-signed-out public-info-shell">
    <a className="skip-link" href="#main">{language === "ar" ? "تجاوز إلى المحتوى" : language === "fr" ? "Aller au contenu" : language === "kab" ? "Ruḥ ɣer ugbur" : "Skip to content"}</a>
    <SiteHeader signedOut role="client" view="search" language={language} dark={dark} name="" unread={0} navigate={goHome} onLanguage={changeLanguage} onTheme={() => setDark(value => !value)} onNotifications={() => {}} />
    <main id="main" className="main-layout public-info-main" tabIndex={-1}>{children}</main>
    <SiteFooter language={language} signedOut role="client" />
  </div>;
}
