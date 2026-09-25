// Generate shared language/catalog assets; user records are never packaged.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import ts from 'typescript';
function module(file) {
 const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
 const exports = {}; new Function('exports', 'require', output)(exports, path => { if (path === './kabyle') return module('lib/kabyle.ts'); throw new Error(path); }); return exports;
}
const {translations,tr}=module('lib/i18n.ts');
const languages = Object.fromEntries(['ar','fr','en','kab'].map(lang=>[lang,Object.fromEntries(Object.keys(translations).map(key=>[key,tr(lang,key)]))]));
const dir = 'android/app/src/main/assets'; mkdirSync(dir,{recursive:true});
writeFileSync(`${dir}/languages.json`, JSON.stringify(languages));
writeFileSync(`${dir}/cities.json`, JSON.stringify(module('lib/wilayas.ts').cities));
writeFileSync(`${dir}/medicines.json`, readFileSync('lib/medicines-2026.json'));
console.log('Native assets: 4 languages, wilayas and medicine catalog.');
