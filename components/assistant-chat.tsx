"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowUp, BookOpen, Check, ChevronLeft, ExternalLink, MessageCircle, Moon, Search, ShieldCheck, Square, Store, Sun, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { assistantText } from "@/lib/assistant-copy";
import type { AssistantAnswer, AssistantInput } from "@/lib/assistant-contract";
import type { Language } from "@/lib/i18n";
import { cities } from "@/lib/wilayas";
type Mode="chat"|"help"|"catalog"|"pharmacies"|"requests";
type Turn={id:number;question:string;answer?:AssistantAnswer;error?:string;login?:boolean};
const prompts={ar:["كيف أستلم الحجز؟","كيف أحمي بياناتي؟","كيف أسترجع كلمة المرور؟"],fr:["Comment retirer ma réservation ?","Comment protéger mes données ?","Comment réinitialiser mon mot de passe ?"],en:["How do I collect my reservation?","How is my data protected?","How do I reset my password?"],kab:["Amek ara d-awiɣ aḥraz-iw?","Amek ara ḥerzeɣ isefka-w?","Amek ara beddleɣ awal uffir?"]};
const statuses:Record<string,[string,string,string,string]>={
  "service-paused":["توقف مؤقت للخدمة","Service en pause","Service paused","Ameẓlu yeḥbes"],"requests-paused":["الطلبات متوقفة","Demandes en pause","Requests paused","Isuturen ḥebsen"],"pickups-paused":["الاستلام متوقف","Retraits en pause","Pickups paused","Awaway yeḥbes"],
  open:["قيد المتابعة","En cours","Open","Yeldi"],expired:["منتهي","Expiré","Expired","Ifukk"],stopped:["متوقف","Arrêté","Stopped","Yeḥbes"],
  pending:["بانتظار ردّ الصيدلية","En attente de réponse","Awaiting pharmacy reply","Yettraǧu tiririt"],no:["ردّ: غير متوفر","Réponse : indisponible","Reply: unavailable","Tiririt: ulac"],
  "confirmed-at-time":["ردّ إيجابي حديث، وقت التأكيد أدناه","Réponse positive récente, date ci-dessous","Recent positive reply, time below","Tiririt tameɣtut tamaynut"],
  "stale-positive":["ردّ إيجابي قديم؛ أعد التأكيد","Réponse positive ancienne ; reconfirmez","Stale positive reply; reconfirm","Tiririt tameɣtut taqdimt"],
  "partner-unavailable":["الصيدلية غير متاحة بالخدمة","Pharmacie indisponible sur le service","Partner unavailable on service","Tasendlist ur tewjed ara"],
  "request-stopped":["الطلب متوقف","Demande arrêtée","Request stopped","Asuter yeḥbes"],"request-expired":["الطلب منتهٍ","Demande expirée","Request expired","Asuter ifukk"],
  active:["حجز نشط","Réservation active","Active reservation","Aḥraz yermed"],cancelled:["ملغى","Annulé","Cancelled","Yettwasefsex"],collected:["تم الاستلام","Retiré","Collected","Yettwawi"],reservation:["الحجز","Réservation","Reservation","Aḥraz"],
};
export function AssistantChat({language,initialDark,enabled,chatEnabled=false,evaluation=false}:{language:Language;initialDark:boolean;enabled:boolean;chatEnabled?:boolean;evaluation?:boolean}) {
  const router=useRouter();
  const t=(key:Parameters<typeof assistantText>[1])=>assistantText(language,key);
  const [dark,setDark]=useState(initialDark),[mode,setMode]=useState<Mode>(chatEnabled?"chat":"help"),[query,setQuery]=useState(""),[area,setArea]=useState<string>(cities.find(city=>city.id==="algiers")?.id||cities[0].id),[night,setNight]=useState(false),[consent,setConsent]=useState(false);
  const [turns,setTurns]=useState<Turn[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  const controller=useRef<AbortController|null>(null), sequence=useRef(0), end=useRef<HTMLDivElement>(null), inputRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{
    document.documentElement.dir=language==="ar"?"rtl":"ltr";document.documentElement.lang=language;document.documentElement.dataset.theme=dark?"dark":"light";
    const suffix=`; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==="https:"?"; Secure":""}`;
    document.cookie=`lqadwa-theme=${dark?"dark":"light"}${suffix}`;document.cookie=`lqadwa-language=${language}${suffix}`;
  },[language,dark]);
  useEffect(()=>{end.current?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"nearest"});},[turns,busy]);
  const translateRecord=(value:string)=>statuses[value]?.[({ar:0,fr:1,en:2,kab:3} as const)[language]]||value;
  const stop=()=>{controller.current?.abort();controller.current=null;setBusy(false);setNotice(t("stop"));setTurns(values=>values.map(turn=>!turn.answer&&!turn.error?{...turn,error:t("stop")}:turn));};
  const reset=()=>{stop();setTurns([]);setNotice("");sequence.current++;inputRef.current?.focus();};
  async function send(payload?:AssistantInput,label?:string) {
    const isChat=mode==="chat"&&(!payload||payload.tool==="help");
    if(controller.current || !enabled || (isChat&&!consent)) return;
    const text=query.trim(), question=label||text||t(mode);
    const input:AssistantInput=isChat?{tool:"chat",language,query:label||text,previous:turns.filter(turn=>turn.answer?.mode==="grounded-chat"||turn.answer?.mode==="general-chat").slice(-2).map(turn=>turn.question),externalConsent:true,evaluation}:payload||(mode==="help"?{tool:"help",language,query:text,previous:turns.filter(turn=>turn.answer?.mode==="retrieval"||turn.answer?.mode==="model-selected-evidence").slice(-2).map(turn=>turn.question)}:mode==="catalog"?{tool:"catalog",language,query:text}:mode==="pharmacies"?{tool:"pharmacies",language,area,night}:{tool:"requests",language});
    const id=++sequence.current,abort=new AbortController();controller.current=abort;setBusy(true);setNotice("");setQuery("");
    setTurns(values=>[...values.slice(-11),{id,question}]);
    try {
      const response=await fetch("/api/assistant",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(input),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(mode==="chat"?20000:12000)]),cache:"no-store"});
      const answer=await response.json() as AssistantAnswer;
      if(abort.signal.aborted) return;
      if(!response.ok) {
        const error=response.status===401?t("signIn"):response.status===503?t("unavailable"):response.status===429?({ar:"وصلت إلى حد الاستخدام. حاول بعد قليل.",fr:"Limite atteinte. Réessayez plus tard.",en:"Usage limit reached. Please retry later.",kab:"Talast tewweḍ. Ɛreḍ ticki."})[language]:t("error");
        setTurns(values=>values.map(turn=>turn.id===id?{...turn,error,login:response.status===401}:turn));return;
      }
      setTurns(values=>values.map(turn=>turn.id===id?{...turn,answer}:turn));
    } catch { if(!abort.signal.aborted)setTurns(values=>values.map(turn=>turn.id===id?{...turn,error:t("error")}:turn)); }
    finally {if(controller.current===abort){controller.current=null;setBusy(false);inputRef.current?.focus();}}
  }
  return <div className="assistant-shell" dir={language==="ar"?"rtl":"ltr"}>
    <a className="skip-link" href="#assistant-main">{t("help")}</a>
    <header className="assistant-topbar"><a href={`/${language==="ar"?"":`?lang=${language}`}`} className="assistant-brand"><Image src="/brand/luqya.png" alt="" width={40} height={40} unoptimized/><strong>LQADWA<span>.</span></strong></a><div><label className="sr-only" htmlFor="assistant-language">Language</label><NativeSelect id="assistant-language" value={language} onChange={e=>{controller.current?.abort();router.push(`${evaluation?"/operations/assistant/chat":"/assistant"}?lang=${e.target.value}`);}}>{[["ar","العربية"],["fr","Français"],["en","English"],["kab","Taqbaylit"]].map(([value,label])=><NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect><button type="button" onClick={()=>setDark(value=>!value)} aria-label={t(dark?"light":"dark")}>{dark?<Sun/>:<Moon/>}</button><a href={`/${language==="ar"?"":`?lang=${language}`}#search`} aria-label="LQADWA"><ChevronLeft/></a></div></header>
    <main id="assistant-main" className="assistant-main" tabIndex={-1}>
      <aside className="assistant-sidebar"><span className="assistant-symbol"><MessageCircle aria-hidden="true"/></span><h1>{t("title")}</h1><p>{t(chatEnabled?"chatLead":"lead")}</p><div className="assistant-modes" role="group" aria-label={t("help")}>{(chatEnabled?["chat","help","catalog","pharmacies","requests"] as const:["help","catalog","pharmacies","requests"] as const).map(item=>{const Icon={chat:MessageCircle,help:BookOpen,catalog:Search,pharmacies:Store,requests:Check}[item];return <button key={item} type="button" aria-pressed={mode===item} disabled={busy||!enabled} onClick={()=>{setMode(item);setQuery("");setNotice("");}}><Icon aria-hidden="true"/>{t(item)}</button>;})}</div><p className="assistant-readonly"><ShieldCheck aria-hidden="true"/>{t("readOnly")}</p><a href={`/help?lang=${language}`}>{t("help")} <ExternalLink size={14} aria-hidden="true"/></a></aside>
      <section className="assistant-conversation" aria-label={t("title")}>
        {evaluation&&<p className="assistant-evaluation">{t("evaluation")}</p>}<div className="assistant-conversation-bar"><span>{t(mode)}</span><Button type="button" variant="ghost" onClick={reset} aria-label={t("clear")} disabled={!turns.length&&!busy}><Trash2 aria-hidden="true"/><span>{t("clear")}</span></Button></div>
        {!enabled?<div className="assistant-empty"><BookOpen aria-hidden="true"/><h2>{t("unavailable")}</h2><a href={`/help?lang=${language}`}>{t("help")}</a></div>:<>
          <div className="assistant-transcript" aria-live="polite" aria-relevant="additions text">
            {!turns.length&&<div className="assistant-empty"><MessageCircle aria-hidden="true"/><h2>{t(mode==="chat"?"chatLead":mode==="help"?"lead":mode)}</h2>{(mode==="help"||mode==="chat")&&<div className="assistant-prompts">{prompts[language].map(question=><button type="button" disabled={mode==="chat"&&!consent} key={question} onClick={()=>send({tool:"help",query:question,language,previous:[]},question)}>{question}<ArrowUp aria-hidden="true" size={16}/></button>)}</div>}</div>}
            {turns.map(turn=><article className="assistant-turn" key={turn.id}><p className="assistant-question" dir="auto">{turn.question}</p>{turn.error?<div role="alert" className="assistant-error"><p>{turn.error}</p>{turn.login&&<a href={`/login?return_to=${encodeURIComponent(`/assistant?lang=${language}`)}`}>{t("signIn")}</a>}</div>:turn.answer&&<div className="assistant-answer">{(turn.answer.mode==="grounded-chat"||turn.answer.mode==="general-chat")&&<small className="assistant-answer-kind">{t(turn.answer.mode==="grounded-chat"?"groundedAnswer":"generalAnswer")}</small>}<p className="assistant-answer-text" dir="auto">{turn.answer.text}</p>{turn.answer.fallback&&<small>{t("fallback")}</small>}{turn.answer.limit&&<small className="assistant-limit">{t("limit")} {turn.answer.limit}</small>}{turn.answer.records?.map(record=><div className="assistant-record" key={record.id}><strong dir="auto">{translateRecord(record.title)}</strong>{record.details.filter(Boolean).map((detail,index)=><span key={index} dir="auto">{translateRecord(detail)}</span>)}{record.action&&<Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>send(record.action==="medicine"?{tool:"medicine",medicineId:record.id,language}:{tool:"request-status",requestId:record.id,language},record.title)}>{record.action==="medicine"?t("catalog"):t("requests")} <ChevronLeft aria-hidden="true"/></Button>}</div>)}{turn.answer.citations.length>0&&<div className="assistant-sources"><h3><BookOpen size={15} aria-hidden="true"/>{t("sources")}</h3>{turn.answer.citations.map(source=><details key={source.id} open={!["tool","grounded-chat"].includes(turn.answer!.mode)}><summary><span>{source.title}</span><small>{source.updated}</small></summary><p>{source.text}</p><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ExternalLink size={13} aria-hidden="true"/></a><small className="assistant-source-version">{source.id} · SHA-256 {source.hash.slice(0,12)}</small></details>)}</div>}<time dateTime={turn.answer.asOf}>{new Date(turn.answer.asOf).toLocaleTimeString(language==="kab"?"fr":language,{hour:"2-digit",minute:"2-digit"})}</time></div>}</article>)}
            {busy&&<p role="status" className="assistant-loading"><span/><span/><span/>{t("thinking")}</p>}<div ref={end}/>
          </div>
          {mode==="chat"&&<label className="assistant-external-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>{t("externalConsent")}</span></label>}<form className="assistant-composer" onSubmit={e=>{e.preventDefault();void send();}}>
            {mode==="chat"||mode==="help"||mode==="catalog"?<><label className="sr-only" htmlFor="assistant-query">{t(mode)}</label><textarea id="assistant-query" ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} rows={2} minLength={2} maxLength={mode==="catalog"?100:400} disabled={busy} required placeholder={t(mode==="chat"?"chatPlaceholder":mode==="help"?"placeholder":"medicinePlaceholder")}/></>:mode==="pharmacies"?<div className="assistant-directory-filters"><label htmlFor="assistant-area">{t("area")}</label><NativeSelect id="assistant-area" value={area} onChange={e=>setArea(e.target.value)} disabled={busy}>{cities.map(city=><NativeSelectOption key={city.id} value={city.id}>{language==="ar"?city.name:city.latin}</NativeSelectOption>)}</NativeSelect><label><input type="checkbox" checked={night} onChange={e=>setNight(e.target.checked)} disabled={busy}/>{t("night")}</label></div>:<p>{t("statusNote")}</p>}
            {busy?<Button type="button" onClick={stop}><Square aria-hidden="true"/>{t("stop")}</Button>:<Button type="submit" disabled={((mode==="chat"||mode==="help"||mode==="catalog")&&query.trim().length<2)||(mode==="chat"&&!consent)}><ArrowUp aria-hidden="true"/>{t("send")}</Button>}
          </form>
        </>}
        <p className="assistant-privacy">{t(mode==="chat"?"chatPrivacy":"privacy")}</p><p role="status" className="assistant-notice">{notice}</p>
      </section>
    </main>
  </div>;
}
