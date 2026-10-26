import assert from 'node:assert/strict';
import {localAuthFixture} from './local-auth-fixture.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
// LOCAL ONLY: isolated fictional accounts; never point deletion tests at a live service.
const origin='http://localhost:5173';
const fetch=(url,options={})=>globalThis.fetch(origin+url,{signal:AbortSignal.timeout(30000),...options,headers:{connection:'close',...options.headers}});
const hash=v=>createHash('sha256').update(v).digest('hex');
const execute=promisify(execFile);
async function sql(command){
 // The synthetic Auth server shares this event loop; CLI work must not block it.
 const result=await execute(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to',process.env.LQADWA_TEST_STATE||'.wrangler/state','--command',command,'--json'],{encoding:'utf8'});return result.stdout;
}
const now=Date.now(),users=Array.from({length:4},()=>({id:'release-test-'+randomUUID(),token:randomUUID()+'-'+randomUUID()}));
await sql(users.map(u=>`INSERT INTO profiles(id,name,city) VALUES('${u.id}','FICTIONAL RELEASE TEST','algiers');INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash(u.token)}','${u.id}',${now},${now+900000});`).join(''));
const [patient,other,pharmacist,secondPharmacist]=users;
const session=u=>({'x-lqadwa-session':u.token});
// Start LOCAL Wrangler with --var APP_ADMIN_IDS:local-release-owner; never use this owner on the public host.
const rootToken=randomUUID()+'-'+randomUUID(), cookie='untrusted-cookie=1';
await sql(`INSERT INTO profiles(id,name,city) VALUES('local-release-owner','LOCAL OWNER','algiers') ON CONFLICT(id) DO NOTHING;INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash(rootToken)}','local-release-owner',${now},${now+900000});DELETE FROM rate_limits WHERE key='${hash(`account-write:local-release-owner:${Math.floor(now/3600000)}`)}';`);
const authFixture=localAuthFixture([{id:'local-release-owner',email:'owner@example.invalid'}],'LOCAL-release-only-passphrase');
await new Promise(resolve=>authFixture.server.listen(5888,'127.0.0.1',resolve));
try {
const login=await fetch('/api/auth',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'admin-login',identifier:'admin',password:'LOCAL-release-only-passphrase'})});
assert.equal(login.status,200);
const rootCookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');
const root={cookie:rootCookie,origin};
assert.equal((await fetch('/api/admin',{headers:{'x-lqadwa-session':rootToken}})).status,403,'Opaque owner tokens cannot access privileged data');
assert.equal((await(await fetch('/api/app',{headers:{'x-lqadwa-session':rootToken}})).json()).admin,null);
async function call(body,headers,status=200,path='/api/app'){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});const raw=await r.text();const data=r.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):{error:raw};assert.equal(r.status,status,`${body.action} expected ${status}: ${JSON.stringify(data.error)}`);return data;}
async function snapshot(u){const r=await fetch('/api/app',{headers:session(u)});assert.equal(r.status,200);return r.json();}
async function register(u,label){const s=await call({action:'register-pharmacy',name:'FICTIONAL TEST '+label,address:'LOCAL TEST ONLY - NOT A REAL PHARMACY',city:'algiers',latitude:36.7538,longitude:3.0588,phone:'0550000000',license:'SYNTHETIC-TEST-NOT-VALID'},session(u));await call({action:'admin-review',pharmacy:s.ownPharmacy.id,status:'approved'},root);return s.ownPharmacy.id;}
const a=await register(pharmacist,'A'),b=await register(secondPharmacist,'B');
console.log('Role-isolation fixtures registered.');
assert((await snapshot(patient)).pharmacies.every(p=>!p.pilot), 'Never return synthetic pharmacy listings');
await call({action:'search',medicine:'PARACETAMOL TEST',city:'algiers',night:false,demo:true,token:randomUUID()},session(patient),400);
await call({action:'reserve',request:randomUUID(),pharmacy:'algiers-1',consent:true},session(patient),404);
await call({action:'admin-review',pharmacy:a,status:'approved',role:'admin'},session(patient),403);
await call({action:'stock-upsert',pharmacy:a,name:'PARACETAMOL TEST',quantity:3},session(secondPharmacist),403);
await call({action:'stock-upsert',pharmacy:a,name:'PARACETAMOL TEST',quantity:3},session(pharmacist));
const request=randomUUID();await call({action:'search',medicine:'PARACETAMOL TEST',city:'algiers',night:false,demo:false,token:request},session(patient));
await call({action:'reply',request,pharmacy:a,available:true},session(secondPharmacist),403);
await call({action:'reply',request,pharmacy:a,available:true},session(pharmacist));
const reserved=await call({action:'reserve',request,pharmacy:a,consent:true},session(patient)),booking=reserved.reservations.find(r=>r.request===request);assert(booking);
assert.equal((await snapshot(other)).reservations.length,0);
const staff=(await snapshot(pharmacist)).staffBookings.find(r=>r.id===booking.id);assert(staff);assert(!('code' in staff)&&!('owner' in staff));
await call({action:'cancel',reservation:booking.id},session(other),409);
await call({action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},session(other),403);
await call({action:'collect',reservation:booking.id,pharmacy:a,code:booking.code,checked:true},session(secondPharmacist),403);
await call({action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},session(patient));
assert((await snapshot(pharmacist)).staffBookings.some(r=>r.id===booking.id&&r.approachLat));
assert(!(await snapshot(secondPharmacist)).staffBookings.some(r=>r.id===booking.id));
await sql(`UPDATE reservation_locations SET updated=${Date.now()-61000} WHERE reservation='${booking.id}';`);
assert.equal((await snapshot(pharmacist)).staffBookings.find(r=>r.id===booking.id).approachLat,null,'Old GPS points must not remain visible');
await call({action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},session(patient));
await call({action:'share-location',reservation:booking.id,enabled:false},session(patient));
assert.equal((await snapshot(pharmacist)).staffBookings.find(r=>r.id===booking.id).approachLat,null,'Withdrawing consent immediately hides location');
assert.equal(JSON.parse(await sql(`SELECT count(*) AS n FROM reservation_locations WHERE reservation='${booking.id}';`))[0].results[0].n,0);
await call({action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},session(patient));
await call({action:'read-notifications'},{...session(patient),origin:'https://evil.invalid'},403);
assert.equal((await fetch('/api/app',{headers:{cookie,'x-lqadwa-session':'invalid'}})).status,401);
// Some HTTP proxies omit empty headers. An empty native credential still cannot mutate via a browser cookie without Origin.
assert([401,403].includes((await fetch('/api/app',{method:'POST',headers:{cookie,'x-lqadwa-session':'','content-type':'application/json'},body:JSON.stringify({action:'read-notifications'})})).status));
for(const [body,type,status] of [['{','application/json',400],['{}','text/plain',415],['x'.repeat(5000),'application/json',413]]){assert.equal((await fetch('/api/app',{method:'POST',headers:{...session(patient),'content-type':type},body})).status,status);}
const exported=await(await fetch('/api/account?export=1',{headers:session(patient)})).json();assert.equal(exported.data.requests.length,1);assert(!JSON.stringify(exported).includes(booking.code));assert(!JSON.stringify(exported).includes(pharmacist.id));assert.equal(exported.next,null);
console.log('Cross-account and export checks passed.');
await call({action:'delete',confirmation:'wrong'},session(patient),400,'/api/account');
await call({action:'delete',confirmation:'LQADWA'},{...root,origin:'https://evil.invalid'},403,'/api/account');
await call({action:'delete',confirmation:'LQADWA'},root,409,'/api/account');
// Suspending a pharmacy atomically ends active bookings and removes location sharing.
await call({action:'admin-review',pharmacy:a,status:'suspended'},root);
assert.equal((await snapshot(patient)).reservations.find(r=>r.id===booking.id).status,'cancelled');
await call({action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},session(patient),403);
await call({action:'admin-review',pharmacy:a,status:'approved'},root);
const secondRequest=randomUUID();await call({action:'search',medicine:'PARACETAMOL TEST 2',city:'algiers',night:false,token:secondRequest},session(patient));await call({action:'reply',request:secondRequest,pharmacy:a,available:true},session(pharmacist));await call({action:'reserve',request:secondRequest,pharmacy:a,consent:true},session(patient));
// Pharmacy closure cancels another patient's booking, removes stock/audit details, and revokes phone access.
await call({action:'delete',confirmation:'LQADWA'},session(pharmacist),200,'/api/account');
assert.equal((await fetch('/api/app',{headers:session(pharmacist)})).status,401);
assert.equal((await snapshot(patient)).reservations.find(r=>r.request===secondRequest).status,'cancelled');
const remaining=JSON.parse(await sql(`SELECT count(*) AS n FROM audit_log WHERE target='${a}';SELECT count(*) AS n FROM registered_pharmacies WHERE id='${a}';SELECT count(*) AS n FROM stock_items WHERE pharmacy='${a}';`));for(const r of remaining)assert.equal(r.results[0].n,0);
await call({action:'delete',confirmation:'LQADWA'},session(patient),200,'/api/account');
assert.equal((await fetch('/api/app',{headers:session(patient)})).status,401);
await sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash(patient.token)}','${patient.id}',${now},${now+900000});`);
assert.equal((await fetch('/api/app',{headers:session(patient)})).status,410,'stale session cannot resurrect deleted account');
const closed=await(await fetch('/api/account?export=1',{headers:session(patient)})).json();assert.equal(closed.data.requests.length,0);assert.equal(closed.data.reservations.length,0);assert.equal(closed.data.profile.length,0);
await call({action:'reopen',confirmation:'LQADWA'},session(patient),403,'/api/account');
assert.equal((await snapshot(other)).profile.name,'FICTIONAL RELEASE TEST');
assert.equal((await snapshot(secondPharmacist)).ownPharmacy.id,b);
const bucket=Math.floor(Date.now()/60000);
// The local SQL CLI may cross a minute boundary before the HTTP assertion.
await sql([bucket,bucket+1].map(b=>`INSERT INTO rate_limits(key,count,expires) VALUES('${hash(`pickup-attempt:${secondPharmacist.id}:${b}`)}',10,${(b+1)*60000}) ON CONFLICT(key) DO UPDATE SET count=10;`).join(''));
await call({action:'collect',reservation:booking.id,pharmacy:b,code:booking.code,checked:true},session(secondPharmacist),429);
await call({action:'delete',confirmation:'LQADWA'},session(other),200,'/api/account');await call({action:'delete',confirmation:'LQADWA'},session(secondPharmacist),200,'/api/account');
assert.equal((await fetch('/api/health')).status,200);
console.log('PASS: cross-account isolation, hidden pickup codes, input/CSRF limits, suspension cancellation, consent/location privacy, scoped export, irreversible deletion, stale-session tombstone and pickup rate limit. All fixtures local and fictional.');
} finally { await new Promise(resolve=>authFixture.server.close(resolve)); }
