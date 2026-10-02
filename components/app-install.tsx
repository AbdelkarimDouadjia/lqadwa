"use client";
import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, type Language } from "@/lib/i18n";
import { version } from "@/package.json";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function AppInstall({ language }: { language: Language }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null), [hint, setHint] = useState(false);
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  const copy = {
    ar: { native: "LQADWA لهاتف Android", old: "للأجهزة القديمة · 32-bit", web: "اختصار نسخة المتصفح", help: "تطبيق أصلي بخرائط ومسح بالكاميرا، وليس صفحة ويب داخل تطبيق. Android 6 أو أحدث. تسجيل الدخول داخل التطبيق؛ تأكيد الحساب واسترجاع كلمة المرور وبعض الخدمات الخارجية تفتح في المتصفح. إذا رفض الهاتف التحديث بسبب اختلاف التوقيع، احذف النسخة القديمة ثم ثبّت هذه النسخة وسجّل الدخول؛ بيانات حسابك محفوظة على الخادم." },
    fr: { native: "LQADWA pour Android", old: "Anciens appareils · 32 bits", web: "Raccourci de la version web", help: "Application native avec cartes et scan photo, sans page web intégrée. Android 6 ou plus. Connexion dans l’application ; confirmation du compte, récupération du mot de passe et certains services externes dans le navigateur. Si une signature différente bloque la mise à jour, désinstallez l’ancienne application puis reconnectez-vous ; vos données restent sur le serveur." },
    en: { native: "LQADWA for Android", old: "Older devices · 32-bit", web: "Browser-version shortcut", help: "Native screens, maps and camera scanning—not a website wrapper. Android 6 or later. Sign in inside the app. Account confirmation, password recovery and some external services open in the browser. If a signing mismatch blocks the update, uninstall the older app and sign in again after installing; your account data stays on the server." },
    kab: { native: "LQADWA i Android", old: "Tilifunin iqburen · 32-bit", web: "Anegzum n lqem n yiminig", help: "Android 6 neɣ ugar. Asnas s tekarḍa d tkamirat. Iminig yettwaseqdac i usentem n unekcum akked kra n yimeẓla berra n usnas." },
  }[language];
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const listen = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    window.addEventListener("beforeinstallprompt", listen); return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);
  return <section className="install-card"><div className="install-icon"><img src="/brand/luqya.png" alt="LQADWA" width="60" height="60" /></div><div><h2>{copy.native}</h2><p>{copy.help}</p></div><div className="install-actions"><Button asChild><a href={`/downloads/lqadwa-release.apk?v=${version}`} download><Download />{t("downloadApk")} · 64-bit</a></Button><Button asChild variant="outline"><a href={`/downloads/lqadwa-release-armv7.apk?v=${version}`} download>{copy.old}</a></Button><Button variant="outline" onClick={async () => { if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); } else setHint(!hint); }}><Smartphone />{copy.web}</Button><Button variant="ghost" onClick={async () => { const url = window.location.origin; try { if (navigator.share) await navigator.share({ title: "LQADWA · لقى دوا", url }); else { await navigator.clipboard.writeText(url); setHint(true); } } catch { /* Native share cancellation needs no error. */ } }}><Share2 />{t("shareApp")}</Button></div>{hint && <p className="install-hint">{t("installHint")}</p>}</section>;
}
