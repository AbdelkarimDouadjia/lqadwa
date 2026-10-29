import { env } from "cloudflare:workers";
import { z } from "zod";
import { identity, isRootAdmin, HttpError, tokenHash } from "@/lib/access";
import {requirePrivilegedSession} from "@/lib/privileged-access";
import { limitedJson, privateHeaders, rateLimit, requireMutationOrigin } from "@/lib/http-security";
import { database } from "@/db";
import { assistantInput, assistantPolicy } from "@/lib/assistant-contract";
import { corpusVersion, retrievalAnswer } from "@/lib/assistant-retrieval";
import { readAssistantTool } from "@/lib/assistant-tools";
import { optionalEvidence } from "@/lib/assistant-evidence-ai";
import { managedEvidenceRunner,managedChatProviders } from "@/lib/assistant-provider-store";
import {conversationalAnswer} from "@/lib/assistant-rag";

export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders});
export async function GET() {
  const chatEnabled=assistantPolicy(env).enabled&&env.ASSISTANT_CHAT_ENABLED==="true";
  return json({enabled:assistantPolicy(env).enabled,chatEnabled,corpusVersion,externalPatientProcessing:chatEnabled,readOnly:true});
}
export async function POST(request:Request) {
  try {
    requireMutationOrigin(request);
    const input=assistantInput.parse(await limitedJson(request,4096)), policy=assistantPolicy(env);
    if(!policy.enabled) return json({error:"Assistant unavailable",code:"feature_disabled"},503);
    const user=await identity(request);
    await rateLimit(user.userId,"assistant",10,60);
    await rateLimit(user.userId,"assistant-daily",100,86400);
    if(request.signal.aborted) return json({code:"cancelled"},408);
    if(input.tool==="chat"){
      if(input.evaluation){
        if(!isRootAdmin(user.userId))throw new HttpError("Owner evaluation only",403);
        await requirePrivilegedSession(user.userId,request);
        if(env.ASSISTANT_NVIDIA_EVALUATION_ENABLED!=="true")throw new HttpError("Evaluation disabled",503,"feature_disabled");
      }else if(env.ASSISTANT_CHAT_ENABLED!=="true")throw new HttpError("Conversational chat disabled",503,"feature_disabled");
      const db=database(),providers=await managedChatProviders(input.evaluation);
      const guarded=providers.map(provider=>({...provider,run:async(...args:Parameters<typeof provider.run>)=>{
        try{return await provider.run(...args);}catch{
          await db.prepare("INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,expires=excluded.expires").bind(await tokenHash("assistant-chat-circuit:"+provider.id),Date.now()+60000).run();
          throw Error("Chat provider unavailable");
        }
      }}));
      return json(await conversationalAnswer(input,guarded,request.signal,async provider=>{
        if(await db.prepare("SELECT count FROM rate_limits WHERE key=? AND expires>?").bind(await tokenHash("assistant-chat-circuit:"+provider),Date.now()).first())return false;
        await rateLimit("all-users","assistant-evidence-global",20,86400);
        return true;
      }));
    }
    if(input.tool!=="help") return json(await readAssistantTool(input,user.userId));
    let answer=retrievalAnswer(input.query,input.language,input.previous);
    const managed=policy.evidenceAI && answer.mode==="retrieval"?await managedEvidenceRunner().catch(()=>null):null;
    const run=managed;
    if(policy.evidenceAI && run && answer.mode==="retrieval") {
      const key=await tokenHash("assistant-evidence-circuit"), db=database();
      answer=await optionalEvidence(answer,run,request.signal,async()=>{
        const circuit=await db.prepare("SELECT count FROM rate_limits WHERE key=? AND expires>?").bind(key,Date.now()).first();
        if(circuit) return false;
        // Hard application-wide bound: 20 provider attempts/day, no retries, including failed attempts.
        await rateLimit("all-users","assistant-evidence-global",20,86400);
        return true;
      },async()=>{
        // No prompts, responses, account IDs or provider exception messages are logged or stored.
        return db.prepare("INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=1,expires=excluded.expires").bind(key,Date.now()+60000).run();
      });
    }
    return json(answer);
  } catch(error) {
    if(error instanceof z.ZodError) return json({error:"Invalid assistant input",code:"invalid_input"},400);
    if(error instanceof HttpError) return json({error:error.message,code:error.code||(error.status===429?"rate_limited":"unauthorized")},error.status);
    console.error("Assistant read unavailable");
    return json({error:"Assistant temporarily unavailable",code:"unavailable"},503);
  }
}
