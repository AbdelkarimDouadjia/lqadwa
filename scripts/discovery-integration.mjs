import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import path from 'node:path';
import {discoveryQuery} from '../lib/pharmacy-discovery-query.mjs';

// This is deliberately localhost-only; every fixture is identified as fictional.
const base='http://localhost:5173',suite='local-discovery-'+randomUUID();
const owner=suite+'-client',token=randomUUID()+'-'+randomUUID();
const hash=createHash('sha256').update(token).digest('hex');
mkdirSync('.cloudflare',{recursive:true});
const folder=mkdtempSync(path.join('.cloudflare','discovery-'));
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
let sequence=0;
const execute=promisify(execFile);
async function sql(statement){
 const file=path.join(folder,`${sequence++}.sql`);writeFileSync(file,statement);
 try{
  // Keep the event loop available to drain HTTP bodies and closed pooled sockets during CLI work.
  const run=await execute(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to',process.env.LQADWA_TEST_STATE||'.wrangler/state','--file',file,'--json'],{encoding:'utf8',env:{...process.env,AUTH_OFFLINE:'1'},maxBuffer:4_000_000});
  return JSON.parse(run.stdout);
 }finally{unlinkSync(file);}
}
const now=Date.now();
try{
 assert.equal((await fetch(base+'/api/health')).status,200);
 const values=Array.from({length:390},(_,i)=>{
  const selected=i>=350,n=selected?i-350:i;
  return `(${quote(suite+'-'+i)},${quote(suite+'-owner-'+i)},${quote((selected?'ZZ':'000AA')+' FICTIONAL LOCAL PHARMACY '+n)},'FICTIONAL LOCAL ADDRESS',${quote(selected?'algiers':'oran')},${selected?36753000+n*100:35690000},${selected?3058000+n*100:-633000},'0000000000','FICTIONAL-NOT-A-LICENSE','approved',${n%2},'08:00 — 20:00',${now},${now})`;
 });
 await sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES (${quote(hash)},${quote(owner)},${now},${now+600000});`);
 for(let offset=0;offset<values.length;offset+=40)await sql(`INSERT INTO registered_pharmacies(id,owner,name,address,city,latitude,longitude,phone,license,status,duty,hours,created,updated) VALUES ${values.slice(offset,offset+40).join(',')};`);
 const headers={'content-type':'application/json','x-lqadwa-session':token};
 const search=await fetch(base+'/api/app',{method:'POST',headers,body:JSON.stringify({action:'search',medicine:'DOLIPRANE 500 MG',city:'algiers',night:false,demo:false,token:randomUUID()})});
 assert.equal(search.status,200,'Approved selected-city pharmacies must remain reachable after the national alphabetical cap of 300');
 const data=await search.json(),request=data.requests[0];
 assert.equal(data.profile.id,owner,'First native search initializes its own profile');
 assert.equal(data.notifications.length,1,'First native search receives its request notice');
 assert(!data.notifications.some(n=>n.title.includes('DOLIPRANE')),'Notification previews omit medicine names');
 const replies=data.responses.filter(r=>r.request===request.id);
 assert.equal(replies.length,25);assert(replies.every(r=>r.status==='pending'));
 assert(replies.every(r=>data.pharmacies.some(p=>p.id===r.pharmacy)),'Legacy Android needs directory details for each returned recipient');
 for(const p of data.pharmacies){assert(!('owner' in p));assert(!('license' in p));}
 const recipientNotifications=(await sql(`SELECT count(*) AS n FROM notifications WHERE substr(owner,1,${suite.length+7})=${quote(suite+'-owner-')};`))[0].results[0].n;
 assert.equal(recipientNotifications,25,'Fan-out stays bounded at 25 pharmacy notifications');
 const q=discoveryQuery({city:'algiers',lat:36.7538,lng:3.0588,night:false,limit:25,excluded:[]});let parameter=0;
 const meta=(await sql(q.sql.replace(/\?/g,()=>{const value=q.parameters[parameter++];return typeof value==='number'?String(value):quote(value); })))[0].meta;
 console.log('Local CLI selection metadata (not production billing): '+JSON.stringify(meta||{}));

 const retryToken=randomUUID();
 const retryBody={action:'search',medicine:'DOLIPRANE 500 MG',city:'algiers',night:false,demo:false,token:retryToken};
 const retries=await Promise.all(Array.from({length:6},()=>fetch(base+'/api/app',{method:'POST',headers,body:JSON.stringify(retryBody)})));
 assert(retries.every(response=>response.status===200),'Concurrent retries with one request UUID must not fail');
 await Promise.all(retries.map(response=>response.arrayBuffer()));
 const storedRetry=(await sql(`SELECT count(*) AS n FROM responses WHERE request=${quote(retryToken)};`))[0].results[0].n;
 assert.equal(storedRetry,25,'Concurrent retries do not expand the recipient set');
 assert.equal((await sql(`SELECT count(*) AS n FROM notifications WHERE owner=${quote(owner)};`))[0].results[0].n,2,'One patient notification per request');
 assert.equal((await sql(`SELECT count(*) AS n FROM notifications WHERE substr(owner,1,${suite.length+7})=${quote(suite+'-owner-')};`))[0].results[0].n,50,'One notification per recipient per request');
 const changedRetry=await fetch(base+'/api/app',{method:'POST',headers,body:JSON.stringify({...retryBody,medicine:'DIFFERENT LOCAL MEDICINE'})});
 assert.equal(changedRetry.status,409,'A request UUID cannot be reused for a different medicine');

 const pharmacy=replies[0].pharmacy,pharmacyOwner=pharmacy.replace(suite+'-',suite+'-owner-');
 const pharmacyToken=randomUUID()+'-'+randomUUID(),pharmacyHash=createHash('sha256').update(pharmacyToken).digest('hex');
 await changedRetry.arrayBuffer();
 await sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES(${quote(pharmacyHash)},${quote(pharmacyOwner)},${now},${now+600000});`);
 const act=(body,session=token)=>fetch(base+'/api/app',{method:'POST',headers:{'content-type':'application/json','x-lqadwa-session':session},body:JSON.stringify(body)});
 const answers=await Promise.all([true,false].map(available=>act({action:'reply',request:request.id,pharmacy,available},pharmacyToken)));
 assert.equal(answers.filter(r=>r.status===200).length,1,'One concurrent pharmacy reply wins');
 assert(answers.every(r=>[200,403,409].includes(r.status)),'No contradictory reply or race-time server error');
 // Independent reserve fixture: manually confirmed availability, never catalog-as-stock.
 await Promise.all(answers.map(response=>response.arrayBuffer()));
 await sql(`UPDATE responses SET status='yes',updated=${Date.now()} WHERE request=${quote(request.id)} AND pharmacy=${quote(pharmacy)};`);
 const bookings=await Promise.all([0,1].map(()=>act({action:'reserve',request:request.id,pharmacy,consent:true})));
 assert.deepEqual(bookings.map(r=>r.status).sort(),[200,409],'One concurrent reservation per request');
 const booked=await bookings.find(r=>r.status===200).json(),booking=booked.reservations.find(b=>b.request===request.id);
 const pickups=await Promise.all([0,1].map(()=>act({action:'collect',reservation:booking.id,pharmacy,code:booking.code,checked:true},pharmacyToken)));
 assert.deepEqual(pickups.map(r=>r.status).sort(),[200,409],'Pickup QR cannot be replayed concurrently');
 await Promise.all(pickups.map(response=>response.arrayBuffer()));
 await sql(`DELETE FROM mobile_sessions WHERE hash=${quote(pharmacyHash)};`);

 let cursor='',seen=new Set(),pages=0;
 do{
  const response=await fetch(base+'/api/v1/pharmacies?city=oran&limit=50'+(cursor?'&cursor='+encodeURIComponent(cursor):''));
  assert.equal(response.status,200);const page=await response.json();pages++;
  assert.equal(page.distanceOrigin.type,'wilaya-center');assert.equal(page.availability,'not-confirmed');
  for(const p of page.items){assert.equal(p.city,'oran');assert(!('owner' in p));assert(!('license' in p));if(p.id.startsWith(suite)){assert(!seen.has(p.id));seen.add(p.id);}}
  cursor=page.nextCursor||'';assert(pages<100);
 }while(cursor);
 assert.equal(seen.size,350,'Cursor traversal must include more than 300 approved pharmacies exactly once');
 for(const query of ['city=invalid','city=oran&limit=10000','city=oran&cursor=invalid','city=oran&latitude=36.75'])assert.equal((await fetch(base+'/api/v1/pharmacies?'+query)).status,400);
 const first=await(await fetch(base+'/api/v1/pharmacies?city=oran&limit=1')).json();
 assert(first.nextCursor);
 assert.equal((await fetch(base+'/api/v1/pharmacies?city=algiers&cursor='+first.nextCursor)).status,400,'A cursor is tied to its filters');
 assert.equal((await fetch(base+'/api/v1/pharmacies?city=oran&city=algiers')).status,400);
 const duty=await(await fetch(base+'/api/v1/pharmacies?city=algiers&night=true&limit=50')).json();assert(duty.items.every(p=>p.duty));
 const removed=suite+'-350';await sql(`UPDATE registered_pharmacies SET status='suspended' WHERE id=${quote(removed)};`);
 const fresh=await(await fetch(base+'/api/v1/pharmacies?city=algiers&limit=50')).json();assert(!fresh.items.some(p=>p.id===removed));
 console.log(`PASS: native-compatible request reaches 25 city recipients beyond national cap; ${seen.size} fictional directory rows traversed in ${pages} pages; public field allowlist, validation, duty, suspension, concurrent reply/reservation and pickup replay checks.`);
}finally{
 await sql(`DELETE FROM reservation_locations WHERE reservation IN(SELECT id FROM reservations WHERE owner=${quote(owner)});DELETE FROM reservations WHERE owner=${quote(owner)};DELETE FROM responses WHERE request IN(SELECT id FROM requests WHERE owner=${quote(owner)});DELETE FROM requests WHERE owner=${quote(owner)};DELETE FROM notifications WHERE owner=${quote(owner)} OR substr(owner,1,${suite.length+7})=${quote(suite+'-owner-')};DELETE FROM registered_pharmacies WHERE substr(id,1,${suite.length+1})=${quote(suite+'-')};DELETE FROM mobile_sessions WHERE owner=${quote(owner)} OR substr(owner,1,${suite.length+7})=${quote(suite+'-owner-')};DELETE FROM profiles WHERE id=${quote(owner)} OR substr(id,1,${suite.length+7})=${quote(suite+'-owner-')};`);
 rmdirSync(folder);
}
