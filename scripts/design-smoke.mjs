import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const css=read('app/design-refinement.css');
function luminance(hex){const rgb=hex.match(/[a-f\d]{2}/gi).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
for(const selector of [':root','[data-theme=dark]']){
 const block=css.slice(css.indexOf(selector)).split('}')[0];
 const tokens=Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(m=>[m[1],m[2]]));
 const pairs=[['foreground','background'],['foreground','card'],['muted-foreground','background'],['muted-foreground','card'],['primary-foreground','primary'],['secondary-foreground','secondary'],['blue-ink','blue-soft'],['violet-ink','violet-soft'],['amber-ink','amber-bg'],['destructive','rose-soft']];
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
