"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NativeSelect,NativeSelectOption } from "@/components/ui/native-select";
import type { Language } from "@/lib/i18n";
import { ex } from "@/lib/experience-copy";
export type Preferences={largeText:boolean;lessMotion:boolean;refresh:number;radius:number;favorites:string[];threshold:number};
const defaults:Preferences={largeText:false,lessMotion:false,refresh:30,radius:0,favorites:[],threshold:5};
export function usePreferences(owner:string|undefined){
 const [stored,setStored]=useState<{owner:string;value:Preferences}|null>(null);
 const value=stored&&stored.owner===owner?stored.value:defaults;
 useEffect(()=>{if(!owner)return;let active=true;queueMicrotask(()=>{if(!active)return;let next=defaults;try{const raw=JSON.parse(localStorage.getItem(`lqadwa-preferences:${owner}`)||"{}");next={largeText:raw.largeText===true,lessMotion:raw.lessMotion===true,refresh:[0,30,60,120].includes(raw.refresh)?raw.refresh:30,radius:[0,1,3,5,10,20,50].includes(raw.radius)?raw.radius:0,favorites:Array.isArray(raw.favorites)?raw.favorites.filter((id:unknown)=>typeof id==="string"&&id.length<=100).slice(0,300):[],threshold:Number.isInteger(raw.threshold)&&raw.threshold>=1&&raw.threshold<=100?raw.threshold:5};}catch{}setStored({owner,value:next});});return()=>{active=false;};},[owner]);
 const update=(partial:Partial<Preferences>)=>{if(!owner)return;const next={...value,...partial};setStored({owner,value:next});try{localStorage.setItem(`lqadwa-preferences:${owner}`,JSON.stringify(next));}catch{}};
 useEffect(()=>{document.documentElement.dataset.largeText=value.largeText?"true":"false";document.documentElement.dataset.lessMotion=value.lessMotion?"true":"false";return()=>{delete document.documentElement.dataset.largeText;delete document.documentElement.dataset.lessMotion;};},[value.largeText,value.lessMotion]);
 return {value,update};
}
export function PreferencesPanel({language,value,update}:{language:Language;value:Preferences;update:(partial:Partial<Preferences>)=>void}){
 const t=(key:Parameters<typeof ex>[1])=>ex(language,key);
 return <section className="panel preference-panel"><h2>{t("settings")}</h2><p className="muted">{t("local")}</p><label>{t("largeText")}<Switch checked={value.largeText} onCheckedChange={largeText=>update({largeText})}/></label><label>{t("lessMotion")}<Switch checked={value.lessMotion} onCheckedChange={lessMotion=>update({lessMotion})}/></label><label htmlFor="refresh-interval">{t("refreshRate")}</label><NativeSelect id="refresh-interval" value={String(value.refresh)} onChange={e=>update({refresh:Number(e.target.value)})}>{[0,30,60,120].map(seconds=><NativeSelectOption key={seconds} value={String(seconds)}>{seconds?`${seconds} s`:t("manual")}</NativeSelectOption>)}</NativeSelect><Button variant="outline" onClick={()=>update({...defaults,favorites:value.favorites})}>{t("resetPrefs")}</Button></section>;
}
