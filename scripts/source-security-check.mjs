// Refuse common credential leaks before upload. Print locations only, never matching values.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const list=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const failures=[];
function inspect(path,text) {
 for(const pattern of [/\bnvapi-[A-Za-z0-9_-]{30,}/,/\bsk_[A-Za-z0-9]{28,}/])if(pattern.test(text))failures.push({path,kind:'providerCredential'});
 for(const [kind,pattern] of Object.entries({privateKey:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,githubToken:/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,supabaseSecret:/\bsb_secret_[A-Za-z0-9_-]{20,}\b/,awsKey:/\bAKIA[A-Z0-9]{16}\b/}))if(pattern.test(text))failures.push({path,kind});
 for(const token of text.match(/eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]) {
  try{if(JSON.parse(Buffer.from(token.split('.')[1],'base64url')).role==='service_role')failures.push({path,kind:'serviceRoleJWT'});}catch{}
 }
}
for(const path of new Set(list)) {
 if(!/\.(?:ts|tsx|js|mjs|json|jsonc|ya?ml|md|xml|gradle|ps1|sh|sql|properties)$/.test(path))continue;
 let text;try{text=readFileSync(path,'utf8');}catch{continue;}
 inspect(path,text);
}
if(process.argv.includes('--history'))inspect('Git history',execFileSync('git',['log','--all','-p','--format='],{encoding:'utf8',maxBuffer:64*1024*1024}));
if(failures.length)throw Error('Credentials found at '+JSON.stringify(failures));
console.log('PASS: common credential patterns absent from tracked and publishable source. Private state is excluded by .gitignore. This is not a complete security audit.');
