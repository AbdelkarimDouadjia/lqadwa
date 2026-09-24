"use client";
import { useEffect, useState } from "react";
import { Download, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr, type Language } from "@/lib/i18n";
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function AppInstall({ language }: { language: Language }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null), [hint, setHint] = useState(false);
  const t = (key: Parameters<typeof tr>[1]) => tr(language, key);
  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    const listen = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    window.addEventListener("beforeinstallprompt", listen); return () => window.removeEventListener("beforeinstallprompt", listen);
  }, []);
  return <section className="install-card"><div className="install-icon"><img src="/brand/luqya.png" alt="LQADWA" width="60" height="60" /></div><div><h2>{t("getApp")} · LQADWA</h2><p>{t("appHelp")}</p></div><div className="install-actions"><Button asChild><a href="/downloads/lqadwa-demo.apk" download><Download />{t("downloadApk")}</a></Button><Button variant="outline" onClick={async () => { if (prompt) { await prompt.prompt(); await prompt.userChoice; setPrompt(null); } else setHint(!hint); }}><Smartphone />{t("installApp")}</Button><Button variant="ghost" onClick={async () => { const url = window.location.origin; try { if (navigator.share) await navigator.share({ title: "LQADWA · لقى دوا", url }); else { await navigator.clipboard.writeText(url); setHint(true); } } catch { /* Native share cancellation needs no error. */ } }}><Share2 />{t("shareApp")}</Button></div>{hint && <p className="install-hint">{t("installHint")}</p>}</section>;
}
