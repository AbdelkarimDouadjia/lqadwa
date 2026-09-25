"use client";
import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { tr, type Language } from "@/lib/i18n";

export function DeviceSecurity({ language }: { language: Language }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const copy = {
    ar: { title: "أمان أجهزة الهاتف", help: "فقدت هاتفك؟ يمكنك إنهاء كل جلسات تطبيق Android. لن يتغير تسجيل دخولك في المتصفح.", action: "فصل كل الهواتف", done: "تم فصل جميع الهواتف. يلزم ربطها مجدداً لتسجيل الدخول." },
    fr: { title: "Sécurité des téléphones", help: "Téléphone perdu ? Révoquez toutes les sessions Android sans fermer cette session navigateur.", action: "Déconnecter tous les téléphones", done: "Tous les téléphones sont déconnectés. Une nouvelle association est nécessaire." },
    en: { title: "Phone security", help: "Lost your phone? Revoke all Android sessions without signing out of this browser.", action: "Disconnect all phones", done: "All phones disconnected. They must be linked again to sign in." },
    kab: { title: "Taɣellist n tilifunin", help: "Tzemreḍ ad teffɣeḍ seg meṛṛa tilifunin. Iminig ad yeqqim yeqqen. Taqbaylit · Beta.", action: "Ffeɣ seg meṛṛa tilifunin", done: "Meṛṛa tilifunin ffɣen. Anekcum ilaq ad yettwasentem tikkelt nniḍen." },
  }[language];
  async function revoke() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/app", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sessions-revoke" }) });
      if (!response.ok) throw new Error();
      setMessage(copy.done); setOpen(false);
    } catch { setMessage(tr(language, "error")); }
    finally { setBusy(false); }
  }
  return <section className="panel"><Smartphone /><h2>{copy.title}</h2><p>{copy.help}</p><Button variant="outline" onClick={() => { setMessage(""); setOpen(true); }}>{copy.action}</Button>{message && <p role="status">{message}</p>}<Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>{copy.action}</DialogTitle><DialogDescription>{copy.help}</DialogDescription><Button disabled={busy} onClick={() => void revoke()}>{tr(language, "confirm")}</Button><Button disabled={busy} variant="outline" onClick={() => setOpen(false)}>{tr(language, "cancel")}</Button>{message && <p role="alert">{message}</p>}</DialogContent></Dialog></section>;
}
