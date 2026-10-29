// Work on a disposable copy only: never generate against or change the reviewed migration history.
import assert from 'node:assert/strict';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
mkdirSync('.cloudflare',{recursive:true});
const temporary=mkdtempSync('.cloudflare/assistant-schema-'),history=temporary+'/history',config=temporary+'/drizzle.config.ts';
cpSync('drizzle',history,{recursive:true});
const fingerprint=()=>createHash('sha256').update(readdirSync(history,{recursive:true}).filter(file=>/\.(sql|json)$/.test(file)).sort().map(file=>file+'\n'+readFileSync(path.join(history,file),'utf8')).join('\n')).digest('hex');
const before=fingerprint();
writeFileSync(config,'export default '+JSON.stringify({dialect:'sqlite',schema:'./db/schema.ts',out:history})+';');
const result=spawnSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','generate','--config',config],{encoding:'utf8',timeout:60000});
assert.equal(result.error,undefined);
assert.equal(result.status,0,result.stderr);
assert.match(result.stdout,/No schema changes, nothing to migrate/,result.stdout+result.stderr);
assert.equal(fingerprint(),before,'db:generate must not recreate SQL-owned vault migration or alter schema history');
console.log('PASS: isolated Drizzle generation reports no changes; existing migration history is untouched and no duplicate credential table is generated.');
