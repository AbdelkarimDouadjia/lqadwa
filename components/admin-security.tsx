"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { Language } from "@/lib/i18n";
const copy = {
  title: ["حماية حساب الإدارة", "Protéger l’accès administrateur", "Protect administration access", "Mmesten anekcum n tedbelt"],
  intro: ["أدخل رمز تطبيق المصادقة. يلزم تأكيد جديد كل عشر دقائق للعمليات المحمية.", "Saisissez le code de votre application d’authentification. Une vérification est requise toutes les dix minutes.", "Enter your authenticator code. Protected access requires verification every ten minutes.", "Sekcem tangalt n usnas n usesteb. Asenqed yal mraw n tesdatin."],
  enroll: ["إعداد تطبيق المصادقة", "Configurer l’authentificateur", "Set up authenticator", "Swel asesteb"],
  code: ["رمز من 6 أرقام", "Code à 6 chiffres", "Six-digit code", "Tangalt n 6 izwilen"],
  verify: ["تأكيد الدخول", "Vérifier l’accès", "Verify access", "Senqed anekcum"],
  help: ["امسح الرمز بتطبيق المصادقة، ثم أدخل الرمز المؤقت. احتفظ بإمكانية استرجاع التطبيق في مكان آمن.", "Scannez avec votre authentificateur, puis saisissez le code temporaire. Conservez son moyen de récupération en lieu sûr.", "Scan using your authenticator, then enter its temporary code. Store your authenticator recovery method safely.", "Sken s usnas n usesteb, syen sekcem tangalt. Mmesten abrid n tririt n usnas."],
  support: ["فقدت تطبيق المصادقة؟ تواصل مع الدعم. لا تشارك الرموز أو السر.", "Authentificateur perdu ? Contactez l’assistance. Ne partagez jamais codes ou secret.", "Lost your authenticator? Contact support. Never share codes or the secret.", "Tṛuḥ-ak usnas? Nermes tallalt. Ur beṭṭu ara tangalt neɣ uffir."],
  back: ["العودة للحساب", "Retour au compte", "Back to account", "Uɣal ɣer umiḍan"],
} as const;
type MfaResponse = { error?:string; factors?:{id:string;name:string}[]; redirect?:string; factorId?:string; secret?:string; qrCode?:string };
export function AdminSecurity() {
  const [language, setLanguage] = useState<Language>("ar"), [factors, setFactors] = useState<{id:string;name:string}[]>([]);
  const [factor, setFactor] = useState(""), [qr, setQr] = useState(""), [secret, setSecret] = useState("");
  const [code, setCode] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(true);
  const t = (key: keyof typeof copy) => copy[key][["ar","fr","en","kab"].indexOf(language)];
  useEffect(() => {
    let active = true;
    void fetch("/api/auth/mfa", { cache: "no-store", signal: AbortSignal.timeout(20000) }).then(async r => { const data = await r.json() as MfaResponse; if (!r.ok || !data.factors) throw Error(data.error || "Unavailable"); if (active) { setFactors(data.factors); setFactor(data.factors[0]?.id || ""); } }).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unavailable");}).finally(()=>{if(active)setBusy(false);});
    return () => { active=false; };
  }, []);
  async function action(enroll: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(enroll?{action:"enroll"}:{action:"verify",factorId:factor,code}), signal: AbortSignal.timeout(20000) });
      const data = await response.json() as MfaResponse; if (!response.ok) throw Error(data.error);
      if (data.redirect) { setSecret(""); setQr(""); location.replace(data.redirect); return; }
      if (!data.factorId || !data.secret || !data.qrCode) throw Error("Incomplete authenticator enrollment");
      setFactor(data.factorId); setSecret(data.secret);
      setQr(data.qrCode.startsWith("data:image/") ? data.qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.qrCode)}`);
    } catch (e) { setError(e instanceof Error?e.message:"Unavailable"); }
    finally { setCode(""); setBusy(false); }
  }
  return <main className="auth-page" dir={language==="ar"?"rtl":"ltr"}><section className="auth-card" aria-labelledby="security-title">
    <div className="auth-top"><Link className="auth-brand" href="/" aria-label="LQADWA"><img src="/brand/luqya.png" width="64" height="64" alt=""/><strong>LQADWA</strong></Link><NativeSelect aria-label="Language / اللغة" value={language} onChange={e=>setLanguage(e.target.value as Language)}>{[["ar","العربية"],["fr","Français"],["en","English"],["kab","Taqbaylit"]].map(([v,l])=><NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>)}</NativeSelect></div>
    <span className="auth-emblem"><ShieldCheck aria-hidden="true"/></span><h1 id="security-title">{t("title")}</h1><p>{t("intro")}</p>
    {qr && <><p>{t("help")}</p><img src={qr} width="200" height="200" alt="Authenticator QR"/><details><summary>Manual key / Clé manuelle / المفتاح اليدوي</summary><code dir="ltr">{secret}</code></details></>}
    {!factor && <Button disabled={busy} onClick={()=>void action(true)}>{t("enroll")}</Button>}
    {factor && <form className="auth-fields" onSubmit={e=>{e.preventDefault();void action(false);}}>{factors.length>1&&<NativeSelect aria-label="Authenticator" value={factor} onChange={e=>setFactor(e.target.value)}>{factors.map(f=><NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}</NativeSelect>}<label htmlFor="totp-code">{t("code")}</label><Input id="totp-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} dir="ltr" required/><Button disabled={busy||code.length!==6} type="submit">{t("verify")}</Button></form>}
    {error&&<p role="alert" className="auth-message">{error}</p>}<p className="auth-help">{t("support")}</p><footer><Link href="/?space=client#account">{t("back")}</Link><a href="/support">Support</a></footer>
  </section></main>;
}
