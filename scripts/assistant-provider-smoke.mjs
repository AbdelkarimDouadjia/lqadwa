import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {providerCommand,providers} from '../lib/assistant-providers.ts';
import {sealProviderKey,openProviderKey} from '../lib/assistant-key-crypto.ts';
import {checkProviderKey,freeEvidenceRunner} from '../lib/assistant-provider-http.ts';
const master=randomBytes(32).toString('base64'),key='LOCAL-only-synthetic-credential';
for(const provider of Object.keys(providers)){
 const sealed=await sealProviderKey(key,provider,master),row={provider,...sealed};
 assert(!JSON.stringify(row).includes(key));assert.equal(await openProviderKey(row,master),key);
 assert.notEqual((await sealProviderKey(key,provider,master)).iv,sealed.iv);
 await assert.rejects(openProviderKey({...row,provider:provider==='openai'?'gemini':'openai'},master));
 await assert.rejects(openProviderKey(row,randomBytes(32).toString('base64')));
 const tampered=Buffer.from(row.encrypted_key,'base64');tampered[0]^=1;
 await assert.rejects(openProviderKey({...row,encrypted_key:tampered.toString('base64')},master));
 await checkProviderKey(provider,key,new AbortController().signal,async(url,init)=>{
  assert.equal(url,providers[provider].url);assert(!url.includes(key));assert.equal(init.redirect,'error');assert.equal(init.body,undefined);
  assert(Object.values(init.headers).some(value=>value.includes(key)));return Response.json({data:[]});
 });
 await assert.rejects(checkProviderKey(provider,key,new AbortController().signal,async()=>Response.json({error:key},{status:401})),error=>error.code==='provider_auth'&&!error.message.includes(key));
}
for(const provider of Object.keys(providers).filter(p=>p!=='openrouter'))assert.equal(providerCommand.safeParse({action:'enable',provider,revision:1,publicEvidenceConsent:true}).success,false,'Paid inference cannot be enabled');
for(const extra of [{url:'http://127.0.0.1'},{owner:'other'},{model:'paid-model'},{sql:'SELECT *'}])assert(!providerCommand.safeParse({action:'save',provider:'openrouter',revision:0,apiKey:key,...extra}).success);
const result=await freeEvidenceRunner(key,async(url,init)=>{
 assert.equal(url,'https://openrouter.ai/api/v1/chat/completions');assert.equal(init.redirect,'error');const body=JSON.parse(init.body);
 assert.equal(body.model,'openrouter/free');assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0});assert.equal(body.provider.data_collection,'deny');assert.equal(body.provider.zdr,true);assert.equal(body.provider.allow_fallbacks,false);assert.equal(body.plugins,undefined);assert.equal(body.user,undefined);
 return Response.json({choices:[{message:{content:'{"ids":["public-only"]}'}}],usage:{cost:0}});
})('ignored-paid-model',{messages:[{role:'user',content:'PUBLIC evidence only'}],max_tokens:128,temperature:0,stream:false},{signal:new AbortController().signal});
assert.equal(result.response,'{"ids":["public-only"]}');
await assert.rejects(freeEvidenceRunner(key,async()=>Response.json({choices:[],usage:{cost:1}}))('unused',{messages:[],max_tokens:1,temperature:0,stream:false},{signal:new AbortController().signal}));
const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE existing_records(id TEXT);INSERT INTO existing_records VALUES('preserved')");
db.exec(readFileSync(new URL('../drizzle/0015_assistant_provider_credentials.sql',import.meta.url),'utf8'));
assert.equal(db.prepare('SELECT id FROM existing_records').get().id,'preserved');
assert.equal(db.prepare('SELECT count(*) AS n FROM assistant_provider_credentials').get().n,0);
const insert=db.prepare('INSERT INTO assistant_provider_credentials(provider,encrypted_key,iv,key_version,revision,enabled,updated_at,updated_by) VALUES (?,?,?,1,1,?,0,?)');
for(const provider of Object.keys(providers))insert.run(provider,'sealed','iv',0,'LOCAL');
for(const provider of Object.keys(providers).filter(p=>p!=='openrouter'))assert.throws(()=>db.prepare('UPDATE assistant_provider_credentials SET enabled=1 WHERE provider=?').run(provider));
db.close();
console.log('PASS: seven provider contracts, random authenticated encryption, provider-bound keys, no key echo, fixed URLs/header-only authentication, free-only inference ceiling, denied paid activation and additive migration row preservation. All provider HTTP calls MOCKED.');
