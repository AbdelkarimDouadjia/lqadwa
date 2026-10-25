import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import ts from 'typescript';
import {resolveMedicine} from '../lib/medicine-catalog.ts';

// Execute the actual request-service SQL in SQLite. Only discovery is interrupted
// to deterministically reproduce an operator change between selection and write.
const compiled=ts.transpileModule(readFileSync('lib/request-service.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
class HttpError extends Error{constructor(message,status,code){super(message);this.status=status;this.code=code;}}
for(const scenario of ['normal','pause','pharmacy-suspended','patient-suspended','account-closed']){
 const sqlite=new DatabaseSync(':memory:');
 try{
  for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+file,'utf8'));
  const patient='LOCAL-RACE-PATIENT',hash='LOCAL-RACE-HASH',pharmacy='LOCAL-RACE-PHARMACY',now=Date.now();
  sqlite.prepare("INSERT INTO registered_pharmacies(id,owner,name,address,city,latitude,longitude,phone,license,status,duty,hours,created,updated) VALUES (?,?,?,'LOCAL ADDRESS','algiers',36753000,3058000,'0000000000','LOCAL-NOT-A-LICENSE','approved',0,'LOCAL',?,?)").run(pharmacy,'LOCAL-RACE-PHARMACIST','LOCAL ONLY',now,now);
  const db={prepare(sql){return{first:async()=>sqlite.prepare(sql).get()||null,bind(...values){return{first:async()=>sqlite.prepare(sql).get(...values)||null,sql,values};}}},async batch(statements){
   sqlite.exec('BEGIN');try{const result=statements.map(s=>({meta:{changes:Number(sqlite.prepare(s.sql).run(...s.values).changes)}}));sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}
  }};
  const discoverPharmacies=async()=>{
   if(scenario==='pause')sqlite.exec("INSERT INTO service_controls(id,requests_paused,pickups_paused,message,updated) VALUES (1,1,0,'LOCAL',0) ON CONFLICT(id) DO UPDATE SET requests_paused=1");
   if(scenario==='pharmacy-suspended')sqlite.prepare("UPDATE registered_pharmacies SET status='suspended' WHERE id=?").run(pharmacy);
   if(scenario==='patient-suspended')sqlite.prepare("INSERT INTO account_controls(owner,suspended,reason) VALUES (?,1,'LOCAL')").run(patient);
   if(scenario==='account-closed')sqlite.prepare('INSERT INTO closed_accounts(hash,created) VALUES (?,?)').run(hash,now);
   return[{id:pharmacy}];
  };
  const dependencies={'@/lib/access':{HttpError},'@/lib/pharmacy-discovery':{discoverPharmacies},'@/lib/medicine-catalog':{resolveMedicine},'@/lib/discovery-contract':{routingFilters:input=>({city:input.city,night:input.night})}};
  const service={};new Function('require','exports',compiled)(name=>{assert(name in dependencies,'Unexpected service dependency: '+name);return dependencies[name];},service);
  const input={token:randomUUID(),medicine:'LOCAL UNVERIFIED MEDICINE',city:'algiers',night:false};
  if(scenario==='normal')await service.createAvailabilityRequest(db,patient,hash,input,{name:'LOCAL PATIENT',details:'{}'});
  else await assert.rejects(()=>service.createAvailabilityRequest(db,patient,hash,input,{name:'LOCAL PATIENT',details:'{}'}),error=>error instanceof HttpError&&(scenario!=='pause'||(error.status===409&&error.code==='SERVICE_PAUSED')),scenario+' must reject after a changed operator control');
  const count=table=>Number(sqlite.prepare('SELECT count(*) AS n FROM '+table).get().n);
  if(scenario==='normal'){assert.equal(count('requests'),1);assert.equal(count('responses'),1);assert.equal(count('notifications'),2);}
  else{assert.equal(count('responses'),0,scenario+' must not create a recipient');assert.equal(count('notifications'),0,scenario+' must not create a notice');if(scenario!=='pharmacy-suspended')assert.equal(count('requests'),0,scenario+' must not create a request');}
 }finally{sqlite.close();}
}
console.log('PASS: real request SQL rejects service pause, pharmacy suspension, patient suspension and account closure between discovery and write. Synthetic local SQLite only.');
