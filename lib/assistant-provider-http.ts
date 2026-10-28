import {providers,type AssistantProvider} from "./assistant-providers.ts";
import {selectEvidence} from "./assistant-evidence-ai.ts";
import type {AssistantAnswer} from "./assistant-contract";
type ProviderErrorCode="provider_auth"|"provider_rate_limit"|"provider_unavailable";
export class ProviderConnectionError extends Error { code:ProviderErrorCode;constructor(code:ProviderErrorCode){super(code);this.code=code;} }
function ensureResponse(response:Response) {
  if(!response.ok)throw new ProviderConnectionError(response.status===401||response.status===403?"provider_auth":response.status===429?"provider_rate_limit":"provider_unavailable");
  if(!response.headers.get("content-type")?.includes("application/json"))throw new ProviderConnectionError("provider_unavailable");
}
export async function checkProviderKey(provider:AssistantProvider,key:string,signal:AbortSignal,request:typeof fetch=fetch) {
  const headers:Record<string,string>={accept:"application/json"};
  if(provider==="anthropic"){headers["x-api-key"]=key;headers["anthropic-version"]="2023-06-01";}
  else if(provider==="gemini")headers["x-goog-api-key"]=key;
  else headers.authorization=`Bearer ${key}`;
  const response=await request(providers[provider].url,{headers,redirect:"error",signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});
  try{ensureResponse(response);}finally{await response.body?.cancel();}
}
async function boundedJson(response:Response) {
  try{ensureResponse(response);}catch(error){await response.body?.cancel();throw error;}
  const reader=response.body?.getReader();if(!reader)throw new ProviderConnectionError("provider_unavailable");
  let size=0,text="";const decoder=new TextDecoder("utf-8",{fatal:true});
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw new ProviderConnectionError("provider_unavailable");}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
  return JSON.parse(text+decoder.decode());
}
export function freeEvidenceRunner(key:string,request:typeof fetch=fetch) {
  return async (_model:string,input:{messages:{role:"system"|"user";content:string}[];max_tokens:number;temperature:number;stream:false},options:{signal:AbortSignal})=>{
    // Fixed free router and zero price ceilings. No paid fallback, plugins, user IDs, patient query or account tools.
    const response=await request("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},redirect:"error",signal:options.signal,body:JSON.stringify({model:"openrouter/free",...input,provider:{max_price:{prompt:0,completion:0,request:0},allow_fallbacks:false,data_collection:"deny",zdr:true},reasoning:{enabled:false},response_format:{type:"json_object"}})});
    const data=await boundedJson(response);
    if(data.usage?.cost && Number(data.usage.cost)!==0)throw new ProviderConnectionError("provider_unavailable");
    const content=data.choices?.[0]?.message?.content;
    if(typeof content!=="string" || content.length>1500)throw new ProviderConnectionError("provider_unavailable");
    return {response:content};
  };
}
export async function probeFreeEvidence(key:string,signal:AbortSignal,request:typeof fetch=fetch) {
  const evidence:AssistantAnswer={mode:"retrieval",text:"Public service guide",asOf:new Date().toISOString(),citations:[{id:"public-pickup",title:"Pickup",url:"/how-it-works",text:"Collection takes place in person at the pharmacy. A catalog listing is not confirmation of stock.",hash:"synthetic-public-probe",updated:"2026-10-28"}]};
  try{await selectEvidence(evidence,freeEvidenceRunner(key,request),signal);}catch(error){if(error instanceof ProviderConnectionError)throw error;throw new ProviderConnectionError("provider_unavailable");}
}
