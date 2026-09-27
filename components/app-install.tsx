"use client";
import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, type Language } from "@/lib/i18n";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function AppInstall({ language }: { language: Language }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null), [hint, setHint] = useState(false);
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const copy = {
    ar: { native: "تطبيق Android أصلي · نسخة مرشحة للإطلاق · RC1", old: "للأجهزة القديمة · 32-bit", web: "تثبيت نسخة المتصفح", help: "واجهات أصلية، خرائط ومسح بالكاميرا. Android 6 أو أحدث. إذا ثبّتَّ النسخة التجريبية القديمة، احذفها أولاً ثم سجّل الدخول من جديد؛ بيانات الحساب محفوظة على الخادم. يُفتح المتصفح فقط لتأكيد تسجيل الدخول أو الملاحة الخارجية." },
    fr: { native: "Application Android native · RC1", old: "Anciens appareils · 32 bits", web: "Installer la version navigateur", help: "Écrans natifs, cartes et scan photo. Android 6 ou plus. Désinstallez l’ancien pilote avant cette version signée, puis reconnectez-vous ; les données du compte restent sur le serveur. Le navigateur sert uniquement à confirmer la connexion ou à ouvrir la navigation externe." },
    en: { native: "Native Android app · RC1", old: "Older devices · 32-bit", web: "Install browser version", help: "Native screens, maps and camera scanning. Android 6 or later. Uninstall the old pilot before this signed release, then sign in again; account data stays on the server. The browser is used only to confirm sign-in or open external navigation." },
    kab: { native: "Asnas Android native · aɣawas n usekyed", old: "Tilifunin iqburen · 32-bit", web: "Sbedd lqem n yiminig", help: "Android 6 neɣ ugar. Kkes lqem aqbur send usbeddi n RC1. Iminig yettwaseqdac i usentem n unekcum akked ubrid berra n usnas. Taqbaylit · Beta." },
  }[language];
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const listen = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    window.addEventListener("beforeinstallprompt", listen); return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);
  return <section className="install-card"><div className="install-icon"><img src="/brand/luqya.png" alt="LQADWA" width="60" height="60" /></div><div><h2>{copy.native}</h2><p>{copy.help}</p></div><div className="install-actions"><Button asChild><a href="/downloads/lqadwa-release.apk" download><Download />{t("downloadApk")} · 64-bit</a></Button><Button asChild variant="outline"><a href="/downloads/lqadwa-release-armv7.apk" download>{copy.old}</a></Button><Button variant="outline" onClick={async () => { if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); } else setHint(!hint); }}><Smartphone />{copy.web}</Button><Button variant="ghost" onClick={async () => { const url = window.location.origin; try { if (navigator.share) await navigator.share({ title: "LQADWA · لقى دوا", url }); else { await navigator.clipboard.writeText(url); setHint(true); } } catch { /* Native share cancellation needs no error. */ } }}><Share2 />{t("shareApp")}</Button></div>{hint && <p className="install-hint">{t("installHint")}</p>}</section>;
}
