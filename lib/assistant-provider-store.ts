import {env} from "cloudflare:workers";
import {database} from "@/db";
import {openProviderKey} from "./assistant-key-crypto";
import {freeEvidenceRunner} from "./assistant-provider-http";
import type {AssistantProvider,ProviderStatus} from "./assistant-providers";
export type CredentialRow={provider:AssistantProvider;encrypted_key:string;iv:string;key_version:number;revision:number;enabled:number;tested_at:number;tested_version:number;updated_at:number};
export async function providerStorageReady() {
  return Boolean(await database().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assistant_provider_credentials'").first());
}
export function encryptionReady() {
  try{return Boolean(env.ASSISTANT_SETTINGS_KEY_V1 && /^[A-Za-z0-9+/]{43}=$/.test(env.ASSISTANT_SETTINGS_KEY_V1) && atob(env.ASSISTANT_SETTINGS_KEY_V1).length===32);}catch{return false;}
}
export function publicProviderStatus(row:Pick<CredentialRow,"provider"|"revision"|"enabled"|"tested_at"|"tested_version"|"key_version"|"updated_at"> & {has_key:number}):ProviderStatus {
  return {provider:row.provider,configured:row.has_key===1,revision:row.revision,enabled:row.enabled===1,testedAt:row.tested_at,updatedAt:row.updated_at,tested:row.has_key===1&&row.tested_at>0&&row.tested_version===row.key_version};
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
