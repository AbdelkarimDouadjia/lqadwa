import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
export async function checkProviderSettings({request,sql,rootCookie,otherCookie,ownerId}){
 const quote=v=>"'"+v.replaceAll("'","''")+"'",hash=v=>createHash('sha256').update(v).digest('hex');
 const reset=async()=>{const bucket=Math.floor(Date.now()/60000);await sql(`DELETE FROM rate_limits WHERE key IN (${[-1,0,1].map(offset=>quote(hash(`assistant-settings:${ownerId}:${bucket+offset}`))).join(',')})`);};
 const call=async(body,credential=rootCookie,status=200)=>{await reset();return request('/api/assistant/settings',body,credential,status);};
 await call(null,'',401);await call(null,otherCookie,403);
 const initial=(await call(null)).data;assert.equal(initial.storageReady,true);assert.equal(initial.encryptionReady,true);assert.equal(initial.externalEnabled,true);
 await sql('DELETE FROM assistant_provider_credentials');
 const key='LOCAL-only-synthetic-credential';
 const token=randomUUID()+'-'+randomUUID();
 try{
  await sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES (${quote(hash(token))},${quote(ownerId)},${Date.now()},${Date.now()+60000})`);
  const native=await fetch('http://localhost:5173/api/assistant/settings',{headers:{cookie:rootCookie,'x-lqadwa-session':token}});assert.equal(native.status,403,'Opaque native sessions cannot bypass owner MFA');
  for(const provider of ['openrouter','openai','anthropic','gemini','groq','mistral','deepseek']){
   await call({action:'save',provider,revision:0,apiKey:key},otherCookie,403);
   const saved=(await call({action:'save',provider,revision:0,apiKey:key})).data;
   const item=saved.items.find(row=>row.provider===provider);assert(item.configured);assert(!item.enabled);assert(!item.tested);
   assert(!JSON.stringify(saved).includes(key));assert(!JSON.stringify(saved).includes('encrypted_key'));assert(!JSON.stringify(saved).includes('iv'));
   const stored=(await sql(`SELECT encrypted_key,iv FROM assistant_provider_credentials WHERE provider=${quote(provider)}`))[0].results[0];assert(!stored.encrypted_key.includes(key));assert(stored.iv.length>0);
   await call({action:'save',provider,revision:0,apiKey:key},rootCookie,409);
   if(provider!=='openrouter')await call({action:'enable',provider,revision:item.revision,publicEvidenceConsent:true},rootCookie,400);
  }
  await call({action:'test',provider:'openrouter',revision:1,publicEvidenceConsent:false},rootCookie,400);
  await call({action:'enable',provider:'openrouter',revision:1,publicEvidenceConsent:true},rootCookie,409);
  // Synthetic verification metadata in isolated D1 only; no provider or model is called by this HTTP suite.
  await sql(`UPDATE assistant_provider_credentials SET tested_at=${Date.now()},tested_version=key_version WHERE provider='openrouter'`);
  const enabled=(await call({action:'enable',provider:'openrouter',revision:1,publicEvidenceConsent:true})).data.items.find(row=>row.provider==='openrouter');assert(enabled.enabled);
  const removed=(await call({action:'remove',provider:'openrouter',revision:enabled.revision})).data.items.find(row=>row.provider==='openrouter');assert(!removed.configured);assert(!removed.enabled);
  const readded=(await call({action:'save',provider:'openrouter',revision:removed.revision,apiKey:key+'-replacement'})).data.items.find(row=>row.provider==='openrouter');assert(!readded.enabled);assert(!readded.tested);assert(readded.revision>enabled.revision);
  await call({action:'enable',provider:'openrouter',revision:enabled.revision,publicEvidenceConsent:true},rootCookie,409);
  const delayed=await sql(`UPDATE assistant_provider_credentials SET tested_at=${Date.now()},tested_version=key_version WHERE provider='openrouter' AND revision=1`);assert.equal(delayed[0].meta.changes,0,'Old tests cannot verify a key removed and re-added');
  for(const extra of [{url:'http://127.0.0.1'},{owner:ownerId},{model:'paid-model'}])await call({action:'save',provider:'openai',revision:1,apiKey:key,...extra},rootCookie,400);
  const leaked=(await sql(`SELECT count(*) AS n FROM audit_log WHERE detail LIKE ${quote('%'+key+'%')}`))[0].results[0].n;assert.equal(leaked,0);
 }finally{await sql(`DELETE FROM assistant_provider_credentials;DELETE FROM mobile_sessions WHERE hash=${quote(hash(token))}`);await reset();}
 console.log('PASS: private provider CRUD, seven encrypted credentials, no key echo/audit leak, owner-only verified MFA, native denial, optimistic concurrency, replacement disables inference, no paid activation and stale-test ABA protection. No upstream calls.');
}
