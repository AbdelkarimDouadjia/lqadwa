import {env} from "cloudflare:workers";
import {database} from "@/db";
import {openProviderKey} from "./assistant-key-crypto";
import {freeEvidenceRunner,chatCompletionRunner} from "./assistant-provider-http";
import type {ChatProvider} from "./assistant-rag";
import {chatKeyAuthorized} from "./assistant-rag";
import type {AssistantProvider} from "./assistant-providers";
export {publicProviderStatus} from "./assistant-provider-status";
export type CredentialRow={provider:AssistantProvider;encrypted_key:string;iv:string;key_version:number;revision:number;enabled:number;tested_at:number;tested_version:number;updated_at:number};
export async function providerStorageReady() {
  return Boolean(await database().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assistant_provider_credentials'").first());
}
export async function managedChatProviders(evaluation:boolean):Promise<ChatProvider[]>{
  const providers:ChatProvider[]=[];
  // NVIDIA's trial must never serve the public app. The API separately verifies root-owner MFA for evaluation.
  if(evaluation&&env.ASSISTANT_NVIDIA_EVALUATION_ENABLED==="true"&&env.ASSISTANT_NVIDIA_API_KEY_V1)providers.push({id:"nvidia",run:chatCompletionRunner("nvidia",env.ASSISTANT_NVIDIA_API_KEY_V1)});
  if(encryptionReady()&&await providerStorageReady()){
    const active=await database().prepare("SELECT revision,key_version FROM assistant_provider_credentials WHERE provider='openrouter' AND enabled=1 AND tested_version=key_version AND tested_at>0").first<{revision:number;key_version:number}>();
    if(!active||!chatKeyAuthorized(active.key_version,env.ASSISTANT_OPENROUTER_CHAT_KEY_VERSION,env.ASSISTANT_OPENROUTER_CHAT_ACCEPTANCE_REFERENCE))return providers;
    if(active)providers.push({id:"openrouter",run:async(messages,signal)=>{
      const row=await database().prepare("SELECT * FROM assistant_provider_credentials WHERE provider='openrouter' AND enabled=1 AND revision=? AND tested_version=key_version").bind(active.revision).first<CredentialRow>();
      if(!row||!chatKeyAuthorized(row.key_version,env.ASSISTANT_OPENROUTER_CHAT_KEY_VERSION,env.ASSISTANT_OPENROUTER_CHAT_ACCEPTANCE_REFERENCE))throw Error("Provider configuration or chat consent changed");
      return chatCompletionRunner("openrouter",await openProviderKey(row,env.ASSISTANT_SETTINGS_KEY_V1!))(messages,signal);
    }});
  }
  return providers;
}
export function encryptionReady() {
  try{return Boolean(env.ASSISTANT_SETTINGS_KEY_V1 && /^[A-Za-z0-9+/]{43}=$/.test(env.ASSISTANT_SETTINGS_KEY_V1) && atob(env.ASSISTANT_SETTINGS_KEY_V1).length===32);}catch{return false;}
}
export async function managedEvidenceRunner() {
  if(!encryptionReady())return null;
  // During an additive deployment, missing storage disables the optional provider rather than core help.
  if(!await providerStorageReady())return null;
  const active=await database().prepare("SELECT revision FROM assistant_provider_credentials WHERE provider='openrouter' AND enabled=1 AND tested_version=key_version AND tested_at>0").first<{revision:number}>();
  if(!active)return null;
  return async (...args:Parameters<ReturnType<typeof freeEvidenceRunner>>)=>{
    // Read again just before use: replaced/disabled/deleted credentials cannot use a cached key.
    const row=await database().prepare("SELECT * FROM assistant_provider_credentials WHERE provider='openrouter' AND enabled=1 AND revision=? AND tested_version=key_version").bind(active.revision).first<CredentialRow>();
    if(!row)throw Error("Provider configuration changed");
    const key=await openProviderKey(row,env.ASSISTANT_SETTINGS_KEY_V1!);
    return freeEvidenceRunner(key)(...args);
  };
}
