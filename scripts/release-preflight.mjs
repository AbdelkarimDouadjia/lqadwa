import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {validateReleaseApproval} from '../lib/release-approval.mjs';

const mode=process.argv[2]||'INFORMATION_ONLY';
assert(['CORE','INFORMATION_ONLY'].includes(mode),'Release mode must be explicit');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','Release checkout must be clean');
const receipt=JSON.parse(process.env.LQADWA_RELEASE_APPROVAL||'null');
validateReleaseApproval(receipt,mode,sha);
const config='dist/server/wrangler.json';
const run=execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','d1','execute','DB','--remote','--config',config,'--command','SELECT name FROM d1_migrations ORDER BY name','--json'],{encoding:'utf8',maxBuffer:2_000_000});
const applied=new Set(JSON.parse(run).flatMap(result=>result.results||[]).map(row=>row.name));
for(const migration of readdirSync('drizzle').filter(n=>n.endsWith('.sql')))assert(applied.has(migration),`Migration not verified on live database: ${migration}`);
const schemaCheck=execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/wrangler-dist/cli.js','d1','execute','DB','--remote','--config',config,'--command',"SELECT id,draft_json,published_json FROM landing_content LIMIT 0;SELECT id,content_json FROM landing_content_revisions LIMIT 0;SELECT request,identity_json,payload_json FROM request_identity LIMIT 0;SELECT medicine_id,catalog_version,identity_json FROM stock_items LIMIT 0;PRAGMA foreign_key_check;",'--json'],{encoding:'utf8',maxBuffer:2_000_000});
for(const result of JSON.parse(schemaCheck)){assert(result.success,'Live schema check failed');assert.equal(result.results?.length||0,0,'Live schema has foreign-key inconsistencies; investigate privately');}
const built=JSON.parse(readFileSync(config,'utf8'));
assert(!JSON.stringify(built).includes('example.invalid'),'Fixture configuration must never be deployed');
console.log(`PASS: operator evidence and live migration history for ${sha} in ${mode}. No migration or production data was changed.`);
