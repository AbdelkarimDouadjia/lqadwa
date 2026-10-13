import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {adminLoginEmail} from '../lib/admin-login.ts';
import {parseAdminPermissions,adminPermissions} from '../lib/admin-permissions.ts';

// LOCAL ONLY. Run a local Worker with APP_ADMIN_IDS:local-release-owner,
// APP_OWNER_EMAIL:owner@example.invalid and SUPABASE_URL:http://127.0.0.1:5888.
// This deliberately synthetic Auth server is NEVER deployed or connected to real accounts.
const base='http://localhost:5173', password='LOCAL-only-unique-passphrase';
const users=[{id:'local-release-owner',email:'owner@example.invalid'},...['delegate','recipient','other'].map(name=>({id:'admin-test-'+randomUUID(),email:name+'@example.invalid'}))];
const [owner,delegate,recipient,other]=users, createdPharmacies=[];
const quote=v=>"'"+v.replaceAll("'","''")+"'", hash=v=>createHash('sha256').update(v).digest('hex');
const sql=command=>JSON.parse(execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command,'--json'],{encoding:'utf8',stdio:'pipe'}));
const record=u=>({...u,aud:'authenticated',role:'authenticated',is_anonymous:false,email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{full_name:'LOCAL FICTIONAL ACCOUNT',role:'owner',...(u.id===recipient.id?{first_name:'LOCAL',last_name:'NEW PERSON'}:{})},app_metadata:{provider:'email'}});
let signupPayload;
const jwt=u=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:u.id,exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000),aud:'authenticated',role:'authenticated'})).toString('base64url'),'local-fixture-not-a-signature'].join('.');
const auth=createServer(async(req,res)=>{
 res.setHeader('content-type','application/json');
 if(req.url.startsWith('/auth/v1/settings'))return res.end(JSON.stringify({external:{google:false,apple:false}}));
 if(req.url.startsWith('/auth/v1/logout'))return res.end('{}');
 if(req.url.startsWith('/auth/v1/signup')){let body='';for await(const part of req)body+=part;signupPayload=JSON.parse(body);return res.end(JSON.stringify({user:record(recipient),session:null}));}
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
 const root=await request('/api/app',null,rootCookie);assert(root.data.admin.access.isOwner);assert.equal(root.data.admin.access.permissions.length,adminPermissions.length);assert(root.data.admin.owners.some(u=>u.id===owner.id));
 const sessions={};for(const u of [delegate,recipient,other]){const login=await request('/api/auth',{action:'login',email:u.email,password});sessions[u.id]=cookie(login.response);await request('/api/app',null,sessions[u.id]);}
 assert.equal((await request('/api/profile',null,sessions[recipient.id])).data.details.lastName,'NEW PERSON','Verified signup names initialize the profile');
 await request('/api/auth',{action:'register',email:'fresh@example.invalid',password,firstName:'LOCAL'},'',400);
 await request('/api/auth',{action:'register',email:'fresh@example.invalid',password,firstName:'LOCAL',lastName:'NEW PERSON'});
 assert.equal(signupPayload.data.first_name,'LOCAL');assert.equal(signupPayload.data.last_name,'NEW PERSON');assert.equal(signupPayload.data.full_name,'LOCAL NEW PERSON');assert(!('role' in signupPayload.data));
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
 // Paging, quantity edits and lost-update protection in the pharmacy-owned stock workspace.
 await request('/api/stock',null,'',401);await request('/api/stock',null,sessions[recipient.id],403);
 const inventory=(await request('/api/stock?filter=low&threshold=5',null,sessions[other.id])).data;assert.equal(inventory.summary.low,1);assert.equal(inventory.rows[0].quantity,1);
 const stock=inventory.rows[0];
 await request('/api/stock',{action:'edit',id:stock.id,updated:stock.updated,name:stock.name,quantity:2},sessions[recipient.id],403);
 await request('/api/stock',{action:'edit',id:stock.id,updated:stock.updated,name:stock.name,quantity:2},sessions[other.id]);
 await request('/api/stock',{action:'edit',id:stock.id,updated:stock.updated,name:stock.name,quantity:9},sessions[other.id],409);
 await request('/api/stock',{action:'delete',id:stock.id,updated:stock.updated},sessions[other.id],409);
 await request('/api/stock',{action:'create',name:stock.name,quantity:1},sessions[other.id],409);
 await request('/api/stock',{action:'create',name:'LOCAL EMPTY ENTRY',quantity:0},sessions[other.id]);
 const empty=(await request('/api/stock?filter=out',null,sessions[other.id])).data.rows[0];assert.equal(empty.quantity,0);
 await request('/api/stock',{action:'delete',id:empty.id,updated:empty.updated},sessions[other.id]);
 const localInventory=Array.from({length:51},(_,i)=>({id:randomUUID(),name:'LOCAL PAGED '+String(i).padStart(3,'0')}));
 sql(localInventory.map(s=>`INSERT INTO stock_items(id,pharmacy,name,quantity,updated) VALUES(${quote(s.id)},${quote(pharmacy)},${quote(s.name)},0,${Date.now()});`).join(''));
 const firstStockPage=(await request('/api/stock?q=LOCAL%20PAGED&sort=name',null,sessions[other.id])).data,secondStockPage=(await request('/api/stock?q=LOCAL%20PAGED&sort=name&page=1',null,sessions[other.id])).data;assert.equal(firstStockPage.total,51);assert.equal(firstStockPage.rows.length,50);assert.equal(secondStockPage.rows.length,1);assert(!firstStockPage.rows.some(s=>s.id===secondStockPage.rows[0].id));
 sql(`DELETE FROM stock_items WHERE pharmacy=${quote(pharmacy)} AND name LIKE 'LOCAL PAGED %';`);
 await request('/api/stock?threshold=0',null,sessions[other.id],400);
 // Full management API remains authenticated, paginated and permission-scoped.
 await request('/api/admin?section=accounts',null,'',401);
 await request('/api/admin?section=accounts',null,sessions[recipient.id],403);
 await request('/api/admin?section=accounts',null,sessions[delegate.id],403);
 await request('/api/admin?section=inventory',null,sessions[delegate.id]);
 await request('/api/admin',{action:'service-save',requests_paused:true,pickups_paused:true,message:'LOCAL ONLY',updated:0,reason:'Local check'},sessions[delegate.id],403);
 const managed=await request('/api/admin?section=accounts&q='+encodeURIComponent(recipient.id),null,rootCookie);assert.equal(managed.data.total,1);assert.equal(managed.data.rows[0].id,recipient.id);
 await request('/api/admin',{action:'account-edit',id:recipient.id,name:'LOCAL EDITED USER',city:'oran',reason:'Local profile edit'},rootCookie);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.profile.name,'LOCAL EDITED USER');
 await request('/api/admin',{action:'account-edit',id:owner.id,name:'Cannot edit owner',city:'oran',reason:'Local check'},rootCookie,403);
 // Optional personal/medical fields remain private, independently of account-management grants.
 await request('/api/profile',null,'',401);
 const personal={firstName:'LOCAL',lastName:'PERSON',phone:'0550000000',municipality:'LOCAL COMMUNE',address:'LOCAL ADDRESS',age:42,jobTitle:''};
 const health={conditions:'LOCAL SELF REPORT',chronicConditions:'LOCAL LONG TERM NOTE',allergies:'LOCAL ALLERGY',shareWithOwner:false};
 await request('/api/profile',{action:'personal',details:{...personal,age:121},health},sessions[recipient.id],400);
 await request('/api/profile',{action:'personal',details:personal,health},sessions[recipient.id]);
 assert.equal((await request('/api/profile',null,sessions[recipient.id])).data.details.lastName,'PERSON');
 assert.equal((await request('/api/profile',null,sessions[other.id])).data.health.conditions,'');
 let privateRow=(await request('/api/admin?section=accounts&q='+recipient.id,null,rootCookie)).data.rows[0];assert.equal(privateRow.age,42);assert(!('conditions' in privateRow));
 await request('/api/profile',{action:'personal',details:personal,health:{...health,shareWithOwner:true}},sessions[recipient.id]);
 privateRow=(await request('/api/admin?section=accounts&q='+recipient.id,null,rootCookie)).data.rows[0];assert.equal(privateRow.chronicConditions,health.chronicConditions);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['pharmacies','accounts']},rootCookie);
 assert(!('chronicConditions' in (await request('/api/admin?section=accounts&q='+recipient.id,null,sessions[delegate.id])).data.rows[0]));
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['pharmacies']},rootCookie);
 await request('/api/profile',{action:'personal',details:personal,health},sessions[recipient.id]);
 assert(!('allergies' in (await request('/api/admin?section=accounts&q='+recipient.id,null,rootCookie)).data.rows[0]));
 await request('/api/app',{action:'profile',name:'LOCAL LEGACY NAME',city:'algiers'},sessions[recipient.id]);
 assert.equal((await request('/api/profile',null,sessions[recipient.id])).data.health.conditions,health.conditions,'Old app saves preserve optional fields');
 await request('/api/admin',{action:'account-edit',id:recipient.id,name:'LOCAL LEGACY NAME',city:'algiers',details:{...personal,age:null},health:{conditions:'UNAUTHORIZED MEDICAL EDIT'},reason:'Local contact correction'},rootCookie);
 assert.equal((await request('/api/profile',null,sessions[recipient.id])).data.health.conditions,health.conditions,'Admins cannot fabricate medical notes or consent');
 const exported=(await request('/api/account?export=1',null,sessions[recipient.id])).data;assert.equal(JSON.parse(exported.data.profile[0].health).conditions,health.conditions);
 await request('/api/profile',{action:'personal',details:{...personal,age:null},health:{}},sessions[recipient.id]);
 const erased=(await request('/api/profile',null,sessions[recipient.id])).data;assert.equal(erased.health.conditions,'');assert.equal(erased.details.age,null);
 const pharmacyDetails={contactName:'LOCAL PHARMACIST',contactEmail:'local@example.invalid',municipality:'LOCAL COMMUNE',accessNotes:'LOCAL ENTRY',wheelchairAccess:true};
 await request('/api/profile',{action:'pharmacy',details:pharmacyDetails},sessions[recipient.id],404);
 await request('/api/profile',{action:'pharmacy',details:pharmacyDetails},sessions[other.id]);
 assert.equal((await request('/api/admin?section=pharmacies&q='+pharmacy,null,rootCookie)).data.rows[0].contactName,'LOCAL PHARMACIST');
 await request('/api/admin',{action:'pharmacy-details',id:pharmacy,details:{...pharmacyDetails,contactName:'LOCAL EDITED CONTACT'},reason:'Local contact correction'},rootCookie);
 assert.equal((await request('/api/profile',null,sessions[other.id])).data.pharmacy.contactName,'LOCAL EDITED CONTACT');
 await request('/api/profile',{action:'personal',details:personal,health},sessions[other.id],403);
 await request('/api/admin',{action:'stock-save',pharmacy,name:'LOCAL ADMIN ITEM',quantity:7,reason:'Local stock create'},rootCookie);
 const item=(await request('/api/admin?section=inventory&q=LOCAL%20ADMIN%20ITEM',null,rootCookie)).data.rows[0];assert.equal(item.quantity,7);
 await request('/api/admin',{action:'stock-save',id:item.id,pharmacy,name:'LOCAL ADMIN ITEM EDITED',quantity:4,reason:'Local stock edit'},rootCookie);
 await request('/api/admin',{action:'stock-delete',id:item.id,reason:'Local stock delete'},rootCookie);
 assert.equal((await request('/api/admin?section=inventory&q=LOCAL%20ADMIN',null,rootCookie)).data.total,0);
 const appRecord=(await request('/api/admin?section=pharmacies&q='+pharmacy,null,rootCookie)).data.rows[0];
 await request('/api/admin',{action:'pharmacy-edit',...appRecord,duty:false,latitude:36.75,longitude:3.05,name:'LOCAL ADMIN PHARMACY',reason:'Local edit'},rootCookie);
 await request('/api/admin',{action:'pharmacy-edit',...appRecord,duty:false,reason:'Stale edit'},rootCookie,409);
 // A real availability workflow, entirely in the isolated local database.
 await request('/api/app',{action:'profile',name:'LOCAL EDITED USER',city:'algiers'},sessions[recipient.id]);
 const requestId=randomUUID();await request('/api/app',{action:'search',medicine:'Doliprane 1000 mg',city:'algiers',night:false,token:requestId},sessions[recipient.id]);
 await request('/api/app',{action:'reply',request:requestId,pharmacy,available:true},sessions[other.id]);
 const booking=(await request('/api/app',{action:'reserve',request:requestId,pharmacy,consent:true},sessions[recipient.id])).data.reservations.find(b=>b.request===requestId);assert(booking);
 await request('/api/app',{action:'share-location',reservation:booking.id,enabled:true,latitude:36.75,longitude:3.05},sessions[recipient.id]);
 const bookings=(await request('/api/admin?section=reservations&q='+booking.id,null,rootCookie)).data.rows;assert.equal(bookings.length,1);assert(!('code' in bookings[0]));assert(!('approachLat' in bookings[0]));
 let controls=(await request('/api/admin?section=service',null,rootCookie)).data.service;
 await request('/api/admin',{action:'service-save',requests_paused:true,pickups_paused:true,message:'LOCAL PAUSE',updated:controls.updated,reason:'Local pause'},rootCookie);
 await request('/api/app',{action:'search',medicine:'Doliprane',city:'algiers',night:false,token:randomUUID()},sessions[recipient.id],409);
 await request('/api/app',{action:'collect',reservation:booking.id,pharmacy,code:booking.code,checked:true},sessions[other.id],409);
 assert.throws(()=>sql(`UPDATE reservations SET status='collected' WHERE id=${quote(booking.id)}`),'Database blocks an in-flight/older client pickup');
 await request('/api/admin',{action:'service-save',requests_paused:false,pickups_paused:false,message:'',updated:controls.updated,reason:'Stale control update'},rootCookie,409);
 controls=(await request('/api/admin?section=service',null,rootCookie)).data.service;
 await request('/api/admin',{action:'service-save',requests_paused:false,pickups_paused:false,message:'',updated:controls.updated,reason:'Local resume'},rootCookie);
 await request('/api/admin',{action:'request-stop',id:requestId,reason:'Local safety stop'},rootCookie);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.reservations.find(b=>b.id===booking.id).status,'cancelled');
 assert.equal(sql(`SELECT count(*) AS n FROM reservation_locations WHERE reservation=${quote(booking.id)}`)[0].results[0].n,0);
 await request('/api/app',{action:'reserve',request:requestId,pharmacy,consent:true},sessions[recipient.id],409);
 await request('/api/app',{action:'reply',request:requestId,pharmacy,available:true},sessions[other.id],409);
 await request('/api/admin',{action:'reservation-cancel',id:booking.id,reason:'Already cancelled'},rootCookie,409);
 const secondRequest=randomUUID();await request('/api/app',{action:'search',medicine:'Doliprane 1000 mg',city:'algiers',night:false,token:secondRequest},sessions[recipient.id]);
 await request('/api/app',{action:'reply',request:secondRequest,pharmacy,available:true},sessions[other.id]);
 const secondBooking=(await request('/api/app',{action:'reserve',request:secondRequest,pharmacy,consent:true},sessions[recipient.id])).data.reservations.find(b=>b.request===secondRequest);
 await request('/api/admin',{action:'reservation-cancel',id:secondBooking.id,reason:'Local reservation cancellation'},rootCookie);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.reservations.find(b=>b.id===secondBooking.id).status,'cancelled');
 await request('/api/admin',{action:'pharmacy-create',owner:recipient.id,name:'LOCAL CREATED PHARMACY',address:'LOCAL ADDRESS NOT REAL',city:'algiers',latitude:36.75,longitude:3.05,phone:'0550000001',license:'LOCAL-NOT-VALID',hours:'08:00 - 20:00',duty:false,reason:'Local creation'},rootCookie);
 const createdPharmacy=(await request('/api/app',null,sessions[recipient.id])).data.ownPharmacy;createdPharmacies.push(createdPharmacy.id);assert.equal(createdPharmacy.status,'pending');
 await request('/api/admin',{action:'pharmacy-remove',id:createdPharmacy.id,reason:'Local archive'},rootCookie);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.ownPharmacy.status,'suspended');
 const overview=(await request('/api/admin?section=overview',null,rootCookie)).data;assert.equal(overview.daily.length,14);assert(overview.metrics.searches30>=1);assert(overview.metrics.cancelled>=1);
 await request('/api/admin?section=accounts&page=-1',null,rootCookie,400);
 await request('/api/app',{action:'admin-account',owner:other.id,suspended:true,reason:'Local permission test'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-invite-create',email:recipient.email,permissions:['audit']},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts']},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-revoke',owner:owner.id},rootCookie,403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['audit']},rootCookie);
 const restricted=await request('/api/app',null,sessions[delegate.id]);assert.equal(restricted.data.admin.applications.length,0);assert.equal(restricted.data.admin.inventory.length,0);assert(restricted.data.admin.activity.length>0);
 await request('/api/app',{action:'admin-review',pharmacy,status:'suspended'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-pharmacy-edit',pharmacy,name:'FICTIONAL LOCAL PHARMACY',address:'LOCAL FIXTURE NOT A REAL PHARMACY',phone:'0550000000',hours:'08:00 - 20:00'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts','analytics']},rootCookie);
 await request('/api/admin?section=requests',null,sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts','analytics','operations']},rootCookie);
 await request('/api/admin?section=requests',null,sessions[delegate.id]);
 await request('/api/admin?section=service',null,sessions[delegate.id],403);
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
 sql(`UPDATE service_controls SET requests_paused=0,pickups_paused=0,message='',updated=0 WHERE id=1;DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE owner IN (${ids}));DELETE FROM reservations WHERE owner IN (${ids});DELETE FROM responses WHERE request IN (SELECT id FROM requests WHERE owner IN (${ids}));DELETE FROM requests WHERE owner IN (${ids});${pharmacies?`DELETE FROM stock_items WHERE pharmacy IN (${pharmacies});DELETE FROM responses WHERE pharmacy IN (${pharmacies});DELETE FROM registered_pharmacies WHERE id IN (${pharmacies});`:''}DELETE FROM admin_members WHERE owner IN (${ids});DELETE FROM admin_invites WHERE email IN (${users.slice(1).map(u=>quote(u.email)).join(',')});DELETE FROM account_controls WHERE owner IN (${ids});DELETE FROM notifications WHERE owner IN (${ids});DELETE FROM mobile_sessions WHERE owner IN (${ids});DELETE FROM audit_log WHERE actor IN (${ids}) OR target IN (${ids});DELETE FROM profiles WHERE id IN (${ids});`);
 auth.closeAllConnections();await new Promise(resolve=>auth.close(resolve));
}
