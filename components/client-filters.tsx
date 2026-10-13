"use client";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect,NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { Language } from "@/lib/i18n";
import { ex } from "@/lib/experience-copy";
export function ClientFilters({language,radius,query,saved,onRadius,onQuery,onSaved,onReset}:{language:Language;radius:number;query:string;saved:boolean;onRadius:(n:number)=>void;onQuery:(s:string)=>void;onSaved:(b:boolean)=>void;onReset:()=>void}){
 const t=(key:Parameters<typeof ex>[1])=>ex(language,key);
 return <details className="client-filter-panel"><summary><SlidersHorizontal/>{t("filters")}{(radius||query||saved)?<span className="badge neutral">{[radius>0,!!query,saved].filter(Boolean).length}</span>:null}</summary><div className="control-grid"><label>{t("radius")}<NativeSelect value={String(radius)} onChange={e=>onRadius(Number(e.target.value))}>{[0,1,3,5,10,20,50].map(n=><NativeSelectOption value={String(n)} key={n}>{n?`${n} km`:t("any")}</NativeSelectOption>)}</NativeSelect></label><label>{t("pharmacyName")}<Input value={query} maxLength={100} onChange={e=>onQuery(e.target.value)}/></label><label className="filter-switch">{t("favorites")}<Switch checked={saved} onCheckedChange={onSaved}/></label><Button variant="outline" onClick={onReset}>{t("reset")}</Button></div><p className="muted">{t("local")}</p></details>;
}
