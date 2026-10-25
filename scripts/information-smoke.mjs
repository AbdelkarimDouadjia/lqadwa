import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
const state=process.env.LQADWA_TEST_STATE;
assert(state?.includes('integration-'),'Use the isolated integration database only');
const child=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--port','5174','--ip','127.0.0.1','--inspector-port','0','--var','SUPABASE_URL:http://127.0.0.1:5888','--var','RELEASE_MODE:INFORMATION_ONLY','--var','HEALTH_PROFILE_COLLECTION:false','--var','PRESCRIPTION_AI_ENABLED:false','--var','GROUNDED_ASSISTANT_ENABLED:false'],{stdio:'inherit',env:{...process.env,AUTH_OFFLINE:'1'}});
const base='http://127.0.0.1:5174',owner='local-information-'+randomUUID(),token=randomUUID()+'-'+randomUUID(),hash=createHash('sha256').update(token).digest('hex'),request=randomUUID(),pharmacy=randomUUID(),booking=randomUUID(),now=Date.now();
let db;
async function sql(statement){
 assert(base==='http://127.0.0.1:5174');
 if(!db){const data=await(await fetch(base+'/cdn-cgi/local/explorer/api/d1/database')).json();db=data.result.find(d=>d.name==='DB').uuid;}
 const response=await fetch(`${base}/cdn-cgi/local/explorer/api/d1/database/${db}/raw`,{method:'POST',headers:{'content-type':'application/json',connection:'close'},body:JSON.stringify({batch:statement.split(';').filter(s=>s.trim()).map(sql=>({sql}))})});const result=await response.json();assert(response.ok&&result.success,JSON.stringify(result.errors));return result;
}
async function post(path,body,status,session=true){const response=await fetch(base+path,{method:'POST',headers:{origin:base,'content-type':'application/json',...(session?{'x-lqadwa-session':token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const text=await response.text();assert.equal(response.status,status,text);return JSON.parse(text);}
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health',{signal:AbortSignal.timeout(1500)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Information-mode Worker must become ready');
 assert.equal((await(await fetch(base+'/api/release')).json()).mode,'INFORMATION_ONLY');
 assert.equal((await fetch(base+'/api/medicines?q=ARTIZ')).status,503);
 await sql(`INSERT INTO profiles(id,name,city,health) VALUES('${owner}','LOCAL INFORMATION FIXTURE','algiers','{"conditions":"existing","shareWithOwner":false}');INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES('${hash}','${owner}',${now},${now+600000});INSERT INTO registered_pharmacies(id,owner,name,address,city,latitude,longitude,phone,license,status,created,updated) VALUES('${pharmacy}','${owner}-pharmacy','LOCAL FICTIONAL','LOCAL ONLY','algiers',36750000,3050000,'0000000000','NOT A LICENSE','approved',${now},${now});INSERT INTO requests(id,owner,medicine,city,created) VALUES('${request}','${owner}','LOCAL UNVERIFIED','algiers',${now});INSERT INTO reservations(id,owner,request,pharmacy,code,created,expires,status) VALUES('${booking}','${owner}','${request}','${pharmacy}','DZ-AABBCCDD',${now},${now+600000},'active');`);
 await post('/api/auth',{action:'register',email:'local@example.invalid',password:'LOCAL-only-test-passphrase',firstName:'LOCAL',lastName:'PERSON'},503,false);
 await post('/api/auth',{action:'oauth',provider:'google'},503,false);
 for(const body of [{action:'search',medicine:'LOCAL UNVERIFIED',city:'algiers',night:false,token:randomUUID()},{action:'reserve',request,pharmacy,consent:true},{action:'reply',request,pharmacy,available:true},{action:'share-location',reservation:booking,enabled:true,latitude:36.75,longitude:3.05},{action:'register-pharmacy',name:'LOCAL FIXTURE',address:'LOCAL ONLY ADDRESS',city:'algiers',latitude:36.75,longitude:3.05,phone:'0550000000',license:'NOT REAL'}])await post('/api/app',body,503);
 await post('/api/assistant',{tool:'help',topic:'pickup'},503);
 const details={firstName:'LOCAL',lastName:'PERSON'};
 await post('/api/profile',{action:'personal',details,health:{conditions:'new'}},403);
 await post('/api/profile',{action:'personal',details,health:{conditions:'existing'}},200);
 await post('/api/profile',{action:'personal',details,health:{}},200);
 await post('/api/app',{action:'share-location',reservation:booking,enabled:false},200);
 await post('/api/app',{action:'cancel',reservation:booking},200);
 await post('/api/app',{action:'cancel',reservation:booking},200);
 assert.equal((await fetch(base+'/api/account?export=1',{headers:{'x-lqadwa-session':token}})).status,200);
 await post('/api/account',{action:'delete',confirmation:'LQADWA'},200);
 console.log('PASS: information-only blocks signup/OAuth/new workflows/AI/new health notes; existing health preservation/erasure, withdrawal, cancellation, export and deletion work. Local fixtures only.');
}finally{
 try{if(db)await sql(`DELETE FROM notifications WHERE owner='${owner}' OR owner='${owner}-pharmacy';DELETE FROM reservations WHERE owner='${owner}';DELETE FROM responses WHERE request='${request}';DELETE FROM requests WHERE owner='${owner}';DELETE FROM registered_pharmacies WHERE id='${pharmacy}';DELETE FROM mobile_sessions WHERE owner='${owner}';DELETE FROM profiles WHERE id='${owner}';`);}finally{child.kill('SIGTERM');}
}
