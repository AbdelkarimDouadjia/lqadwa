// Wrangler's bundled dev middleware does this; our generated no_bundle Worker needs it too.
// https://github.com/cloudflare/workers-sdk/issues/15203
export function withDrainedBody(worker) {
 return {...worker,async fetch(request,...args){
  // Vinext transfers the original stream into a new Request; retain a local-only drain branch.
  const remaining=request.body===null?null:request.clone().body;
  // Consume concurrently so a handler awaiting reader.cancel() never waits on an unread tee.
  const draining=(async()=>{
   try{if(remaining!==null){
    const reader=remaining.getReader();
    try{while(!(await reader.read()).done){}}finally{reader.releaseLock();}
   }}
   catch{console.error('Local test request body could not be drained.');}
  })();
  try{return await worker.fetch(request,...args);}finally{await draining;}
 }};
}
