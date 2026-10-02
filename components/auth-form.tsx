"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { authText, type AuthCopyKey } from "@/lib/auth-copy";
import { safeReturnPath } from "@/lib/auth-redirect";
import type { Language } from "@/lib/i18n";

type Mode = "login" | "register" | "recover" | "update" | "logout";
export function AuthForm({ initialMode = "login", administration = false }: { initialMode?: Mode; administration?: boolean }) {
  const [language, setLanguage] = useState<Language>("ar"), [mode, setMode] = useState<Mode>(initialMode);
  const [message, setMessage] = useState<AuthCopyKey | "">(""), [show, setShow] = useState(false), [returnTo, setReturnTo] = useState("/");
  const form = useForm({ defaultValues: { name: "", email: "", password: "" }, shouldUnregister: true });
  const [providers, setProviders] = useState({ google: false, apple: false }), [oauthBusy, setOauthBusy] = useState(false);
  const t = (key: AuthCopyKey) => authText(language, key);
  useEffect(() => {
    if (administration) return;
    const controller = new AbortController();
    void fetch("/api/auth/providers", { cache: "no-store", signal: controller.signal }).then(async r=>r.ok?await r.json() as {google?:boolean;apple?:boolean}:null).then(p=>{if(p&&!controller.signal.aborted)setProviders({google:p.google===true,apple:p.apple===true});}).catch(()=>{});
    return ()=>controller.abort();
  }, [administration]);
  useEffect(() => {
    const stored = localStorage.getItem("dawa-language");
    if (["ar", "fr", "en", "kab"].includes(stored || "")) setLanguage(stored as Language);
    document.documentElement.dataset.theme = localStorage.getItem("dawa-theme") || "light";
    const params = new URLSearchParams(location.search);
    if (!administration && initialMode !== "logout" && ["register", "recover", "update"].includes(params.get("mode") || "")) setMode(params.get("mode") as Mode);
    setReturnTo(administration ? "/operations" : safeReturnPath(params.get("return_to")));
    if (params.has("expired")) setMessage("expired");
    if (params.has("changed")) setMessage("changed");
  }, [initialMode, administration]);
  useEffect(() => {
    document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("dawa-language", language);
  }, [language]);
  const changeMode = (next: Mode) => { setMode(next); setMessage(""); form.reset(); };
  const busy = form.formState.isSubmitting || oauthBusy;
  async function signInProvider(provider: "google" | "apple") {
    if (busy) return;
    setOauthBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "oauth", provider, returnTo }), signal: AbortSignal.timeout(25000) });
      const result = await response.json() as { redirect?: string; error?: string };
      if (response.ok && result.redirect) { window.location.assign(result.redirect); return; }
      setMessage(result.error === "PROVIDER_UNAVAILABLE" ? "PROVIDER_UNAVAILABLE" : result.error === "RATE_LIMIT" ? "RATE_LIMIT" : "UNAVAILABLE");
    } catch { setMessage("UNAVAILABLE"); }
    setOauthBusy(false);
  }
  async function submit(values: { name: string; email: string; password: string }) {
    setMessage("");
    try {
      const body = administration && mode === "login" ? {action:"admin-login",identifier:values.email,password:values.password} : {...values,action:mode,returnTo};
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(25000) });
      const result = await response.json() as { error?: string; redirect?: string };
      if (!response.ok) { setMessage((["CREDENTIALS", "FIELDS", "RATE_LIMIT", "EMAIL_DELIVERY", "PASSWORD"].includes(result.error || "") ? result.error : "UNAVAILABLE") as AuthCopyKey); return; }
      if (result.redirect) { window.location.assign(result.redirect); return; }
      setMessage("CHECK_EMAIL"); form.resetField("password");
    } catch { setMessage("UNAVAILABLE"); }
  }
  const fields = mode === "register" ? ["name", "email", "password"] as const : mode === "recover" ? ["email"] as const : mode === "update" ? ["password"] as const : mode === "logout" ? [] : ["email", "password"] as const;
  return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
    <div className="auth-top"><a className="auth-brand" href="/" aria-label="LQADWA"><img src="/brand/luqya.png" alt="" width="64" height="64" /><strong>LQADWA<span>لقى دوا</span></strong></a><NativeSelect aria-label="Language / اللغة" value={language} onChange={e=>setLanguage(e.target.value as Language)}>{[["ar","العربية"],["fr","Français"],["en","English"],["kab","Taqbaylit"]].map(([code,label])=><NativeSelectOption key={code} value={code}>{label}</NativeSelectOption>)}</NativeSelect></div>
    <span className="auth-emblem"><ShieldCheck aria-hidden="true" /></span><h1 id="auth-title">{mode === "login" ? t(administration ? "adminTitle" : "title") : t(mode)}</h1><p className="muted">{t(administration ? "adminIntro" : "intro")}</p>
    {!administration && mode !== "logout" && mode !== "update" && <div className="auth-tabs">{(["login","register"] as const).map(item=><Button key={item} type="button" variant={mode===item?"default":"outline"} aria-pressed={mode===item} disabled={busy} onClick={()=>changeMode(item)}>{t(item)}</Button>)}</div>}
    {(mode === "login" || mode === "register") && (providers.google || providers.apple) && <div className="auth-providers">{(["google", "apple"] as const).filter(p=>providers[p]).map(p=><Button key={p} type="button" variant="outline" disabled={busy} onClick={()=>void signInProvider(p)}>{oauthBusy && <LoaderCircle className="spin" aria-hidden="true"/>}{t(p)}</Button>)}<p className="auth-help">{t("emailAlternative")}</p></div>}
    <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="auth-fields" aria-busy={busy}>
      {fields.map(name=><FormField key={name} control={form.control} name={name} rules={{ required:t("FIELDS"), ...(name==="name"?{minLength:{value:2,message:t("FIELDS")},maxLength:60}:name==="email"?{...(administration && mode==="login" ? {} : {pattern:{value:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,message:t("FIELDS")}}),maxLength:254}:{minLength:{value:mode==="login"&&!administration?1:12,message:t("PASSWORD")},maxLength:128}) }} render={({field})=><FormItem><FormLabel>{t(name==="email"&&administration&&mode==="login"?"adminIdentifier":name)}</FormLabel><div className="auth-input"><FormControl><Input {...field} disabled={busy} type={name==="password"?(show?"text":"password"):name==="email"&&!(administration&&mode==="login")?"email":"text"} dir={name==="name"?undefined:"ltr"} autoComplete={name==="name"?"name":name==="email"?administration&&mode==="login"?"username":"email":mode==="login"?"current-password":"new-password"} autoCapitalize="none" spellCheck={name==="name"} /></FormControl>{name==="password"&&<button type="button" className="auth-eye" aria-label={t(show?"hide":"show")} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button>}</div>{name==="password"&&(mode!=="login"||administration)&&<p className="auth-help">{t("passwordHelp")}</p>}<FormMessage/></FormItem>}/>)}
      {administration && mode==="login" && <p className="auth-help">{t("adminHelp")}</p>}
      {message&&<p className={`auth-message ${message==="CHECK_EMAIL"||message==="changed"?"success":""}`} role="status" aria-live="polite">{t(message)}</p>}
      <Button type="submit" disabled={busy} className="auth-submit">{busy&&<LoaderCircle className="spin" aria-hidden="true"/>}{t(mode)}</Button>
      {mode==="login"&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>changeMode("recover")}>{t("forgot")}</Button>}
      {administration&&mode==="recover"&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>changeMode("login")}>{t("login")}</Button>}
    </form></Form>
    {mode==="register"&&<p className="auth-help">{t("pharmacy")}</p>}
    <footer><a href="/">{t("back")}</a><a href="/privacy">{t("privacy")}</a></footer>
  </section></main>;
}
