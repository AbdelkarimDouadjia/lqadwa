import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const fetch = (url, options = {}) => globalThis.fetch(url, { ...options, headers: { connection: 'close', ...options.headers } });
const origin='http://localhost:5173';
const login=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.get('set-cookie')?.split(';')[0];assert(cookie);
async function post(path,body,headers={},expected=200){const r=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});const raw=await r.text();const result=r.headers.get("content-type")?.includes("application/json")?JSON.parse(raw):{error:raw};assert.equal(r.status,expected,`${body.action}: ${JSON.stringify(result.error)}`);return result;}
const browser={cookie,origin};const verifier=randomBytes(32).toString('hex');const challenge=createHash('sha256').update(verifier).digest('hex');
const device=await post('/api/device',{action:'create',challenge});
await post('/api/device',{action:'exchange',id:device.id,verifier},{},202);
await post('/api/device',{action:'approve',id:device.id,code:device.code},{cookie,origin:'https://untrusted.example'},403);
await post('/api/device',{action:'approve',id:device.id,code:'00000000'},browser,400);
await post('/api/device',{action:'approve',id:device.id,code:device.code},browser);
await post('/api/device',{action:'exchange',id:device.id,verifier:'0'.repeat(64)},{},401);
const native=await post('/api/device',{action:'exchange',id:device.id,verifier});
await post('/api/device',{action:'exchange',id:device.id,verifier},{},409);
const nativeHeaders={'x-lqadwa-session':native.token};
assert.equal((await fetch(origin+'/api/app',{headers:nativeHeaders})).status,200);
await post('/api/app',{action:'read-notifications'},{'x-lqadwa-session':'invalid'},401);
await post('/api/device',{action:'logout'},nativeHeaders);
assert.equal((await fetch(origin+'/api/app',{headers:nativeHeaders})).status,401);
// Isolated local-only fixture proves checks for a non-admin, not just the owner.
const id='security-test-'+randomUUID(), token=randomUUID()+'-'+randomUUID(), hash=createHash('sha256').update(token).digest('hex');
function sql(command){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});}
sql(`INSERT INTO profiles(id,name,city) VALUES ('${id}','SECURITY TEST - FICTIONAL','algiers'); INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash}','${id}',${Date.now()},${Date.now()+600000});`);
const client={'x-lqadwa-session':token};
const clientData=await(await fetch(origin+'/api/app',{headers:client})).json();assert.equal(clientData.admin,null);assert.equal(clientData.role,'client');
await post('/api/app',{action:'admin-invite-create'},client,403);
await post('/api/app',{action:'admin-revoke',owner:'local_seedy'},client,403);
const invite=await post('/api/app',{action:'admin-invite-create'},browser);
await post('/api/app',{action:'admin-invite-redeem',token:invite.invite},client);
await post('/api/app',{action:'admin-revoke',owner:id},browser);
// Recreate only the test device session, not admin membership, to attempt invite replay.
sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash}','${id}',${Date.now()},${Date.now()+600000});`);
await post('/api/app',{action:'admin-invite-redeem',token:invite.invite},client,409);
assert.equal((await(await fetch(origin+'/api/app',{headers:client})).json()).admin,null,'used invite must never restore revoked admin access');
await post('/api/app',{action:'admin-account',owner:'local_seedy',suspended:true,reason:'test protection'},browser,403);
const stopped=await post('/api/app',{action:'admin-account',owner:id,suspended:true,reason:'Synthetic security test complete'},browser);
assert(stopped.admin.activity.some(a=>a.action==='account-suspend'&&a.target===id));
assert.equal((await fetch(origin+'/api/app',{headers:client})).status,401);
console.log('PASS: native pairing, code/CSRF/proof checks, one-time exchange, session revocation, public role isolation, root protection, admin revocation and invitation replay regression.');
