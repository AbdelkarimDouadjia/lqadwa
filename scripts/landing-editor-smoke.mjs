import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { emptyLandingContent, landingContentSchema, landingLayout, parseLandingContent, reorderLanding } from '../lib/landing-content.ts';

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
console.log('PASS: backward-compatible layouts, immutable interleaved section moves, round trips and validated identifiers/appearance.');
