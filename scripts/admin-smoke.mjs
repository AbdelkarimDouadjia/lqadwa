import assert from 'node:assert/strict';
import {localAuthFixture} from './local-auth-fixture.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {adminLoginEmail} from '../lib/admin-login.ts';
import {parseAdminPermissions,adminPermissions} from '../lib/admin-permissions.ts';
import {emptyLandingContent,landingCopyKeys} from '../lib/landing-content.ts';
import {defaultPageContent} from '../lib/content-pages.ts';
import {startUiProxy} from './local-ui-proxy.mjs';

// LOCAL ONLY. Run a local Worker with APP_ADMIN_IDS:local-release-owner,
// APP_OWNER_EMAIL:owner@example.invalid and SUPABASE_URL:http://127.0.0.1:5888.
// This deliberately synthetic Auth server is NEVER deployed or connected to real accounts.
const base='http://localhost:5173', password='LOCAL-only-unique-passphrase';
const users=[{id:'local-release-owner',email:'owner@example.invalid'},...['delegate','recipient','other'].map(name=>({id:'admin-test-'+randomUUID(),email:name+'@example.invalid'}))];
const [owner,delegate,recipient,other]=users, createdPharmacies=[];
const quote=v=>"'"+v.replaceAll("'","''")+"'", hash=v=>createHash('sha256').update(v).digest('hex');
const explorer=base+'/cdn-cgi/local/explorer/api';
let localDatabaseId;
async function sql(command){
 assert(process.env.LQADWA_TEST_STATE?.includes('integration-'),'Use only an isolated local integration database');
 if(!localDatabaseId){
  const response=await fetch(explorer+'/d1/database',{signal:AbortSignal.timeout(5000)}),data=await response.json();
  assert(response.ok&&data.success,'Local Wrangler D1 inspector must be available');
  localDatabaseId=data.result.find(database=>database.name==='DB')?.uuid;
  assert(localDatabaseId,'Local Wrangler D1 database binding was not found');
 }
 const statements=Array.isArray(command)?command:command.split(';').map(statement=>statement.trim()).filter(Boolean);
 const response=await fetch(`${explorer}/d1/database/${localDatabaseId}/raw`,{method:'POST',headers:{connection:'close','content-type':'application/json'},body:JSON.stringify({batch:statements.map(sql=>({sql}))}),signal:AbortSignal.timeout(10000)});
 const data=await response.json();
 if(!response.ok||!data.success||data.result?.some(result=>!result.success))throw Error(`Local D1 query failed: ${data.errors?.[0]?.message||data.result?.find(result=>!result.success)?.error||response.status}`);
 return data.result.map(result=>({success:result.success,meta:result.meta,results:(result.results?.rows||[]).map(row=>Object.fromEntries(result.results.columns.map((column,index)=>[column,row[index]])))}));
}
let signupPayload;
const fixture=localAuthFixture(users,password,input=>{signupPayload=input;});
const auth=fixture.server;
await new Promise(resolve=>auth.listen(5888,'127.0.0.1',resolve));
const cookie=response=>response.headers.getSetCookie().map(v=>v.split(';')[0]).filter(v=>!v.endsWith('=')).join('; ');
async function request(path,body,credential='',expected=200){
 const response=await fetch(base+path,{method:body?'POST':'GET',headers:{connection:'close',...(body?{origin:base,'content-type':'application/json'}:{}),...(credential?{cookie:credential}:{})},body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(20000)});
 const raw=await response.text(),data=response.headers.get('content-type')?.includes('application/json')?JSON.parse(raw):raw;
 assert((Array.isArray(expected)?expected:[expected]).includes(response.status),`${body?.action||path}: expected ${expected}, received ${response.status}: ${typeof data==='object'?data.error:raw.slice(0,2000)}`);return {response,data};
}
async function resetLandingQuota(){
 const bucket=Math.floor(Date.now()/60000),keys=[bucket-1,bucket,bucket+1].map(value=>quote(hash(`landing-content:${owner.id}:${value}`)));
 await sql(`DELETE FROM rate_limits WHERE key IN (${keys.join(',')});`);
}
try{
 assert.equal(adminLoginEmail(' ADMIN ',owner.email),owner.email);assert.equal(adminLoginEmail('Admin',undefined),'');assert.equal(adminLoginEmail(delegate.email,owner.email),delegate.email);
 assert.deepEqual(parseAdminPermissions('invalid'),[]);assert.deepEqual(parseAdminPermissions('["owner","pharmacies","pharmacies","accounts"]'),['pharmacies','accounts']);
 await request('/api/auth',{action:'admin-login',identifier:'admin',password:'short'},'',400);
 await request('/api/auth',{action:'admin-login',identifier:'admin',password:password+'wrong'},'',401);
 owner.aal='aal1';
 const firstFactor=await request('/api/auth',{action:'admin-login',identifier:'admin',password});
 const aal1Cookie=cookie(firstFactor.response);
 assert.equal((await request('/api/app',null,aal1Cookie)).data.admin,null,'First-factor sessions cannot read admin data');
 assert.equal((await request('/api/app',null,aal1Cookie)).data.adminStepUpRequired,true,'First-factor admin access must explicitly request step-up');
 await request('/api/admin?section=accounts',null,aal1Cookie,403);
 assert.equal((await request('/api/landing',{action:'load'},aal1Cookie,403)).data.code,'MFA_REQUIRED');
 await request('/api/app',{action:'admin-invites-revoke'},aal1Cookie,403);
 assert.equal((await request('/operations',null,aal1Cookie,307)).response.headers.get('location'),'/operations/security');
 const factor=(await request('/api/auth/mfa',null,aal1Cookie)).data.factors[0].id;
 await request('/api/auth/mfa',{action:'verify',factorId:factor,code:'000000'},aal1Cookie,401);
 const verified=await request('/api/auth/mfa',{action:'verify',factorId:factor,code:'123456'},aal1Cookie);
 assert.equal(verified.data.verified,true);
 assert((await request('/api/app',null,cookie(verified.response))).data.admin?.access.isOwner);
 owner.aal='aal2';
 const logged=await request('/api/auth',{action:'admin-login',identifier:'admin',password});assert.equal(logged.data.redirect,'/operations');const rootCookie=cookie(logged.response);assert(rootCookie);
 const root=await request('/api/app',null,rootCookie);assert(root.data.admin.access.isOwner);assert.equal(root.data.admin.access.permissions.length,adminPermissions.length);assert(root.data.admin.owners.some(u=>u.id===owner.id));
 const authCookieName=rootCookie.split('; ').find(value=>/^sb-.+-auth-token=/.test(value)).split('=')[0];
 for(const path of ['/operations/editor','/operations/security']){
  const expired=fixture.session(owner,'aal2',-60),encoded='base64-'+Buffer.from(JSON.stringify(expired)).toString('base64url');
  const refreshed=await request(path,null,`${authCookieName}=${encoded}`);
  const refreshedCookie=cookie(refreshed.response);
  assert(refreshedCookie.includes(authCookieName+'='),`${path} must persist rotated authentication cookies`);
  assert.equal((await request('/api/landing',{action:'load'},refreshedCookie)).response.status,200,'The rotated cookie must work on the subsequent editor API call');
 }
 owner.mfaTime=Math.floor(Date.now()/1000)-601;
 const staleCookie=cookie((await request('/api/auth',{action:'admin-login',identifier:'admin',password})).response);
 const staleSnapshot=(await request('/api/app',null,staleCookie)).data;
 assert.equal(staleSnapshot.admin,null);assert.equal(staleSnapshot.adminStepUpRequired,true,'Expired step-up is explicit rather than silently demoting the administrator');
 await request('/api/landing',{action:'load'},staleCookie,403);
 delete owner.mfaTime;
 const sessions={};for(const u of [delegate,recipient,other]){const login=await request('/api/auth',{action:'login',email:u.email,password});sessions[u.id]=cookie(login.response);await request('/api/app',null,sessions[u.id]);}
 assert.equal((await request('/api/profile',null,sessions[recipient.id])).data.details.lastName,'NEW PERSON','Verified signup names initialize the profile');
 await request('/api/auth',{action:'register',email:'fresh@example.invalid',password,firstName:'LOCAL'},'',400);
 await request('/api/auth',{action:'register',email:'fresh@example.invalid',password,firstName:'LOCAL',lastName:'NEW PERSON'});
 assert.equal(signupPayload.data.first_name,'LOCAL');assert.equal(signupPayload.data.last_name,'NEW PERSON');assert.equal(signupPayload.data.full_name,'LOCAL NEW PERSON');assert(!('role' in signupPayload.data));
 assert.equal((await request('/api/app',null,sessions[delegate.id])).data.admin,null,'Editable metadata must never grant owner access');
 await request('/api/auth',{action:'admin-login',identifier:delegate.email,password},'',401);
 const create=await request('/api/app',{action:'admin-invite-create',email:delegate.email,permissions:['pharmacies']},rootCookie),token=create.data.invite;assert(token);
 await request('/api/app',{action:'admin-invite-redeem',token},sessions[other.id],403);
 assert.equal((await sql(`SELECT used_by FROM admin_invites WHERE hash=${quote(hash(token))};`))[0].results[0].used_by,null);
 const joined=await request('/api/app',{action:'admin-invite-redeem',token},sessions[delegate.id]);assert.deepEqual(joined.data.admin.access,{isOwner:false,permissions:['pharmacies']});
 assert.equal(joined.data.admin.accounts.length,0);assert.equal(joined.data.admin.activity.length,0);assert.equal(joined.data.admin.members.length,0);assert.equal(joined.data.admin.users,0);
 await request('/api/app',{action:'admin-invite-redeem',token},sessions[delegate.id],409);
 const d=await request('/api/auth',{action:'admin-login',identifier:delegate.email,password});assert.equal(d.data.redirect,'/operations');sessions[delegate.id]=cookie(d.response);
 // Landing CMS is owner-only, draft-first, validated, versioned and reversible.
 await request('/operations/editor',null,'',307);
 await request('/operations/editor',null,sessions[delegate.id],404);
 assert((await request('/operations/editor?lang=en',null,rootCookie)).data.includes('builder-header'),'Owner gets the separate visual editor');
 const initialLanding=(await request('/api/landing')).data.content;assert.deepEqual(initialLanding,emptyLandingContent);
 await resetLandingQuota();
 if(Date.now()%60000>57000)await new Promise(resolve=>setTimeout(resolve,60100-Date.now()%60000));
 const quotaBucket=Math.floor(Date.now()/60000),quotaKey=hash(`landing-content:${owner.id}:${quotaBucket}`);
 await sql(`INSERT INTO rate_limits(key,count,expires) VALUES (${quote(quotaKey)},29,${(quotaBucket+1)*60000}) ON CONFLICT(key) DO UPDATE SET count=29;`);
 await request('/api/landing',{action:'load'},rootCookie);await request('/api/landing',{action:'load'},rootCookie,429);await resetLandingQuota();
 await request('/api/landing?page=not-a-page',null,'',400);
 const helpDefault=defaultPageContent('help'), helpDraft=structuredClone(helpDefault);helpDraft.copy.en.titleA='LOCAL HELP DRAFT';
 await request('/api/landing',{action:'save',page:'help',draftVersion:0,content:helpDraft},'',401);
 await request('/api/landing',{action:'save',page:'help',draftVersion:0,content:helpDraft},sessions[delegate.id],403);
 await request('/api/landing',{action:'save',page:'safety',draftVersion:0,content:helpDraft},rootCookie,400);
 assert.equal((await request('/api/landing',{action:'save',page:'help',draftVersion:0,content:helpDraft},rootCookie)).data.draftVersion,1);
 assert.deepEqual((await request('/api/landing?page=help')).data.content,helpDefault,'Public reads expose only the published page');
 assert.equal((await request('/api/landing',{action:'save',page:'help',draftVersion:0,content:helpDraft},rootCookie)).data.draftVersion,1,'Identical retry is page-scoped');
 await request('/api/landing',{action:'publish',page:'help',draftVersion:1},rootCookie);
 assert((await request('/help?lang=en')).data.includes('LOCAL HELP DRAFT'),'Published help content reaches server-rendered page');
 assert.deepEqual((await request('/api/landing')).data.content,emptyLandingContent,'Editing help cannot overwrite home');
 const helpState=(await request('/api/landing',{action:'load',page:'help'},rootCookie)).data,helpRevision=helpState.revisions[0];assert(helpRevision);
 assert.equal((await request('/api/landing',{action:'load'},rootCookie)).data.revisions.length,0,'History is page-scoped');
 const safetyDraft=defaultPageContent('safety');await request('/api/landing',{action:'save',page:'safety',draftVersion:0,content:safetyDraft},rootCookie);
 await request('/api/landing',{action:'restore',page:'safety',draftVersion:1,revision:helpRevision.id},rootCookie,404);
 const malformedRevision=randomUUID();await sql(`INSERT INTO landing_content_revisions(id,actor,created_at,content_json) VALUES (${quote(malformedRevision)},${quote(owner.id)},${Date.now()},'not-json');`);
 await request('/api/landing',{action:'load',page:'help'},rootCookie);await request('/api/landing',{action:'load'},rootCookie);
 await request('/api/landing',{action:'save',page:'help',draftVersion:2,content:helpDefault},rootCookie);
 await request('/api/landing',{action:'publish',page:'help',draftVersion:3},rootCookie);
 await request('/api/landing',{action:'restore',page:'help',draftVersion:4,revision:helpRevision.id},rootCookie);
 assert.deepEqual((await request('/api/landing?page=help')).data.content,helpDefault,'Restoring help returns its own default');
 const corruptRevision=randomUUID();await sql(`INSERT INTO landing_content_revisions(id,actor,created_at,content_json) VALUES (${quote(corruptRevision)},${quote(owner.id)},${Date.now()},'${JSON.stringify({page:'help',version:99})}');`);
 await request('/api/landing',{action:'restore',page:'help',draftVersion:5,revision:corruptRevision},rootCookie,409);
 await request('/api/landing',{action:'restore',page:'help',draftVersion:5,revision:malformedRevision},rootCookie,404);
 assert.deepEqual((await request('/api/landing?page=help')).data.content,helpDefault,'An invalid revision cannot publish an empty fallback');
 assert.equal((await sql(`SELECT count(*) AS n FROM landing_content_revisions WHERE id=${quote(malformedRevision)}`))[0].results[0].n,1,'Damaged history is preserved for operator recovery');
 await sql(`DELETE FROM landing_content_revisions WHERE id=${quote(malformedRevision)};DELETE FROM landing_content WHERE id IN ('page:help','page:safety');DELETE FROM landing_content_revisions WHERE json_extract(content_json,'$.page') IN ('help','safety');`);
 console.log('PASS: multi-page draft isolation, bound page IDs, server-rendered publication, page-scoped retry/history and cross-page restore rejection.');
 await resetLandingQuota();
 await request('/api/landing',{action:'load'},'',401);
 await request('/api/landing',{action:'load'},sessions[delegate.id],403);
 const invalidLanding=structuredClone(emptyLandingContent);invalidLanding.blocks=[{id:randomUUID(),enabled:true,target:'javascript:alert(1)',copy:{ar:{heading:'LOCAL'}}}];
 await request('/api/landing',{action:'save',draftVersion:0,content:invalidLanding},rootCookie,400);
 const largeInvalidLanding=structuredClone(emptyLandingContent);largeInvalidLanding.version=2;
 for(const language of ['ar','fr','en','kab'])largeInvalidLanding.copy[language]=Object.fromEntries(landingCopyKeys.map(key=>[key,'x'.repeat(600)]));
 assert(Buffer.byteLength(JSON.stringify({action:'save',draftVersion:0,content:largeInvalidLanding}))>32_768);
 await request('/api/landing',{action:'save',draftVersion:0,content:largeInvalidLanding},rootCookie,400);
 const draftLanding=structuredClone(emptyLandingContent);draftLanding.copy={ar:{titleA:'LOCAL OWNER DRAFT'}};draftLanding.sections={journey:false,pharmacy:false,faq:false};
 draftLanding.blocks=[{id:randomUUID(),enabled:true,target:'journey',copy:{ar:{heading:'LOCAL SECTION',body:'LOCAL BODY',button:'LOCAL CTA'} }},{id:randomUUID(),enabled:true,target:'none',copy:{ar:{heading:'',body:'',button:''}}}];
 draftLanding.blocks.push({id:randomUUID(),enabled:true,target:'none',copy:{ar:{heading:'LOCAL INCOMPLETE LEGACY HEADING'}}});
 const draftSaved=await request('/api/landing',{action:'save',draftVersion:0,content:draftLanding},rootCookie);assert.equal(draftSaved.data.draftVersion,1);
 assert.deepEqual((await request('/api/landing')).data.content,emptyLandingContent,'Unsaved public copy is never exposed');
 assert.equal((await request('/api/landing',{action:'save',draftVersion:0,content:draftLanding},rootCookie)).data.draftVersion,1,'Identical lost-response retries recover the committed draft');
 const changedLanding=structuredClone(draftLanding);changedLanding.copy.ar.titleA='LOCAL CHANGED DRAFT';
 await request('/api/landing',{action:'save',draftVersion:0,content:changedLanding},rootCookie,409);
 await sql(["CREATE TRIGGER local_draft_audit_failure BEFORE INSERT ON audit_log WHEN NEW.action='landing-draft-save' BEGIN SELECT RAISE(ABORT,'LOCAL AUDIT FAILURE'); END"]);
 try {
  await request('/api/landing',{action:'save',draftVersion:1,content:changedLanding},rootCookie,503);
  const rolledBack=(await request('/api/landing',{action:'load'},rootCookie)).data;
  assert.equal(rolledBack.draftVersion,1);assert.deepEqual(rolledBack.draft,draftLanding,'Draft and audit must commit together');
 } finally {await sql('DROP TRIGGER local_draft_audit_failure');}
 const draftLoaded=await request('/api/landing',{action:'load'},rootCookie);assert.equal(draftLoaded.data.draft.copy.ar.titleA,'LOCAL OWNER DRAFT');assert.equal(draftLoaded.data.draft.blocks[1].copy.ar.heading,'');
 const publishedLanding=await request('/api/landing',{action:'publish',draftVersion:1},rootCookie);assert.equal(publishedLanding.data.publishedVersion,1);
 assert.equal((await request('/api/landing')).data.content.copy.ar.titleA,'LOCAL OWNER DRAFT');
 assert.doesNotMatch((await request('/')).data,/<h2[^>]*>LOCAL INCOMPLETE LEGACY HEADING<\/h2>/,'Legacy incomplete sections remain hidden after the upgrade');
 const publishedHtml=(await request('/')).data;for(const id of ['how-it-works','for-pharmacies','questions'])assert(!publishedHtml.includes(`href="#${id}"`),`Hidden section link ${id} remains visible`);
 const revision=(await request('/api/landing',{action:'load'},rootCookie)).data.revisions[0];assert(revision);
 const unpublishedDraft=structuredClone(draftLanding);unpublishedDraft.copy.ar.titleA='LOCAL UNSAVED DRAFT';
 await request('/api/landing',{action:'save',draftVersion:2,content:unpublishedDraft},rootCookie);
 const publishAudit=async()=>(await sql(`SELECT COUNT(*) AS count FROM audit_log WHERE actor=${quote(owner.id)} AND action='landing-publish'`))[0].results[0].count;
 const auditsBeforeRace=await publishAudit();
 const racedPublishes=await Promise.all([request('/api/landing',{action:'publish',draftVersion:3},rootCookie,[200,409]),request('/api/landing',{action:'publish',draftVersion:3},rootCookie,[200,409])]);
 assert.deepEqual(racedPublishes.map(result=>result.response.status).sort((a,b)=>a-b),[200,409]);assert.equal(await publishAudit()-auditsBeforeRace,1,'Only the successful concurrent publish is audited');
 const separateDraft=structuredClone(unpublishedDraft);separateDraft.copy.ar.titleA='LOCAL SEPARATE DRAFT';await request('/api/landing',{action:'save',draftVersion:4,content:separateDraft},rootCookie);
 const restoreAudit=async()=>(await sql(`SELECT COUNT(*) AS count FROM audit_log WHERE actor=${quote(owner.id)} AND action='landing-restore'`))[0].results[0].count;
 const auditsBeforeRestore=await restoreAudit();await request('/api/landing',{action:'restore',draftVersion:5,revision:revision.id},rootCookie);
 const restored=(await request('/api/landing',{action:'load'},rootCookie)).data;assert.equal(restored.draft.copy.ar.titleA,'LOCAL SEPARATE DRAFT','Restoring a published revision preserves a separate unsaved draft');assert.deepEqual((await request('/api/landing')).data.content,emptyLandingContent,'Owner rollback restores the prior published copy');assert.equal(await restoreAudit()-auditsBeforeRestore,1,'Successful restore is audited once');
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
 await sql(localInventory.map(s=>`INSERT INTO stock_items(id,pharmacy,name,quantity,updated) VALUES(${quote(s.id)},${quote(pharmacy)},${quote(s.name)},0,${Date.now()});`).join(''));
 const firstStockPage=(await request('/api/stock?q=LOCAL%20PAGED&sort=name',null,sessions[other.id])).data,secondStockPage=(await request('/api/stock?q=LOCAL%20PAGED&sort=name&page=1',null,sessions[other.id])).data;assert.equal(firstStockPage.total,51);assert.equal(firstStockPage.rows.length,50);assert.equal(secondStockPage.rows.length,1);assert(!firstStockPage.rows.some(s=>s.id===secondStockPage.rows[0].id));
 await sql(`DELETE FROM stock_items WHERE pharmacy=${quote(pharmacy)} AND name LIKE 'LOCAL PAGED %';`);
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
 await assert.rejects(sql(`UPDATE reservations SET status='collected' WHERE id=${quote(booking.id)}`),'Database blocks an in-flight/older client pickup');
 await request('/api/admin',{action:'service-save',requests_paused:false,pickups_paused:false,message:'',updated:controls.updated,reason:'Stale control update'},rootCookie,409);
 controls=(await request('/api/admin?section=service',null,rootCookie)).data.service;
 await request('/api/admin',{action:'service-save',requests_paused:false,pickups_paused:false,message:'',updated:controls.updated,reason:'Local resume'},rootCookie);
 await request('/api/admin',{action:'request-stop',id:requestId,reason:'Local safety stop'},rootCookie);
 assert.equal((await request('/api/app',null,sessions[recipient.id])).data.reservations.find(b=>b.id===booking.id).status,'cancelled');
 assert.equal((await sql(`SELECT count(*) AS n FROM reservation_locations WHERE reservation=${quote(booking.id)}`))[0].results[0].n,0);
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
 assert.deepEqual(restricted.data.admin.workload,{},'Audit permission does not reveal other workloads');
 await request('/api/app',{action:'admin-review',pharmacy,status:'suspended'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-pharmacy-edit',pharmacy,name:'FICTIONAL LOCAL PHARMACY',address:'LOCAL FIXTURE NOT A REAL PHARMACY',phone:'0550000000',hours:'08:00 - 20:00'},sessions[delegate.id],403);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['pharmacies']},rootCookie);
 const pharmacyWorkload=(await request('/api/app',null,sessions[delegate.id])).data.admin.workload;
 const expectedPending=(await sql("SELECT count(*) AS n FROM registered_pharmacies WHERE status='pending'"))[0].results[0].n;
 assert.deepEqual(pharmacyWorkload,{pendingPharmacies:expectedPending},'Pharmacy delegates receive the actual pending count only');
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['accounts']},rootCookie);
 const accountWorkload=(await request('/api/app',null,sessions[delegate.id])).data.admin.workload;assert.equal(typeof accountWorkload.accounts,'number');assert.deepEqual(Object.keys(accountWorkload),['accounts']);
 await request('/api/app',{action:'admin-permissions',owner:delegate.id,permissions:['operations']},rootCookie);
 const operationWorkload=(await request('/api/app',null,sessions[delegate.id])).data.admin.workload;assert.equal(typeof operationWorkload.requests,'number');assert.equal(typeof operationWorkload.reservations,'number');assert(!('accounts' in operationWorkload));
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
  await sql(`DELETE FROM landing_content_revisions;DELETE FROM landing_content;DELETE FROM audit_log WHERE actor=${quote(owner.id)} AND action LIKE 'landing-%';`);
 await resetLandingQuota();
 if (process.argv.includes('--review') || process.argv.includes('--browser')) {
  await request('/api/app',{action:'admin-review',pharmacy,status:'approved'},rootCookie);
  if (process.argv.includes('--browser')) {
   const closeProxy=await startUiProxy();
   try {
    await new Promise((resolve,reject)=>{
     const args=['node_modules/playwright/cli.js','test'];
     if(process.env.LQADWA_TEST_GREP)args.push('-g',process.env.LQADWA_TEST_GREP);
     if(process.env.LQADWA_TEST_PROJECT)args.push('--project',process.env.LQADWA_TEST_PROJECT);
     const browser=spawn(process.execPath,args,{stdio:'inherit',env:process.env});
     browser.once('error',reject);browser.once('exit',code=>code===0?resolve():reject(Error('Browser checks failed: '+code)));
    });
   } finally {await closeProxy();}
  } else {
   console.log('LOCAL UI review ready: owner@example.invalid (owner), delegate@example.invalid (client), other@example.invalid (pharmacy). Press Enter to remove these local fixtures.');
   await new Promise(resolve=>{process.stdin.resume();process.stdin.once('data',()=>{process.stdin.pause();resolve();});});
  }
 }
}finally{
 const ids=users.slice(1).map(u=>quote(u.id)).join(','),pharmacies=createdPharmacies.map(quote).join(',');
 await sql(`DELETE FROM landing_content_revisions;DELETE FROM landing_content;DELETE FROM audit_log WHERE actor='local-release-owner' AND action LIKE 'landing-%';UPDATE service_controls SET requests_paused=0,pickups_paused=0,message='',updated=0 WHERE id=1;DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE owner IN (${ids}));DELETE FROM reservations WHERE owner IN (${ids});DELETE FROM responses WHERE request IN (SELECT id FROM requests WHERE owner IN (${ids}));DELETE FROM requests WHERE owner IN (${ids});${pharmacies?`DELETE FROM stock_items WHERE pharmacy IN (${pharmacies});DELETE FROM responses WHERE pharmacy IN (${pharmacies});DELETE FROM registered_pharmacies WHERE id IN (${pharmacies});`:''}DELETE FROM admin_members WHERE owner IN (${ids});DELETE FROM admin_invites WHERE email IN (${users.slice(1).map(u=>quote(u.email)).join(',')});DELETE FROM account_controls WHERE owner IN (${ids});DELETE FROM notifications WHERE owner IN (${ids});DELETE FROM mobile_sessions WHERE owner IN (${ids});DELETE FROM audit_log WHERE actor IN (${ids}) OR target IN (${ids});DELETE FROM profiles WHERE id IN (${ids});`);
 auth.closeAllConnections();await new Promise(resolve=>auth.close(resolve));
}
