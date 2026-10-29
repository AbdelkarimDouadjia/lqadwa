"use client";
import {useEffect,useState} from "react";
import {KeyRound,ShieldCheck,ArrowLeft,RefreshCw,ExternalLink} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {NativeSelect,NativeSelectOption} from "@/components/ui/native-select";
import {providers,type AssistantProvider,type ProviderSettings} from "@/lib/assistant-providers";
import {settingsText} from "@/lib/assistant-settings-copy";
import type {Language} from "@/lib/i18n";
async function load(signal?:AbortSignal):Promise<ProviderSettings>{
 const response=await fetch("/api/assistant/settings",{cache:"no-store",signal});
 if(!response.ok){const error=new Error("Settings unavailable");error.name=response.status===403?"MFA_REQUIRED":"SettingsError";throw error;}
 return await response.json() as ProviderSettings;
}
export function AdminAssistantLink({language}:{language:Language}){
 return <Button asChild variant="outline" className="assistant-settings-link"><a href={`/operations/assistant?lang=${language}`}><KeyRound aria-hidden="true"/>{settingsText(language,"title")}</a></Button>;
}
export function AdminAssistantSettings({language}:{language:Language}){
 const t=(key:Parameters<typeof settingsText>[1])=>settingsText(language,key);
 const [data,setData]=useState<ProviderSettings|null>(null),[provider,setProvider]=useState<AssistantProvider>("openrouter"),[key,setKey]=useState(""),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[mfa,setMfa]=useState(false),[confirmRemove,setConfirmRemove]=useState(false);
 const selected=data?.items.find(item=>item.provider===provider),ready=Boolean(data?.storageReady&&data?.encryptionReady);
 const errorText=t("error");
 useEffect(()=>{const abort=new AbortController();void load(abort.signal).then(value=>{if(!abort.signal.aborted)setData(value);}).catch(error=>{if(!abort.signal.aborted){setMessage(errorText);if(error.name==="MFA_REQUIRED")setMfa(true);}});return()=>abort.abort();},[errorText]);
 async function run(action:"save"|"test"|"enable"|"disable"|"remove"){
  if(busy)return;setBusy(true);setMessage("");
  const apiKey=key;setKey("");setConfirmRemove(false);
  try{
   const response=await fetch("/api/assistant/settings",{method:"POST",headers:{"content-type":"application/json"},cache:"no-store",signal:AbortSignal.timeout(15000),body:JSON.stringify({action,provider,revision:selected?.revision||0,...(action==="save"?{apiKey}:{}),...(action==="test"||action==="enable"?{publicEvidenceConsent:consent}:{})})});
   const result=await response.json() as ProviderSettings & {code?:string};
   if(!response.ok){
    if(result.code==="MFA_REQUIRED")setMfa(true);
    if(response.status===409){setData(await load());setMessage(t(result.code==="revision_conflict"?"conflict":"error"));}
    else setMessage(t(result.code==="provider_auth"?"failedKey":response.status===429||result.code==="provider_rate_limit"?"rate":result.code==="provider_unavailable"?"unavailable":result.code==="setup_required"?"setup":"error"));
    return;
   }
   setData(result);setMessage(t("done"));
  }catch{setMessage(t("error"));}finally{setBusy(false);}
 }
 return <main className="main-layout assistant-settings-page" dir={language==="ar"?"rtl":"ltr"}>
  <div className="page-heading"><a href="/operations" className="row"><ArrowLeft aria-hidden="true"/>{t("back")}</a><div className="overline">LQADWA · OWNER</div><h1>{t("title")}</h1><p>{t("intro")}</p></div>
  <section className="panel assistant-settings-panel" aria-label={t("title")}>
   <p className="row"><ShieldCheck aria-hidden="true"/>{t("free")}</p><p>{t("privacy")}</p>
   {data?.cloudflareChat?.bound&&<aside className="assistant-nvidia-settings"><h2>{t("cloudflare")}</h2><p>{t(data.cloudflareChat.publicAuthorized?"cloudflareReady":"cloudflareHold")}</p></aside>}
   {data?.nvidiaEvaluation?.configured&&<aside className="assistant-nvidia-settings"><h2>{t("nvidia")}</h2><p>{t("nvidiaNote")}</p>{!data.chatFallbackAuthorized&&<p>{t("chatConsentNeeded")}</p>}{data.nvidiaEvaluation.enabled&&<Button asChild variant="outline"><a href={`/operations/assistant/chat?lang=${language}`}>{t("nvidia")}</a></Button>}</aside>}
   {!ready&&data&&<p role="alert">{t("setup")}</p>}{data&&!data.externalEnabled&&<p>{t("externalOff")}</p>}
   {mfa&&<a href="/operations/security">{t("mfa")}</a>}
   <label htmlFor="assistant-provider">{t("provider")}</label><NativeSelect id="assistant-provider" value={provider} disabled={busy} onChange={event=>{setProvider(event.target.value as AssistantProvider);setKey("");setConsent(false);setConfirmRemove(false);setMessage("");}}>{Object.entries(providers).map(([id,value])=><NativeSelectOption value={id} key={id}>{value.name}</NativeSelectOption>)}</NativeSelect>
   <a className="row" href={providers[provider].keyUrl} target="_blank" rel="noopener noreferrer">{t("create")} <ExternalLink aria-hidden="true"/></a>
   <div className="assistant-provider-status" aria-live="polite"><strong>{selected?.configured?t("saved"):t("missing")}</strong><span>{selected?.enabled?t("active"):t("inactive")}</span><span>{selected?.tested?t("tested"):t("untested")}</span></div>
   <form onSubmit={event=>{event.preventDefault();void run("save");}}>
    <label htmlFor="assistant-api-key">{t("key")}</label><Input id="assistant-api-key" type="password" value={key} onChange={event=>setKey(event.target.value)} minLength={16} maxLength={512} autoComplete="off" spellCheck={false} required disabled={!ready||busy||mfa} aria-describedby="assistant-key-note"/>
    <p id="assistant-key-note">{t("noKeyEcho")}</p><Button type="submit" disabled={!ready||busy||mfa||key.trim().length<16}><KeyRound aria-hidden="true"/>{t("save")}</Button>
   </form>
   <label className="row"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={busy||mfa}/><span>{t("consent")}</span></label>
   {provider!=="openrouter"&&<p>{t("metadataOnly")}</p>}
   <div className="row assistant-provider-actions">
    <Button variant="outline" disabled={busy||mfa||!selected?.configured||!consent} onClick={()=>run("test")}>{t("test")}</Button>
    {provider==="openrouter"&&<Button disabled={busy||mfa||!selected?.tested||!consent||!data?.externalEnabled||selected?.enabled} onClick={()=>run("enable")}>{t("enable")}</Button>}
    <Button variant="outline" disabled={busy||mfa||!selected?.enabled} onClick={()=>run("disable")}>{t("disable")}</Button>
    <Button variant="outline" disabled={busy||mfa||!selected?.configured} onClick={()=>setConfirmRemove(true)}>{t("remove")}</Button>
    <Button variant="ghost" disabled={busy} onClick={()=>{setMessage("");void load().then(setData).catch(error=>{setMessage(t("error"));if(error.name==="MFA_REQUIRED")setMfa(true);});}}><RefreshCw aria-hidden="true"/>{t("refresh")}</Button>
   </div>
   {confirmRemove&&<div role="group" aria-label={t("confirm")} className="assistant-remove-confirm"><p>{t("removeNote")}</p><Button onClick={()=>run("remove")} disabled={busy}>{t("confirm")}</Button><Button variant="ghost" onClick={()=>setConfirmRemove(false)} disabled={busy}>{t("cancel")}</Button></div>}
   <p role="status">{busy?t("busy"):message}</p><small>{t("removeNote")}</small>
  </section>
 </main>;
}
