import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {performance} from 'node:perf_hooks';
import {discoveryQuery} from '../lib/pharmacy-discovery-query.mjs';

// Local in-memory SQLite only. These timings are NOT Cloudflare D1/network latency.
const measurements=[];
for(const size of [10,100,300,1000,10000]){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE registered_pharmacies(id TEXT PRIMARY KEY,name TEXT,address TEXT,city TEXT,latitude INTEGER,longitude INTEGER,phone TEXT,duty INTEGER,hours TEXT,status TEXT);
 CREATE INDEX registered_pharmacies_city_idx ON registered_pharmacies(city,status);
 CREATE INDEX idx_pharmacies_status_name ON registered_pharmacies(status,name);`);
 const insert=db.prepare('INSERT INTO registered_pharmacies VALUES (?,?,?,?,?,?,?,?,?,?)');
 db.exec('BEGIN');
 for(let i=0;i<size;i++){
  const selected=i%5===0;
  insert.run('fixture-'+String(i).padStart(5,'0'),(selected?'ZZ':'AA')+' FICTIONAL '+i,'FICTIONAL',selected?'algiers':'oran',36753000+i%100*100,3058000+i%100*100,'0000000000',i%2,'LOCAL','approved');
 }
 db.exec('COMMIT');
 const options={city:'algiers',lat:36.753,lng:3.058,night:false,limit:25,excluded:[]};
 const query=discoveryQuery(options),statement=db.prepare(query.sql);
 const old=db.prepare("SELECT * FROM registered_pharmacies WHERE status='approved' ORDER BY name LIMIT 300");
 const oldTargets=old.all().filter(p=>p.city==='algiers').slice(0,25);
 const newTargets=statement.all(...query.parameters);
 assert.equal(newTargets.length,Math.min(25,Math.ceil(size/5)));
 assert(newTargets.every(row=>!('owner' in row)&&!('license' in row)));
 const plan=db.prepare('EXPLAIN QUERY PLAN '+query.sql).all(...query.parameters).map(row=>row.detail);
 assert(plan.some(detail=>detail.includes('registered_pharmacies_city_idx')),'City/status index must be used');
 for(let i=0;i<10;i++)statement.all(...query.parameters);
 const times=[],oldTimes=[];for(let i=0;i<100;i++){
  let start=performance.now();statement.all(...query.parameters);times.push(performance.now()-start);
  start=performance.now();old.all().filter(p=>p.city==='algiers').slice(0,25);oldTimes.push(performance.now()-start);
 }
 times.sort((a,b)=>a-b);oldTimes.sort((a,b)=>a-b);
 let after,seen=new Set(),pages=0;
 do{
  const q=discoveryQuery({...options,limit:50,after});const page=db.prepare(q.sql).all(...q.parameters);pages++;
  for(const row of page){assert(!seen.has(row.id),'Stable score/ID pagination must not duplicate ties');seen.add(row.id);}
  const last=page.at(-1);after=page.length===50?{score:last.score,id:last.id}:undefined;
 }while(after);
 assert.equal(seen.size,Math.ceil(size/5));
 const dutyQuery=discoveryQuery({...options,night:true,limit:50});assert(db.prepare(dutyQuery.sql).all(...dutyQuery.parameters).every(row=>row.duty===1));
 const radiusQuery=discoveryQuery({...options,radiusKm:0});assert(db.prepare(radiusQuery.sql).all(...radiusQuery.parameters).every(row=>row.score===0));
 const excluded=discoveryQuery({...options,excluded:[newTargets[0].id]});assert(!db.prepare(excluded.sql).all(...excluded.parameters).some(row=>row.id===newTargets[0].id));
 measurements.push({pharmacies:size,selectedCity:seen.size,oldRecipients:oldTargets.length,newRecipients:newTargets.length,pages,oldLocalSQLiteP95Ms:+oldTimes[94].toFixed(3),localSQLiteP50Ms:+times[49].toFixed(3),localSQLiteP95Ms:+times[94].toFixed(3),plan});
 db.close();
}
console.log(JSON.stringify({environment:'Node '+process.version+'; in-memory SQLite; synthetic fixtures; not D1 latency',measurements},null,2));
console.log('PASS: indexed selection, allowlist, stable cursor ties, duty, radius and exclusion at five local scales.');
