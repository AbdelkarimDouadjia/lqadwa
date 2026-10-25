import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Node's type stripping runs this pure helper without importing the framework.
import {safeReturnPath} from '../lib/auth-redirect.ts';
for(const unsafe of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/login','/auth/callback','/logout?return_to=//evil.invalid','/\n/evil.invalid']) assert.equal(safeReturnPath(unsafe),'/');
assert.equal(safeReturnPath('/connect?id=abc'),'/connect?id=abc');
assert.equal(safeReturnPath('/?space=pharmacy#pharmacy'),'/?space=pharmacy#pharmacy');
assert.doesNotMatch(readFileSync('lib/auth.ts','utf8'),/headers\(|getSession\(/);
assert.doesNotMatch(readFileSync('vite.config.ts','utf8'),/sites\(|mockAuth/);
const base='http://localhost:5173';
const get=(path,options={})=>fetch(base+path,{...options,signal:AbortSignal.timeout(20000)});
assert.equal((await get('/api/app',{headers:{'oai-authenticated-user-id':'local-release-owner','oai-authenticated-user-email':'owner@example.invalid'}})).status,401);
assert.equal((await get('/api/app',{headers:{cookie:'__sites_local_auth=1'}})).status,401);
assert.equal((await get('/api/account/deletion-proof')).status,401);
assert.equal((await get('/api/account/deletion-proof',{headers:{Authorization:'Bearer '+'x'.repeat(80)}})).status,401);
assert.equal((await get('/api/auth',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify({action:'logout'})})).status,403);
assert.equal((await get('/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'register',email:'invalid',password:'short',name:'x',role:'admin'})})).status,400);
assert.equal((await get('/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'oauth',provider:'chatgpt'})})).status,400);
const providers=await(await get('/api/auth/providers')).json();
assert.deepEqual(Object.keys(providers).sort(),['apple','google','release']);
assert.deepEqual(Object.keys(providers.release).sort(),['assistant','availabilityRequests','healthCollection','mode','prescriptionAI','registration']);
assert.equal(providers.release.mode,'CORE');assert.equal(providers.release.registration,true);
for(const provider of ['google','apple'])if(!providers[provider]){
 const response=await get('/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'oauth',provider,returnTo:'//evil.invalid'})});
 assert.equal(response.status,409);assert.equal((await response.json()).error,'PROVIDER_UNAVAILABLE');
}
// Offline CI verifies password checks with admin-smoke's isolated Auth fixture instead.
if(!process.env.AUTH_OFFLINE)assert.equal((await get('/api/auth',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({action:'login',email:'unregistered@example.invalid',password:'never-a-real-account-password',native:true,role:'admin'})})).status,401);
const callback=await get('/auth/callback?next=https://evil.invalid',{redirect:'manual'});
assert.equal(callback.status,303);assert.equal(new URL(callback.headers.get('location')).pathname,'/login');
for(const path of ['/login','/logout','/operations/login']){const r=await get(path);assert.equal(r.status,200);const html=await r.text();assert.doesNotMatch(html,/نسخة تجريبية|testing version|public pilot|prototype|\bbeta\b/i);}
const privateEntry=await get('/operations',{redirect:'manual'});assert.equal(privateEntry.status,307);assert.equal(privateEntry.headers.get('location'),'/operations/login');
console.log('Auth checks passed: no header/cookie impersonation, same-origin enforcement, input validation, safe redirects and public branding.');
