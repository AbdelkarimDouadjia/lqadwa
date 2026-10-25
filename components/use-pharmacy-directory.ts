"use client";
import { useCallback, useEffect, useState } from "react";
import type { Pharmacy } from "@/lib/domain";
export type DirectoryFilters = {city:string;night:boolean;radiusKm?:number;origin?:{lat:number;lng:number;consent:true}};
export function usePharmacyDirectory(enabled:boolean, filters:DirectoryFilters) {
  const key=JSON.stringify(filters);
  const [state,setState]=useState<{key:string;items:Pharmacy[];cursor:string|null;loading:boolean;error:boolean}>({key:"",items:[],cursor:null,loading:false,error:false});
  const load=useCallback(async (cursor:string|undefined,signal?:AbortSignal)=>{
    setState(old=>old.key===key?{...old,loading:true,error:false}:{key,items:[],cursor:null,loading:true,error:false});
    try {
      const response=await fetch("/api/pharmacies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...JSON.parse(key),...(cursor?{cursor}:{})}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
      if(!response.ok)throw Error();
      const result=await response.json() as {items:Pharmacy[];nextCursor:string|null};
      if(!signal?.aborted)setState(old=>old.key===key?{key,items:cursor?[...new Map([...old.items,...result.items].map(p=>[p.id,p])).values()]:result.items,cursor:result.nextCursor,loading:false,error:false}:old);
    } catch {if(!signal?.aborted)setState(old=>old.key===key?{...old,loading:false,error:true}:old);}
  },[key]);
  useEffect(()=>{if(!enabled)return;const controller=new AbortController();queueMicrotask(()=>{if(!controller.signal.aborted)void load(undefined,controller.signal);});return()=>controller.abort();},[enabled,load]);
  return {items:enabled&&state.key===key?state.items:[],hasMore:!!state.cursor,loading:state.loading,error:state.error,
    more:()=>{if(!state.loading)void load(state.cursor||undefined);},retry:()=>void load(undefined)};
}
