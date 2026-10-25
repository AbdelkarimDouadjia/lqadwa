import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const backup=realpathSync(process.argv[2]||'');
const root=realpathSync('.cloudflare/backups');
assert(backup.startsWith(root+path.sep),'Rehearse only a protected, ignored local backup');
const sql=readFileSync(backup,'utf8'),folder=mkdtempSync(path.join(root,'restore-')),db=new DatabaseSync(path.join(folder,'rehearsal.sqlite'));
try{
 db.exec(sql);
 assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0,'Backup has foreign-key inconsistencies; inspect privately before migration');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all().map(row=>row.name);
 const counts=()=>Object.fromEntries(tables.map(name=>[name,db.prepare('SELECT count(*) AS n FROM "'+name.replaceAll('"','""')+'"').get().n]));
 const before=counts();
 for(const migration of ['0013_request_identity.sql','0014_stock_identity.sql'])db.exec(readFileSync('drizzle/'+migration,'utf8'));
 assert.deepEqual(counts(),before,'Additive migration must preserve all existing rows');
 assert.equal(db.prepare('SELECT count(*) AS n FROM request_identity').get().n,0);
 assert(db.prepare("SELECT name FROM sqlite_master WHERE name='landing_content'").get());
 assert(db.prepare("SELECT name FROM sqlite_master WHERE name='landing_content_revisions'").get());
 db.exec("SAVEPOINT old_client_compatibility");
 try{
  db.exec("UPDATE service_controls SET requests_paused=0,pickups_paused=0 WHERE id=1");
  const id='LOCAL-RESTORE-COMPATIBILITY-'+crypto.randomUUID();
  db.prepare("INSERT INTO profiles(id,name,city) VALUES(?,'LOCAL COMPATIBILITY','algiers')").run(id);
  db.prepare("INSERT INTO requests(id,owner,medicine,city,created) VALUES(?,?,'LOCAL UNVERIFIED','algiers',?)").run(id,id,Date.now());
  assert(db.prepare("SELECT id,medicine,city,created FROM requests WHERE id=?").get(id));
  db.prepare("INSERT INTO registered_pharmacies(id,owner,name,address,city,latitude,longitude,phone,license,created,updated) VALUES(?,?,'LOCAL ONLY','LOCAL ONLY','algiers',36750000,3050000,'0000000000','NOT A LICENSE',?,?)").run(id,id,Date.now(),Date.now());
  db.prepare("INSERT INTO stock_items(id,pharmacy,name,quantity,updated) VALUES(?,?,'LOCAL MANUAL',1,?)").run(id,id,Date.now());
  assert.equal(db.prepare("SELECT medicine_id FROM stock_items WHERE id=?").get(id).medicine_id,null,'Old stock writes remain explicitly unverified');
 }finally{db.exec("ROLLBACK TO old_client_compatibility; RELEASE old_client_compatibility");}
 assert.deepEqual(counts(),before,'Compatibility exercise must leave the restored records unchanged');
 assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
 assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0,'Migrated rehearsal has foreign-key inconsistencies');
 console.log(JSON.stringify({status:'PASS',backupSha256:createHash('sha256').update(sql).digest('hex'),backupBytes:Buffer.byteLength(sql),existingRowsPreserved:true,legacySqlCompatibility:true,landingTables:true,additiveMigrations:['0013_request_identity.sql','0014_stock_identity.sql'],productionModified:false}));
}finally{db.close();}
