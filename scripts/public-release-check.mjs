import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

// Public checks use reads and rejected requests only. Never seed or delete live accounts.
const base='https://lqadwa.lqadwa-dz.workers.dev';
const get=(path,options={})=>{
 console.log('Checking',path);
 return fetch(base+path,{...options,signal:AbortSignal.timeout(path.startsWith('/downloads/')?120000:30000)});
};
const health=await get('/api/health');assert.equal(health.status,200);const healthData=await health.json();assert.equal(healthData.release,'1.1.1');assert.equal(healthData.android,'2026-10-15');assert.equal(healthData.management,'2026-10-12');assert.equal(healthData.profiles,'2026-10-12');assert.equal(healthData.experience,'2026-10-13');assert.equal(healthData.design,'2026-10-13');
assert.equal(healthData.discovery,'2026-10-14');
assert.equal(healthData.presentation,'2026-10-15');
assert.equal(healthData.editor,'2026-10-25');
if(process.env.EXPECTED_COMMIT){assert.equal(healthData.source?.commit,process.env.EXPECTED_COMMIT);assert.equal(healthData.source?.dirty,false);assert.equal(healthData.schema,14);}
for(const lang of ['ar','fr','en','kab']) {
 const response=await get('/?lang='+lang),html=await response.text();
 assert.equal(response.status,200);assert.match(html,/<h1>/);assert.match(html,/directory-title/);
 assert.match(html,new RegExp('lang="'+lang+'"'));assert.match(html,/rel="canonical"/);
 assert.match(response.headers.get('cache-control')||'',/no-store/);
}
for(const path of ['/how-it-works','/for-pharmacies','/safety','/pricing','/help']) for(const lang of ['ar','fr','en','kab']) {
 const response=await get(path+'?lang='+lang),html=await response.text();
 assert.equal(response.status,200,path+'?lang='+lang);
 assert.match(html,/<article[^>]*public-information-page/);
 assert.match(html,/rel="canonical"/);
 assert.match(html,new RegExp('lang="'+lang+'"'));
}
const landing=await get('/api/landing');assert.equal(landing.status,200,'published landing content must be readable after database migration');assert.equal((await landing.json()).content.version,1);
assert.equal((await get('/robots.txt')).status,200);assert.equal((await get('/sitemap.xml')).status,200);
const directory=await(await get('/api/v1/pharmacies?city=algiers&limit=1')).json();
assert.equal(directory.availability,'not-confirmed');assert.equal(directory.distanceOrigin.type,'wilaya-center');
assert(Array.isArray(directory.items));assert(directory.items.length<=1);
for(const item of directory.items){assert(!('owner' in item));assert(!('license' in item));}
for(const path of ['/','/login','/operations/login','/privacy','/account-data','/how-it-works','/for-pharmacies','/safety','/pricing','/help']){
 const response=await get(path);assert.equal(response.status,200,path);
 assert.equal(response.headers.get('x-frame-options'),'DENY',path);
 assert.equal(response.headers.get('x-content-type-options'),'nosniff',path);
 assert.equal(response.headers.get('referrer-policy'),'no-referrer',path);
 assert.match(response.headers.get('strict-transport-security')||'',/max-age=15552000/,path);
 assert.match(response.headers.get('content-security-policy')||'',/frame-ancestors 'none'/,path);
 assert.doesNotMatch(await response.text(),/testing version|public pilot|نسخة تجريبية|\bbeta\b|\bprototype\b|Sign in with ChatGPT|تسجيل الدخول باستخدام ChatGPT/i,path);
}
assert.equal((await get('/api/app',{headers:{'oai-authenticated-user-id':'local-release-owner'}})).status,401);
assert.equal((await get('/api/account/deletion-proof')).status,401);
assert.equal((await get('/api/admin?section=accounts')).status,401);
assert.equal((await get('/api/profile')).status,401);
assert.equal((await get('/api/stock')).status,401);
const admin=await get('/operations',{redirect:'manual'});assert.equal(admin.status,307);assert.equal(admin.headers.get('location'),'/operations/login');
assert.equal(admin.headers.get('x-frame-options'),'DENY','private early redirect');
const editor=await get('/operations/editor',{redirect:'manual'});assert.equal(editor.status,307);assert.equal(editor.headers.get('location'),'/operations/login');
assert.equal(editor.headers.get('x-frame-options'),'DENY','editor stays private');
const catalogResponse=await get('/api/medicines?q=doliprane'),medicines=await catalogResponse.json();
if(healthData.mode==='INFORMATION_ONLY'){assert.equal(catalogResponse.status,503);assert.deepEqual(medicines.items,[]);}else{assert.equal(catalogResponse.status,200);assert(medicines.items.some(item=>item.brand==='DOLIPRANE'&&item.registration&&item.id&&item.form));}
for(const name of ['lqadwa-release.apk','lqadwa-release-armv7.apk']){
 const response=await get('/downloads/'+name);assert.equal(response.status,200,name);
 assert.match(response.headers.get('cache-control')||'',/must-revalidate/,name+' update cache');
 const downloaded=Buffer.from(await response.arrayBuffer());
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(downloaded),hash(readFileSync('public/downloads/'+name)),name+' must be the newly signed artifact');
 console.log(name,downloaded.length,'bytes; hosted SHA-256 matches signed local APK.');
}
console.log('PASS: public HTTPS, release, branding, private administration, authentication isolation, medicine catalog and both exact APK downloads.');
