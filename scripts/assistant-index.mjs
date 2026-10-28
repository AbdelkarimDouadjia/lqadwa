import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { helpChunks, corpusVersion } from '../lib/assistant-corpus.ts';
const hash = value => createHash('sha256').update(value).digest('hex');
const urls = new Set(['/how-it-works','/for-pharmacies','/safety','/pricing','/help','/login']);
const ids = new Set();
for (const chunk of helpChunks) {
  assert(!ids.has(chunk.id)); ids.add(chunk.id);
  assert(chunk.text.length > 10 && chunk.text.length <= 2200);
  assert(chunk.url === 'https://www.who.int/initiatives/medication-without-harm' || (chunk.url.startsWith('/') && urls.has(new URL(chunk.url, 'https://local.invalid').pathname)));
  assert(!/[<>]/.test(chunk.text), 'Plain text sources only');
  assert(chunk.rights && /^\d{4}-\d{2}-\d{2}$/.test(chunk.updated));
}
const manifest = { version:corpusVersion, hashAlgorithm:'sha256', count:helpChunks.length,
  corpusHash:hash(JSON.stringify(helpChunks)), hashes:Object.fromEntries(helpChunks.map(chunk=>[chunk.id,hash(JSON.stringify(chunk))])) };
const file = new URL('../lib/assistant-manifest.json', import.meta.url);
if (process.argv.includes('--write')) writeFileSync(file, JSON.stringify(manifest,null,2)+'\n');
else assert.deepEqual(JSON.parse(readFileSync(file,'utf8')),manifest,'Corpus changed: review rights, safety and versions, then run node scripts/assistant-index.mjs --write');
console.log(`PASS: ${helpChunks.length} allowlisted source chunks; manifest ${manifest.corpusHash}`);
