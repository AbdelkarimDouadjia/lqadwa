import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {adminLoginEmail} from '../lib/admin-login.ts';
import {parseAdminPermissions} from '../lib/admin-permissions.ts';

// LOCAL ONLY. Run a local Worker with APP_ADMIN_IDS:local-release-owner,
// APP_OWNER_EMAIL:owner@example.invalid and SUPABASE_URL:http://127.0.0.1:5888.
// This deliberately synthetic Auth server is NEVER deployed or connected to real accounts.
const base='http://localhost:5173', password='LOCAL-only-unique-passphrase';
const users=[{id:'local-release-owner',email:'owner@example.invalid'},...['delegate','recipient','other'].map(name=>({id:'admin-test-'+randomUUID(),email:name+'@example.invalid'}))];
const [owner,delegate,recipient,other]=users, createdPharmacies=[];
const quote=v=>"'"+v.replaceAll("'","''")+"'", hash=v=>createHash('sha256').update(v).digest('hex');
const sql=command=>JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command,'--json'],{encoding:'utf8',stdio:'pipe'}));
const record=u=>({...u,aud:'authenticated',role:'authenticated',is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{full_name:'LOCAL FICTIONAL ACCOUNT',role:'owner'},app_metadata:{provider:'email'}});
const jwt=u=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:u.id,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url'),'local-fixture-not-a-signature'].join('.');
const auth=createServer(async(req,res)=>{
 res.setHeader('content-type','application/json');
 if(req.url.startsWith('/auth/v1/settings'))return res.end(JSON.stringify({external:{google:false,apple:false}}));
 if(req.url.startsWith('/auth/v1/logout'))return res.end('{}');
 if(req.url.startsWith('/auth/v1/token')){
  let body='';for await(const part of req)body+=part;const input=JSON.parse(body||'{}'),u=users.find(u=>u.email===input.email);
  if(!u||input.password!==password){res.statusCode=400;return res.end(JSON.stringify({code:'invalid_credentials',msg:'Local fixture rejected'}));}
  return res.end(JSON.stringify({access_token:jwt(u),refresh_token:'local-refresh-'+u.id,expires_in:3600,token_type:'bearer',user:record(u)}));
 }
 if(req.url.startsWith('/auth/v1/user')){
  let sub='';try{sub=JSON.parse(Buffer.from((req.headers.authorization||'').split('.')[1],'base64url').toString()).sub;}catch{}
  const u=users.find(u=>u.id===sub);if(u)return res.end(JSON.stringify(record(u)));
 }
 res.statusCode=401;res.end(JSON.stringify({msg:'Local fixture unauthenticated'}));
});
await new Promise(resolve=>auth.listen(5888,'127.0.0.1',resolve));
const cookie=response=>response.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');
async function request(path,body,credential='',expected=200){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{...(body?{origin:base,'content-type':'application/json'}:{}),...(credential?{cookie:credential}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(20000)});
 const raw=await response.text(),data=response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):raw;
 assert.equal(response.status,expected,`${body?.action||path}: ${typeof data==='object'?data.error:raw.slice(0,100)}`);return {response,data};
}
try{
 assert.equal(adminLoginEmail(' ADMIN ',owner.email),owner.email);assert.equal(adminLoginEmail('Admin',undefined),'');assert.equal(adminLoginEmail(delegate.email,owner.email),delegate.email);
 assert.deepEqual(parseAdminPermissions('invalid'),[]);assert.deepEqual(parseAdminPermissions('["owner","pharmacies","pharmacies","accounts"]'),['pharmacies','accounts']);
 await request('/api/auth',{action:'admin-login',identifier:'admin',password:'short'},'',400);
 await request('/api/auth',{action:'admin-login',identifier:'admin',password:password+'wrong'},'',401);
 const logged=await request('/api/auth',{action:'admin-login',identifier:'admin',password});assert.equal(logged.data.redirect,'/operations');const rootCookie=cookie(logged.response);assert(rootCookie);
 const root=await request('/api/app',null,rootCookie);assert(root.data.admin.access.isOwner);assert.equal(root.data.admin.access.permissions.length,4);assert(root.data.admin.owners.some(u=>u.id===owner.id));
 const sessions={};for(const u of [delegate,recipient,other]){const login=await request('/api/auth',{action:'login',email:u.email,password});sessions[u.id]=cookie(login.response);await request('/api/app',null,sessions[u.id]);}
 assert.equal((await request('/api/app',null,sessions[delegate.id])).data.admin,null,'Editable metadata must never grant owner access');
 await request('/api/auth',{action:'admin-login',identifier:delegate.email,password},'',401);
 const create=await request('/api/app',{action:'admin-invite-create',email:delegate.email,permissions:['pharmacies']},rootCookie),token=create.data.invite;assert(token);
 await request('/api/app',{action:'admin-invite-redeem',token},sessions[other.id],403);
 assert.equal(sql(`SELECT used_by FROM admin_invites WHERE hash=${quote(hash(token))};`)[0].results[0].used_by,null);
 const joined=await request('/api/app',{action:'admin-invite-redeem',token},sessions[delegate.id]);assert.deepEqual(joined.data.admin.access,{isOwner:false,permissions:['pharmacies']});
 assert.equal(joined.data.admin.accounts.length,0);assert.equal(joined.data.admin.activity.length,0);assert.equal(joined.data.admin.members.length,0);assert.equal(joined.data.admin.users,0);
 await request('/api/app',{action:'admin-invite-redeem',token},sessions[delegate.id],409);
 const d=await request('/api/auth',{action:'admin-login',identifier:delegate.email,password});assert.equal(d.data.redirect,'/operations');sessions[delegate.id]=cookie(d.response);
 const registration=await request('/api/app',{action:'register-pharmacy',name:'FICTIONAL LOCAL PHARMACY',address:'LOCAL FIXTURE NOT A REAL PHARMACY',city:'algiers',latitude:36.75,longitude:3.05,phone:'0550000000',license:'LOCAL-NOT-VALID'},sessions[other.id]);const pharmacy=registration.data.ownPharmacy.id;createdPharmacies.push(pharmacy);
 assert.equal(registration.data.role,'pharmacist');
 assert.equal(registration.data.staffRequests.length,0);
 await request('/api/app',{action:'register-pharmacy',name:'FICTIONAL LOCAL PHARMACY',address:'LOCAL FIXTURE NOT A REAL PHARMACY',city:'algiers',latitude:36.75,longitude:3.05,phone:'0550000000',license:'LOCAL-NOT-VALID'},sessions[other.id],409);
 await request('/api/app',{action:'stock-upsert',pharmacy,name:'LOCAL ITEM',quantity:1},sessions[other.id],403);
 await request('/api/app',{action:'admin-review',pharmacy,status:'approved'},sessions[delegate.id]);
 await request('/api/app',{action:'stock-upsert',pharmacy,name:'LOCAL ITEM',quantity:1},sessions[recipient.id],403);
 await request('/api/app',{action:'duty',pharmacy,enabled:true},sessions[recipient.id],403);
 await request('/api/app',{action:'admin-review',pharmacy,status:'suspended'},sessions[recipient.id],403);
 const stocked=await request('/api/app',{action:'stock-upsert',pharmacy,name:'LOCAL ITEM',quantity:1},sessions[other.id]);
 assert.equal(stocked.data.stock.length,1);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.stock.length,0);
 await request('/api/app',{action:'admin-account',owner:other.id,suspended:true,reason:'Local permission test'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-invite-create',email:recipient.email,permissions:['audit']},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts']},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-revoke',owner:owner.id},rootCookie,403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['audit']},rootCookie);
 const restricted=await request('/api/app',null,sessions[delegate.id]);assert.equal(restricted.data.admin.applications.length,0);assert.equal(restricted.data.admin.inventory.length,0);assert(restricted.data.admin.activity.length>0);
 await request('/api/app',{action:'admin-review',pharmacy,status:'suspended'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-pharmacy-edit',pharmacy,name:'FICTIONAL LOCAL PHARMACY',address:'LOCAL FIXTURE NOT A REAL PHARMACY',phone:'0550000000',hours:'08:00 - 20:00'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts','analytics']},rootCookie);
 await request('/api/app',{action:'admin-account',owner:owner.id,suspended:true,reason:'Local permission test'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-account',owner:other.id,suspended:true,reason:'Local permission test'},sessions[delegate.id]);await request('/api/app',null,sessions[other.id],403);
 await request('/api/app',{action:'admin-account',owner:other.id,suspended:false,reason:'Local permission test'},rootCookie);
 const suspended=await request('/api/app',null,sessions[other.id]);assert.equal(suspended.data.ownPharmacy.status,'suspended');assert.equal(suspended.data.staffBookings.length,0);
 await request('/api/app',{action:'stock-upsert',pharmacy,name:'LOCAL ITEM',quantity:2},sessions[other.id],403);
 await request('/api/app',{action:'admin-revoke',owner:delegate.id},rootCookie);assert.equal((await request('/api/app',null,sessions[delegate.id])).data.admin,null);
 await request('/api/app',{action:'admin-review',pharmacy,status:'approved'},sessions[delegate.id],403);
 const pending=await request('/api/app',{action:'admin-invite-create',email:recipient.email,permissions:['analytics']},rootCookie);await request('/api/app',{action:'admin-invites-revoke'},rootCookie);await request('/api/app',{action:'admin-invite-redeem',token:pending.data.invite},sessions[recipient.id],409);
 console.log('PASS: owner alias/password verification, verified-email invitation binding, single use, editable metadata denial, scoped reads/writes, immediate permission updates, protected owner and revoked access. Fixtures are LOCAL only.');
 if (process.argv.includes('--review')) {
  await request('/api/app',{action:'admin-review',pharmacy,status:'approved'},rootCookie);
  console.log('LOCAL UI review ready: owner@example.invalid (owner), recipient@example.invalid (client), other@example.invalid (pharmacy). Press Enter to remove these local fixtures.');
  await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',()=>{process.stdin.pause();resolve();});});
 }
}finally{
 const ids=users.slice(1).map(u=>quote(u.id)).join(','),pharmacies=createdPharmacies.map(quote).join(',');
 sql(`${pharmacies?`DELETE FROM stock_items WHERE pharmacy IN (${pharmacies});DELETE FROM responses WHERE pharmacy IN (${pharmacies});DELETE FROM registered_pharmacies WHERE id IN (${pharmacies});`:''}DELETE FROM admin_members WHERE owner IN (${ids});DELETE FROM admin_invites WHERE email IN (${users.slice(1).map(u=>quote(u.email)).join(',')});DELETE FROM account_controls WHERE owner IN (${ids});DELETE FROM notifications WHERE owner IN (${ids});DELETE FROM mobile_sessions WHERE owner IN (${ids});DELETE FROM audit_log WHERE actor IN (${ids}) OR target IN (${ids});DELETE FROM profiles WHERE id IN (${ids});`);
 auth.closeAllConnections();await new Promise(resolve=>auth.close(resolve));
}
