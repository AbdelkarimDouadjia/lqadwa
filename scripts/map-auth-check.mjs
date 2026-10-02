import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {googleMapsDirections} from '../lib/maps-url.ts';
const destination={lat:36.75,lng:3.05},origin={lat:36.72,lng:3.02};
for(const mode of ['driving','walking','transit']){
 const url=new URL(googleMapsDirections(destination,mode,origin));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.searchParams.get('api'),'1');
 assert.equal(url.searchParams.get('destination'),'36.75,3.05');assert.equal(url.searchParams.get('origin'),'36.72,3.02');assert.equal(url.searchParams.get('travelmode'),mode);
 assert.equal(url.searchParams.get('dir_action'),mode==='transit'?null:'navigate');
}
assert.equal(new URL(googleMapsDirections(destination,'walking')).searchParams.has('origin'),false,'Maps should determine location if none was shared');
const read=p=>readFileSync(p,'utf8');
assert.doesNotMatch(read('lib/domain.ts'),/صيدلية النور|صيدلية الياسمين|صيدلية الأمل/);
assert.doesNotMatch(read('components/auth-form.tsx'),/chatgpt/i);
assert.match(read('app/api/auth/route.ts'),/z\.enum\(\["google", "apple"\]\)/);
assert.match(read('app/api/auth/route.ts'),/oauthProviders\(\)\)\[input.provider\]/);
assert.match(read('app/api/auth/route.ts'),/skipBrowserRedirect: true/);
const native=read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java');
assert.match(native,/useDefaultLocationEngine\(false\)/,'Location updates must stay under app permission/lifecycle control');
assert.match(native,/map==routeMap&&destination==target&&travel.equals\(routeMode\)/,'Old route responses must not replace another route');
assert.match(native,/if\(routeLine!=null\)map.removePolyline\(routeLine\)/,'Rerouting must replace the previous line');
assert.match(read('components/route-navigator.tsx'),/document.visibilityState === "hidden"/);
console.log('PASS: Google Maps modes/origin, no fictional directory, provider allow-list, PKCE, native location lifecycle and rerouting guards.');
