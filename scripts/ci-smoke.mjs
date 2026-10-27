// Local isolated Worker only. No migrations/deletion fixtures ever run against a live database.
import {spawn,spawnSync} from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync} from 'node:fs';
import path from 'node:path';
const node=process.execPath,cli='./node_modules/wrangler/wrangler-dist/cli.js';
mkdirSync('.wrangler',{recursive:true});
const testState=mkdtempSync(path.resolve('.wrangler','integration-'));
const env={...process.env,AUTH_OFFLINE:'1',LQADWA_TEST_STATE:testState};
function run(args){const r=spawnSync(node,args,{stdio:'inherit',env});if(r.error)throw r.error;if(r.status!==0)throw Error('Check failed: '+args.join(' '));}
await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(Error('Port 5173 is occupied. Stop your local preview before integration checks.')));s.listen(5173,()=>s.close(resolve));});
console.log('Isolated local integration database: '+testState);
run(['--import','./scripts/sites-env.mjs',cli,'d1','migrations','apply','DB','--local','--config','dist/server/wrangler.json','--persist-to',testState]);
const child=spawn(node,['--import','./scripts/sites-env.mjs',cli,'dev','--config','dist/server/wrangler.json','--local','--persist-to',testState,'--port','5173','--ip','127.0.0.1','--inspector-port','0','--var','APP_ADMIN_IDS:local-release-owner','--var','APP_OWNER_EMAIL:owner@example.invalid','--var','SUPABASE_URL:http://127.0.0.1:5888'],{stdio:'inherit',env});
let childExit;child.once('error',e=>{childExit=e;});child.once('exit',code=>{childExit=Error('Worker exited '+code);});
try {
 let ready=false;
 for(let i=0;i<60;i++){
  if(childExit)throw childExit;
  try{const r=await fetch('http://localhost:5173/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw Error('Local Worker did not become healthy');
 for(const path of ['/','/login','/operations']){
  const response=await fetch('http://localhost:5173'+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  if(path==='/operations'){
   assert.equal(response.status,307,'private administration must redirect to its dedicated sign-in');
   assert.equal(response.headers.get('location'),'/operations/login');
  }else assert(response.ok,`${path} must render`);
  assert.equal(response.headers.get('x-frame-options'),'DENY',path);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff',path);
  assert.match(response.headers.get('strict-transport-security')||'',/max-age=15552000/,path);
 }
 const editorOnly=process.argv.includes('--editor');
 if(editorOnly&&!env.LQADWA_TEST_GREP)env.LQADWA_TEST_GREP='visual editor';
 for(const script of editorOnly?['admin-smoke.mjs']:['discovery-integration.mjs','admin-smoke.mjs','auth-smoke.mjs','release-smoke.mjs'])run(['scripts/'+script,...(script==='admin-smoke.mjs'?(editorOnly?['--browser']:process.argv.filter(arg=>arg==='--review'||arg==='--browser')):[])]);
 console.log(editorOnly?'PASS: isolated editor and admin checks.':'PASS: local integration gate. Fixtures were never deployed.');
} finally {child.kill('SIGTERM');}
