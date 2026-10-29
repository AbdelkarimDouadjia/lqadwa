import {env} from "cloudflare:workers";
import {z} from "zod";
import {database} from "@/db";
import {identity,isRootAdmin,HttpError,audit} from "@/lib/access";
import {requirePrivilegedSession} from "@/lib/privileged-access";
import {requireMutationOrigin,limitedJson,privateHeaders,rateLimit} from "@/lib/http-security";
import {providerCommand} from "@/lib/assistant-providers";
import {sealProviderKey,openProviderKey} from "@/lib/assistant-key-crypto";
import {providerStorageReady,encryptionReady,publicProviderStatus,type CredentialRow} from "@/lib/assistant-provider-store";
import {checkProviderKey,probeFreeEvidence,ProviderConnectionError} from "@/lib/assistant-provider-http";
import {chatKeyAuthorized} from "@/lib/assistant-rag";
import {cloudflareChatAuthorized} from "@/lib/assistant-cloudflare-chat";
export const dynamic="force-dynamic";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:privateHeaders});
async function owner(request:Request) {
  const user=await identity(request);if(!isRootAdmin(user.userId))throw new HttpError("Owner access required",403,"owner_required");
  await requirePrivilegedSession(user.userId,request);await rateLimit(user.userId,request.method==="GET"?"assistant-settings-read":"assistant-settings",request.method==="GET"?60:20);return user.userId;
}
async function metadata() {
  const storageReady=await providerStorageReady();
  const rows=storageReady?await database().prepare("SELECT provider,revision,enabled,tested_at,tested_version,key_version,updated_at,length(encrypted_key)>0 AS has_key FROM assistant_provider_credentials ORDER BY provider").all<CredentialRow & {has_key:number}>():{results:[]};
  const chatKey=rows.results.find(row=>row.provider==="openrouter");
  return {cloudflareChat:{bound:Boolean(env.AI),enabled:env.ASSISTANT_CLOUDFLARE_CHAT_ENABLED==="true",freeConfirmed:env.ASSISTANT_CLOUDFLARE_FREE_CONFIRMED==="true",publicAuthorized:env.ASSISTANT_CHAT_ENABLED==="true"&&cloudflareChatAuthorized(false,env)},storageReady,encryptionReady:encryptionReady(),externalEnabled:env.ASSISTANT_EVIDENCE_AI_ENABLED==="true",items:rows.results.map(row=>publicProviderStatus(row)),nvidiaEvaluation:{configured:Boolean(env.ASSISTANT_NVIDIA_API_KEY_V1),enabled:env.ASSISTANT_NVIDIA_EVALUATION_ENABLED==="true"},chatFallbackAuthorized:Boolean(chatKey?.has_key&&chatKey.enabled===1&&chatKey.tested_version===chatKey.key_version&&chatKeyAuthorized(chatKey.key_version,env.ASSISTANT_OPENROUTER_CHAT_KEY_VERSION,env.ASSISTANT_OPENROUTER_CHAT_ACCEPTANCE_REFERENCE))};
}
function fail(error:unknown) {
  if(error instanceof z.ZodError)return json({code:"invalid_input"},400);
  if(error instanceof HttpError)return json({code:error.code||"request_rejected"},error.status);
  if(error instanceof ProviderConnectionError)return json({code:error.code},502);
  // Never log request bodies, keys, encrypted records or upstream responses.
  return json({code:"settings_unavailable"},503);
}
export async function GET(request:Request) {
  try{await owner(request);return json(await metadata());}catch(error){return fail(error);}
}
export async function POST(request:Request) {
  try{
    requireMutationOrigin(request);
    const input=providerCommand.parse(await limitedJson(request,2048));
    const actor=await owner(request);
    if(!await providerStorageReady() || !encryptionReady())throw new HttpError("Secure storage setup required",503,"setup_required");
    const db=database(),now=Date.now();
    const row=await db.prepare("SELECT * FROM assistant_provider_credentials WHERE provider=?").bind(input.provider).first<CredentialRow>();
    if((row?.revision||0)!==input.revision)throw new HttpError("Configuration changed; reload",409,"revision_conflict");
    if(input.action==="save"){
      const sealed=await sealProviderKey(input.apiKey,input.provider,env.ASSISTANT_SETTINGS_KEY_V1!);
      const result=await db.batch([
        db.prepare(`INSERT INTO assistant_provider_credentials(provider,encrypted_key,iv,key_version,revision,enabled,tested_at,tested_version,updated_at,updated_by) VALUES (?,?,?,1,1,0,0,0,?,?) ON CONFLICT(provider) DO UPDATE SET encrypted_key=excluded.encrypted_key,iv=excluded.iv,key_version=key_version+1,revision=revision+1,enabled=0,tested_at=0,tested_version=0,updated_at=excluded.updated_at,updated_by=excluded.updated_by WHERE revision=?`).bind(input.provider,sealed.encrypted_key,sealed.iv,now,actor,input.revision),
        audit(actor,"assistant-key-save",input.provider,"Encrypted credential replaced; inference disabled",true),
      ]);
      if(!result[0].meta.changes)throw new HttpError("Configuration changed",409,"revision_conflict");
    }else{
      if(!row?.encrypted_key)throw new HttpError("Save a key first",404,"key_missing");
      if(input.action==="test"){
        await rateLimit("all-owners","assistant-provider-check",20,86400);
        const key=await openProviderKey(row,env.ASSISTANT_SETTINGS_KEY_V1!);
        await checkProviderKey(input.provider,key,request.signal);
        if(input.provider==="openrouter"){
          await rateLimit("all-users","assistant-evidence-global",20,86400);
          await probeFreeEvidence(key,request.signal);
        }
        const results=await db.batch([db.prepare("UPDATE assistant_provider_credentials SET tested_at=?,tested_version=key_version,revision=revision+1 WHERE provider=? AND revision=?").bind(now,input.provider,input.revision),audit(actor,"assistant-key-test",input.provider,"Provider check succeeded; no patient data sent",true)]);
        if(!results[0].meta.changes)throw new HttpError("Configuration changed",409,"revision_conflict");
      }else if(input.action==="enable"){
        if(env.ASSISTANT_EVIDENCE_AI_ENABLED!=="true")throw new HttpError("External evidence selection is disabled",409,"external_disabled");
        if(row.tested_version!==row.key_version || row.tested_at<=0 || row.tested_at>now || now-row.tested_at>=86400_000)throw new HttpError("Test this key first",409,"test_required");
        const results=await db.batch([db.prepare("UPDATE assistant_provider_credentials SET enabled=1,revision=revision+1,updated_at=?,updated_by=? WHERE provider=? AND revision=? AND tested_version=key_version AND tested_at>? AND tested_at<=?").bind(now,actor,input.provider,input.revision,now-86400_000,now),audit(actor,"assistant-provider-enable",input.provider,"Free-only public evidence selection enabled",true)]);
        if(!results[0].meta.changes)throw new HttpError("Configuration changed",409,"revision_conflict");
      }else{
        // Keep a non-secret version tombstone, so an old in-flight test cannot verify a replacement key after removal.
        const statement=input.action==="remove"?db.prepare("UPDATE assistant_provider_credentials SET encrypted_key='',iv='',key_version=key_version+1,revision=revision+1,enabled=0,tested_at=0,tested_version=0,updated_at=?,updated_by=? WHERE provider=? AND revision=?").bind(now,actor,input.provider,input.revision):db.prepare("UPDATE assistant_provider_credentials SET enabled=0,revision=revision+1,updated_at=?,updated_by=? WHERE provider=? AND revision=?").bind(now,actor,input.provider,input.revision);
        const result=await db.batch([statement,audit(actor,`assistant-provider-${input.action}`,input.provider,"Provider disabled; no credential recorded in audit",true)]);
        if(!result[0].meta.changes)throw new HttpError("Configuration changed",409,"revision_conflict");
      }
    }
    return json(await metadata());
  }catch(error){return fail(error);}
}
