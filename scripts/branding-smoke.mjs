// Public branding stays separate from demo-data and medical safety disclosures.
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read = path => readFileSync(path, 'utf8');
const languages = JSON.parse(read('android/app/src/main/assets/languages.json'));
for (const [language, copy] of Object.entries(languages)) {
  for (const value of Object.values(copy)) assert.doesNotMatch(value, /\bbeta\b|\bbêta\b|\bprototype\b|\bRC1\b|public pilot|version pilote|نسخة تجريبية/i, language);
  assert.ok(copy.serviceRegion && copy.kabyleLanguage, language);
  assert.ok(copy.demoWarning && copy.demoDisclaimer && copy.catalogCaution, `${language}: safety disclosures`);
}
for (const path of ['app/page.tsx','components/app-install.tsx','components/account-data.tsx','components/device-security.tsx','app/privacy/page.tsx','android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java']) {
  assert.doesNotMatch(read(path), /Taqbaylit · Beta|\bRC1\b|Release candidate|نسخة مرشحة للإطلاق/i, path);
}
assert.ok(read('app/page.tsx').includes('"patientSpace"'));
assert.ok(read('app/page.tsx').includes('t("pickupOnly")'));
assert.doesNotMatch(read('app/page.tsx'), /setDemoMode|demo-toggle/);
assert.doesNotMatch(read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java'), /CheckBox examples|t\("demoMode"\)/);
assert.ok(read('app/api/app/route.ts').includes('demo: z.literal(false).default(false)'));
assert.ok(read('app/privacy/page.tsx').includes('n’a pas été validée par un relecteur kabylophone'));
assert.ok(read('android/app/build.gradle').includes("versionCode 14; versionName '1.0.9'"));
assert.equal((read('components/app-install.tsx').match(/v=\$\{version\}/g)||[]).length,2,'APK links follow the package version');
assert.doesNotMatch(read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java'), /android\.webkit|new WebView/);
assert.doesNotMatch(read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java'), /public void onBackPressed\(|Comparator.comparingDouble/);
assert.ok(read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java').includes('getOnBackPressedDispatcher().addCallback(this,backNavigation)'));
assert.ok(read('android/app/src/main/AndroidManifest.xml').includes('android:dataExtractionRules="@xml/data_extraction_rules"'));
const native = read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java');
assert.ok(native.includes('if(token.isEmpty()||(afterLocation==null&&sharing.isEmpty()&&!mapTracking))return;stopLocation();'), 'Late permission callbacks must not restart GPS after logout/navigation');
assert.ok(native.includes('(authenticated&&!auth.equals(token))'), 'Responses from a previous login must not replace the current account');
assert.ok(native.includes('b.optLong("approachUpdated")+60000-System.currentTimeMillis()'), 'Private arrival markers need a local freshness expiry');
for (const old of ['lqadwa-demo.apk', 'lqadwa-armv7.apk']) {
  assert.equal(existsSync(`public/downloads/${old}`), false, 'Do not distribute debug-signed packages');
  assert.ok(read('next.config.ts').includes(`source: "/downloads/${old}"`), 'Preserve old download links');
}
console.log('Branding passed: four languages, native version, no public sample-data control and safety disclosures.');
