import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {hasRecentMfa} from '../lib/mfa-assurance.ts';
import { emptyLandingContent, landingContentSchema, landingLayout, pageLayout, contentPageKeys, maxContentBlocks, parseLandingContent, reorderLanding, importLandingDraft, exportLandingDraft, landingDraftFileMaxBytes } from '../lib/landing-content.ts';
import { defaultPageContent, flexibleLandingSection } from '../lib/content-pages.ts';

const original = structuredClone(emptyLandingContent), id = randomUUID();
original.blocks = [{ id, enabled: true, target: 'search', copy: { en: { heading: 'Find a pharmacy', body: 'Collect your medicine in person.' } } }];
assert.deepEqual(landingLayout(original), [...original.order, id], 'Existing pages retain their published layout');
const moved = reorderLanding(original, id, 'tools');
assert.equal(landingLayout(moved).indexOf(id) + 1, landingLayout(moved).indexOf('tools'), 'Custom sections can be placed before built-in sections');
assert.deepEqual(landingLayout(original), [...original.order, id], 'Dragging never mutates a saved version');
assert(landingContentSchema.safeParse(moved).success);
assert.deepEqual(parseLandingContent(JSON.stringify(moved)), moved, 'Layout survives save/load');
const after = reorderLanding(moved, id, 'faq', true);
assert.equal(landingLayout(after).at(-1), id);
assert.deepEqual(after.order, original.order);
assert.equal(reorderLanding(moved, 'outside', 'tools'), moved);
assert.equal(reorderLanding(moved, id, id), moved);
assert.equal(reorderLanding(original, 'journey', 'tools'), original, 'Dropping into the existing position does not create a false edit');
for (const layout of [[], ['journey', 'journey'], [...moved.layout, id], moved.layout.map(value => value === id ? randomUUID() : value)]) {
  assert(!landingContentSchema.safeParse({ ...moved, layout }).success, 'Duplicate, missing and unknown drop targets are rejected');
}
assert(!landingContentSchema.safeParse({ ...original, blocks: [...original.blocks, original.blocks[0]] }).success);
assert(landingContentSchema.safeParse({ ...moved, blocks: [{ ...moved.blocks[0], appearance: { tone: 'brand', align: 'center' } }] }).success);
assert(!landingContentSchema.safeParse({ ...moved, blocks: [{ ...moved.blocks[0], appearance: { tone: 'javascript:alert(1)', align: 'center' } }] }).success);
assert.deepEqual(importLandingDraft(exportLandingDraft(moved)),moved,'Draft files preserve locale copy, order and appearance');
for(const raw of ['not json','{}',JSON.stringify({format:'lqadwa-landing-draft',fileVersion:2,content:moved}),JSON.stringify({format:'lqadwa-landing-draft',fileVersion:1,content:{...moved,blocks:[{...moved.blocks[0],target:'javascript:alert(1)'}]}}),' '.repeat(landingDraftFileMaxBytes+1)])assert.throws(()=>importLandingDraft(raw));
assert.throws(()=>importLandingDraft('é'.repeat(landingDraftFileMaxBytes/2+1)),'UTF-8 byte limit applies before parsing');
const now=Date.now(),seconds=now/1000,claims={sub:'local-owner',session_id:'local-session',aal:'aal2',exp:seconds+3600,amr:[{method:'totp',timestamp:seconds}]};
assert(hasRecentMfa(claims,'local-owner',now));
for(const changed of [{aal:'aal1'},{sub:'someone-else'},{session_id:''},{exp:seconds},{amr:[]},{amr:[{method:'password',timestamp:seconds}]},{amr:[{method:'totp',timestamp:seconds-600}]},{amr:[{method:'totp',timestamp:seconds+31}]}])assert(!hasRecentMfa({...claims,...changed},'local-owner',now),'Invalid or stale assurance cannot authorize publishing');
console.log('PASS: backward-compatible layouts, immutable interleaved section moves, round trips and validated identifiers/appearance.');
for (const page of contentPageKeys) {
 const content=defaultPageContent(page);assert(landingContentSchema.safeParse(content).success,`Default ${page} must validate`);
 assert.deepEqual(importLandingDraft(exportLandingDraft(content)),content);
 if(content.blocks.length){const reordered=reorderLanding(content,'hero',content.blocks.at(-1).id,true);assert.equal(pageLayout(reordered).at(-1),'hero');assert(landingContentSchema.safeParse(reordered).success);}
}
const rich=defaultPageContent('help'), block=rich.blocks[0];
block.items=[{id:randomUUID(),copy:{en:{heading:'Question',body:'Answer'}}}];block.kind='faq';
block.appearance={tone:'sky',align:'center',width:'narrow',spacing:'spacious',columns:3};
assert(landingContentSchema.safeParse(rich).success);
assert(!landingContentSchema.safeParse({...rich,blocks:Array.from({length:maxContentBlocks+1},()=>({...block,id:randomUUID()}))}).success);
assert(!landingContentSchema.safeParse({...rich,blocks:[{...block,items:[block.items[0],block.items[0]]}]}).success);
assert(!landingContentSchema.safeParse({...rich,blocks:[{...block,image:'https://tracking.invalid/image.png'}]}).success);
assert(!landingContentSchema.safeParse({...rich,blocks:[{...block,appearance:{...block.appearance,columns:100}}]}).success);
for(const section of original.order){const flexible=flexibleLandingSection(original,section,randomUUID(),[randomUUID(),randomUUID(),randomUUID()]);assert(landingContentSchema.safeParse({...emptyLandingContent,blocks:[flexible]}).success);}
console.log('PASS: seven page defaults, movable introduction, rich blocks, repeatable-item limits, asset allowlist and flexible built-in conversion.');
