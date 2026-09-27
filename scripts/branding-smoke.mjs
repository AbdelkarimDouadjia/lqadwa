// Public branding stays separate from demo-data and medical safety disclosures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
assert.ok(read('app/page.tsx').includes('t(demoMode ? "demo" : "serviceRegion")'));
assert.ok(read('app/page.tsx').includes('t(demoMode ? "pilotNote" : "pickupOnly")'));
assert.ok(read('app/privacy/page.tsx').includes('n’a pas été validée par un relecteur kabylophone'));
assert.ok(read('android/app/build.gradle').includes("versionCode 5; versionName '0.11.1'"));
assert.doesNotMatch(read('android/app/src/main/java/dz/lqidwa/pilot/MainActivity.java'), /android\.webkit|new WebView/);
console.log('Branding passed: four languages, native version, real/demo separation and safety disclosures.');
