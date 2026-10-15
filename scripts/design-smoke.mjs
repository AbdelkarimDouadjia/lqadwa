import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const css=read('app/design-refinement.css');
function luminance(hex){const rgb=hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
for(const selector of [':root','[data-theme=dark]']){
 const block=css.slice(css.indexOf(selector)).split('}')[0];
 const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m=>[m[1],m[2]]));
 const pairs=[['foreground','background'],['foreground','card'],['muted-foreground','background'],['muted-foreground','card'],['muted-foreground','blue-soft'],['muted-foreground','violet-soft'],['muted-foreground','amber-bg'],['primary-foreground','primary'],['secondary-foreground','secondary'],['blue-ink','blue-soft'],['violet-ink','violet-soft'],['amber-ink','amber-bg'],['destructive','rose-soft']];
 for(const [front,back] of pairs){assert(tokens[front]&&tokens[back]);const a=luminance(tokens[front]),b=luminance(tokens[back]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert(ratio>=4.5,`${selector}: ${front}/${back}: ${ratio.toFixed(2)} must be at least 4.5`);}
}
assert(read('app/layout.tsx').indexOf('./design-refinement.css')>read('app/layout.tsx').indexOf('./luqya.css'),'Refined tokens override legacy styles');
assert(css.includes('body, [data-theme=dark] body { background: var(--background)'));
assert(css.includes('.product-menu-button { display: flex; }'));
assert(css.includes('min-height: 44px; min-width: 44px;'));
const footer=read('components/site-footer.tsx');assert(footer.includes('.filter(s=>s.url)'),'Uncreated social accounts must not be live links');
const native=read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java');assert(native.includes('applyPalette()')&&native.includes('nav.setItemTextColor(navColors)'));
assert(read('android/app/src/main/res/values-night/themes.xml').includes('Theme.Material3.DayNight.NoActionBar'));
console.log('PASS: light/dark text and action contrast, mobile targets, theme cascade, empty social links and native palette.');
const editorial=read('app/editorial.css');
for (const selector of ['.app-shell:has(.editorial-page) {','[data-theme=dark] .app-shell:has(.editorial-page) {']) {
 const block=editorial.slice(editorial.indexOf(selector)).split('}')[0];
 const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m=>[m[1],m[2]]));
 for(const [front,back] of [['foreground','background'],['foreground','card'],['foreground','chapter'],['foreground','chapter-sky'],['muted-foreground','card'],['primary-foreground','primary']]) {
  assert(tokens[front]&&tokens[back]);const a=luminance(tokens[front]),b=luminance(tokens[back]);
  assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,`${selector} ${front}/${back}`);
 }
}
assert(editorial.includes('prefers-reduced-motion:no-preference'));
assert(editorial.includes('data-less-motion=true'));
assert(!/opacity:\s*0[;}]/.test(editorial),'Page content must remain readable without animation/JavaScript');
assert(!/opacity\s*:/.test(editorial),'Entrance motion must not reduce text contrast');
for(const name of ['neighbourhood','prescription','pharmacy','walk']) assert(readFileSync(`public/art/${name}.webp`).length<400000);
console.log('PASS: editorial light/dark contrast, motion fallback, visible no-JS content and optimized artwork.');
