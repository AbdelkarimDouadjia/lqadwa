import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
// Runner-control tests only: fake SDK processes, never a physical device or real instrumentation.
mkdirSync('.cloudflare',{recursive:true});
const root=mkdtempSync(path.resolve('.cloudflare','android-runner-'));
const sdk=path.join(root,'sdk');for(const folder of ['emulator','platform-tools'])mkdirSync(path.join(sdk,folder),{recursive:true});
writeFileSync(path.join(sdk,'emulator','emulator'),'#!/usr/bin/env bash\nif [[ "${1:-}" == -version || "${1:-}" == -accel-check ]]; then echo "LOCAL fake SDK diagnostic";exit 0;fi\nif [[ "$LOCAL_RUNNER_CASE" == exited ]];then echo "LOCAL intentional emulator startup failure";exit 9;fi\ntrap "exit 0" TERM INT\nwhile true;do sleep 1;done\n',{mode:0o755});
writeFileSync(path.join(sdk,'platform-tools','adb'),'#!/usr/bin/env bash\nif [[ "${1:-}" == -s ]];then shift 2;fi\ncase "${1:-}" in\nget-state) if [[ "$LOCAL_RUNNER_CASE" == absent || "$LOCAL_RUNNER_CASE" == exited ]];then exit 1;fi;echo device;;\nshell) if [[ "$*" == *"sys.boot_completed"* ]];then echo 1;elif [[ "$*" == *"am instrument"* ]];then if [[ "$LOCAL_RUNNER_CASE" == failed ]];then echo "FAIL: LOCAL intentional instrumentation failure";echo "INSTRUMENTATION_CODE: 1";else echo "PASS: native screens LOCAL FAKE CONTROL TEST ONLY";echo "INSTRUMENTATION_CODE: -1";fi;fi;;\nesac\n',{mode:0o755});
const bash=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
for(const scenario of ['exited','absent','failed','success']){
 const report=path.join(root,scenario);const result=spawnSync(bash,['scripts/android-instrumentation.sh'],{cwd:process.cwd(),encoding:'utf8',timeout:15000,env:{...process.env,ANDROID_HOME:sdk.replaceAll('\\','/'),LQADWA_ANDROID_REPORT_DIR:report.replaceAll('\\','/'),LQADWA_ANDROID_BOOT_SECONDS:'3',LOCAL_RUNNER_CASE:scenario}});
 assert(!result.error,`${scenario}: runner hung instead of respecting bounds: ${result.error}`);
 if(scenario==='success')assert.equal(result.status,0,result.stderr+result.stdout);else assert.notEqual(result.status,0,scenario);
 if(scenario==='exited')assert.match(result.stderr,/Emulator exited before connecting/);
 if(scenario==='absent')assert.match(result.stderr,/did not complete boot/);
 if(scenario==='failed')assert.match(readFileSync(path.join(report,'instrumentation.log'),'utf8'),/FAIL: LOCAL/);
}
console.log('PASS: emulator early-exit/no-device bounds, instrumentation failure rejection and success sentinel. Fake-process control tests only; not an Android device pass.');
