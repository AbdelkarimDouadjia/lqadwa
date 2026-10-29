import assert from 'node:assert/strict';
import {withDrainedBody} from './local-test-body-drain.mjs';
for(const status of [401,403,413]){
 const request=new Request('http://localhost/rejected',{method:'POST',body:'x'.repeat(100000)});
 const response=await withDrainedBody({fetch:async()=>new Response('Denied',{status})}).fetch(request,{},{});
 assert.equal(response.status,status);assert.equal(await response.text(),'Denied');
}
const consumed=new Request('http://localhost/consumed',{method:'POST',body:'payload'});
assert.equal(await(await withDrainedBody({fetch:async request=>new Response(await request.text())}).fetch(consumed)).text(),'payload');
const failed=new Request('http://localhost/failure',{method:'POST',body:'payload'});
await assert.rejects(withDrainedBody({fetch:async()=>{throw Error('Original failure');}}).fetch(failed),/Original failure/);
let pulled=0;
const transferred=new Request('http://localhost/transferred',{method:'POST',duplex:'half',body:new ReadableStream({pull(controller){if(++pulled<4)controller.enqueue(new Uint8Array(100));else controller.close();}})});
await withDrainedBody({fetch:async request=>{new Request(request);return new Response('Denied',{status:403});}}).fetch(transferred);
assert.equal(pulled,4,'A transferred body must also reach EOF before returning through the proxy');
const stream=new ReadableStream({pull(controller){controller.error(Error('Aborted client'));}});
const aborted=new Request('http://localhost/aborted',{method:'POST',body:stream,duplex:'half'});
const log=console.error;let reported=false;
try{console.error=()=>{reported=true;};assert.equal((await withDrainedBody({fetch:async()=>new Response('Denied',{status:403})}).fetch(aborted)).status,403);assert(reported);}finally{console.error=log;}
console.log('PASS: local dev body draining preserves rejection statuses, consumed bodies and original failures, and handles aborted uploads.');
