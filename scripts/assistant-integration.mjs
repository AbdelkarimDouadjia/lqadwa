import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
export async function checkAssistant({sql,request,cookie,otherCookie,userId,requestId,pharmacy,booking}){
 const hash=v=>createHash('sha256').update(v).digest('hex'),quote=v=>"'"+v.replaceAll("'","''")+"'",base='http://localhost:5173';
 const input={tool:'help',language:'en',query:'How do I collect my reservation?'};
 const reset=async()=>{const minute=Math.floor(Date.now()/60000),day=Math.floor(Date.now()/86400000);const keys=[...[-1,0,1].map(offset=>hash(`assistant:${userId}:${minute+offset}`)),hash(`assistant-daily:${userId}:${day}`)];await sql(`DELETE FROM rate_limits WHERE key IN (${keys.map(quote).join(',')})`);};
 const call=async(body,credential=cookie,expected=200)=>{await reset();return request('/api/assistant',body,credential,expected);};
 const capabilities=(await request('/api/assistant')).data;assert.equal(capabilities.enabled,true);assert.equal(capabilities.externalPatientProcessing,false);
 await call(input,'',401);
 const help=await call(input);assert.equal(help.data.citations[0].id,'en:how-it-works:2');assert.match(help.response.headers.get('cache-control'),/no-store/);
 const clinical=(await call({...input,query:'Which dose for my child?'})).data;assert.equal(clinical.mode,'safety');assert.equal(clinical.citations.length,0);
 for(const extra of [{owner:userId},{url:'https://evil.invalid'},{enabled:true},{sql:'SELECT * FROM profiles'}])await call({...input,...extra},cookie,400);
 // Exercise body rejection without an immediate inspector write on Wrangler's recycled connection.
 await call({...input,query:'a'.repeat(4100)},cookie,413);
 const afterLimit=await fetch(base+'/api/assistant',{headers:{connection:'close'}});assert.equal(afterLimit.status,200);await afterLimit.arrayBuffer();
 const catalog=(await call({tool:'catalog',language:'en',query:'DOLIPRANE 1000'})).data;assert(catalog.records.length);assert.equal(catalog.mode,'tool');assert(!JSON.stringify(catalog).includes('confirmed-at-time'));
 const medicine=(await call({tool:'medicine',language:'en',medicineId:catalog.records[0].id})).data;assert.equal(medicine.records[0].id,catalog.records[0].id);
 await call({tool:'medicine',language:'en',medicineId:'miph-2026-08:99999'},cookie,404);
 const directory=(await call({tool:'pharmacies',language:'en',area:'algiers',night:false})).data;assert.match(directory.text,/not a guarantee/);assert.equal(directory.limit,8);
 await call({tool:'pharmacies',language:'en',area:'99'},cookie,400);
 const status={tool:'request-status',language:'en',requestId};
 const mine=(await call(status)).data;assert(mine.records.some(record=>record.id===booking.id));assert(!JSON.stringify(mine).includes(booking.code));assert(!JSON.stringify(mine).includes('approachLat'));
 await call(status,otherCookie,404);
 assert(!(await call({tool:'requests',language:'en'},otherCookie)).data.records.some(record=>record.id===requestId));
 const old=(await sql(`SELECT updated FROM responses WHERE request=${quote(requestId)} AND pharmacy=${quote(pharmacy)}`))[0].results[0].updated;
 const native=randomUUID()+'-'+randomUUID(),nativeHash=hash(native);
 try{
  await sql(`UPDATE responses SET updated=${Date.now()-31*60000} WHERE request=${quote(requestId)} AND pharmacy=${quote(pharmacy)}`);
  assert((await call(status)).data.records.some(record=>record.details.includes('stale-positive')));
  await sql(`UPDATE reservations SET expires=${Date.now()-1000} WHERE id=${quote(booking.id)}`);
  assert((await call(status)).data.records.some(record=>record.id===booking.id&&record.details.includes('expired')));
  assert.equal((await sql(`SELECT status FROM reservations WHERE id=${quote(booking.id)}`))[0].results[0].status,'active','Assistant must not mutate a booking');
  await sql(`INSERT INTO request_controls(request,stopped) VALUES (${quote(requestId)},1)`);
  assert((await call(status)).data.records[0].details.includes('stopped'));
  await sql(`DELETE FROM request_controls WHERE request=${quote(requestId)}`);
  await sql(`UPDATE registered_pharmacies SET status='suspended' WHERE id=${quote(pharmacy)}`);
  assert((await call(status)).data.records.some(record=>record.details.includes('partner-unavailable')));
  await sql(`UPDATE registered_pharmacies SET status='approved' WHERE id=${quote(pharmacy)}`);
  await sql(`INSERT INTO mobile_sessions(hash,owner,created,expires) VALUES (${quote(nativeHash)},${quote(userId)},${Date.now()},${Date.now()+60000})`);
  await reset();const nativeResponse=await fetch(base+'/api/assistant',{method:'POST',headers:{'content-type':'application/json','x-lqadwa-session':native},body:JSON.stringify(status)});assert.equal(nativeResponse.status,200);assert(!(await nativeResponse.text()).includes(booking.code));
  const invalid=await fetch(base+'/api/assistant',{method:'POST',headers:{'content-type':'application/json','x-lqadwa-session':randomUUID()+'-'+randomUUID(),cookie},body:JSON.stringify(status)});assert.equal(invalid.status,401,'Invalid opaque token cannot fall back to a browser session');
  const csrf=await fetch(base+'/api/assistant',{method:'POST',headers:{'content-type':'application/json',origin:'https://evil.invalid',cookie},body:JSON.stringify(input)});assert.equal(csrf.status,403);
  await sql(`INSERT INTO account_controls(owner,suspended,reason) VALUES (${quote(userId)},1,'LOCAL ASSISTANT CHECK') ON CONFLICT(owner) DO UPDATE SET suspended=1`);
  await call(input,cookie,403);
  await sql(`DELETE FROM account_controls WHERE owner=${quote(userId)}`);
  await sql(`DELETE FROM mobile_sessions WHERE hash=${quote(nativeHash)}`);
  const revoked=await fetch(base+'/api/assistant',{method:'POST',headers:{'content-type':'application/json','x-lqadwa-session':native},body:JSON.stringify(status)});assert.equal(revoked.status,401);
 }finally{
  await sql(`DELETE FROM mobile_sessions WHERE hash=${quote(nativeHash)};DELETE FROM account_controls WHERE owner=${quote(userId)};DELETE FROM request_controls WHERE request=${quote(requestId)};UPDATE registered_pharmacies SET status='approved' WHERE id=${quote(pharmacy)};UPDATE responses SET updated=${old} WHERE request=${quote(requestId)} AND pharmacy=${quote(pharmacy)};UPDATE reservations SET expires=${booking.expires} WHERE id=${quote(booking.id)}`);
 }
 for(const [scope,bucket,limit] of [['assistant',Math.floor(Date.now()/60000),10],['assistant-daily',Math.floor(Date.now()/86400000),100]]){
  await reset();const key=hash(`${scope}:${userId}:${bucket}`);await sql(`INSERT INTO rate_limits(key,count,expires) VALUES (${quote(key)},${limit},${Date.now()+86400000}) ON CONFLICT(key) DO UPDATE SET count=${limit}`);
  await request('/api/assistant',input,cookie,429);
 }
 await reset();
 console.log('PASS: assistant real local HTTP/D1, origin checks, server flags, account/native isolation, revoked privilege inputs, catalog identity, stale replies, expiry without writes, suspension, read limits and private no-store responses.');
}
