import assert from 'node:assert/strict';
import {assistantInput} from '../lib/assistant-contract.ts';
import {conversationalAnswer,containsPrivateInput} from '../lib/assistant-rag.ts';
import {retrievalAnswer} from '../lib/assistant-retrieval.ts';
import {chatCompletionRunner,nvidiaChatModel} from '../lib/assistant-provider-http.ts';
const signal=new AbortController().signal,input={tool:'chat',query:'How do I collect my reservation?',language:'en',previous:[],externalConsent:true,evaluation:true};
for(const extra of [{externalConsent:false},{externalConsent:undefined},{owner:'other'},{url:'https://evil.invalid'},{sql:'SELECT *'},{model:'paid-model'}])assert(!assistantInput.safeParse({...input,...extra}).success);
const source=retrievalAnswer(input.query,'en').citations[0];assert(source);
let calls=0;
const primary={id:'nvidia',run:async(messages)=>{calls++;const data=JSON.parse(messages[1].content);assert.equal(data.question,input.query);assert(data.publicEvidence.some(item=>item.id===source.id));assert(!('owner'in data));return JSON.stringify({answer:'Collect your reservation in person at the pharmacy.',citations:[source.id]});}};
const grounded=await conversationalAnswer(input,[primary],signal,async()=>true);assert.equal(grounded.mode,'grounded-chat');assert.equal(grounded.citations[0].hash,source.hash);assert.equal(calls,1);
const general=await conversationalAnswer({...input,query:'Explain retrieval augmented generation.'},[{id:'nvidia',run:async()=>JSON.stringify({answer:'It retrieves relevant documents before generating an answer.',citations:[]})}],signal,async()=>true);assert.equal(general.mode,'general-chat');assert.equal(general.citations.length,0);
const order=[],budgets=[];
const backup=await conversationalAnswer(input,[{id:'nvidia',run:async()=>{order.push('primary');throw Error('outage');}},{id:'openrouter',run:async()=>{order.push('backup');return JSON.stringify({answer:'Collect in person.',citations:[source.id]});}}],signal,async provider=>{budgets.push(provider);return true;});
assert.deepEqual(order,['primary','backup']);assert.deepEqual(budgets,['nvidia','openrouter']);assert.equal(backup.mode,'grounded-chat');
let blockedCalls=0;const forbidden={id:'nvidia',run:async()=>{blockedCalls++;throw Error('must not call');}};
for(const query of ['My email is person@example.invalid','My phone is 0550123456','Which dose for my child?','I have diabetes. What should I take?','اسمي محمد وعندي السكري','Is this medicine in stock now?','What is the weather today?'])await conversationalAnswer({...input,query},[forbidden],signal,async()=>true);
assert.equal(blockedCalls,0,'Private/clinical/live facts must not reach a general LLM');assert(containsPrivateInput('sk_'+ 'a'.repeat(32)));
await conversationalAnswer({...input,previous:['My name is John']},[forbidden],signal,async()=>true);assert.equal(blockedCalls,0);
for(const output of [JSON.stringify({answer:'Take 100 mg.',citations:[source.id]}),JSON.stringify({answer:'Open https://evil.invalid',citations:[source.id]}),JSON.stringify({answer:'Collect in person',citations:['invented']}),JSON.stringify({answer:'Collect in person',citations:[],sql:'SELECT *'}),JSON.stringify({answer:'Collect in person',citations:[]})]){
 const fallback=await conversationalAnswer(input,[{id:'nvidia',run:async()=>output}],signal,async()=>true);assert(fallback.fallback);assert(!fallback.text.includes('100 mg'));
}
await conversationalAnswer(input,[forbidden],signal,async()=>false);assert.equal(blockedCalls,0);
const abort=new AbortController();abort.abort();assert((await conversationalAnswer(input,[forbidden],abort.signal,async()=>true)).fallback);assert.equal(blockedCalls,0);
for(const provider of ['nvidia','openrouter']){
 const result=await chatCompletionRunner(provider,'LOCAL-only-synthetic-key',async(url,options)=>{
  assert.equal(url,provider==='nvidia'?'https://integrate.api.nvidia.com/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions');assert.equal(options.redirect,'error');assert(!url.includes('LOCAL'));
  const body=JSON.parse(options.body);assert.equal(body.model,provider==='nvidia'?nvidiaChatModel:'openrouter/free');assert.equal(body.tools,undefined);assert.equal(body.stream,false);assert.equal(body.max_tokens,768);
  if(provider==='openrouter'){assert.deepEqual(body.provider.max_price,{prompt:0,completion:0,request:0});assert.equal(body.provider.allow_fallbacks,false);assert.equal(body.provider.data_collection,'deny');assert.equal(body.provider.zdr,true);}
  return Response.json({choices:[{message:{content:'{"answer":"Hello","citations":[]}'},finish_reason:'stop'}]});
 })([{role:'user',content:'Public synthetic question'}],signal);assert(result.includes('Hello'));
}
console.log('PASS: conversational RAG, consent, citation validation, general answers, primary/backup order and budgets, private/clinical/live-data blocking, cancellation, fixed endpoints and zero-price production fallback. HTTP mocked only.');
