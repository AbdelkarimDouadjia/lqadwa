# لقى دوا — LQADWA

An Algerian pharmacy-orientation pilot in Arabic RTL, French, English and draft Kabyle. Patients request medicine availability, verified pharmacists answer, and a two-hour pickup code/QR is issued. There is **no in-app medicine sale, delivery, prescription upload, or promise of live stock**. Patients are always free. The pharmacy subscription is shown as 300 DA/month, waived through September 30, 2027; billing is not enabled.

## Spaces

- **Patient:** sign in with ChatGPT, search by medicine and wilaya, inspect verified pharmacies on an OpenStreetMap map, scan a medicine box with on-device OCR, request availability, reserve after pharmacist confirmation, cancel, and show the pickup QR/code in person.
- **Pharmacy:** sign in, submit license/contact/location for admin review, answer availability requests, manually maintain an optional stock list, switch duty status, and collect only after seeing the original prescription when legally required and verifying a valid pickup code. Stock entries are private to the pharmacy and are **not** automatically published as guaranteed availability.
- **Admin:** pre-authorized by `APP_ADMIN_IDS`, reviews pharmacy applications and can approve, reject, suspend, or reactivate. Do not approve a pharmacy without independent license/identity verification.

The application supports all 69 wilayas established by Algerian law 26-06 (2026). The geographic reference list is derived from [Mohamed-gp/algeria_69_wilayas](https://github.com/Mohamed-gp/algeria_69_wilayas), MIT. Wilaya capital coordinates only center the map; registered pharmacies supply their own pin coordinates. OpenStreetMap tiles require attribution and are a best-effort public service, not a guaranteed production SLA. OCR uses Tesseract.js in the browser; downloaded model files need connectivity on first use. QR encoding/decoding is browser-side.

## Run locally

Use Node.js 22.13+ or 24+. Node 23 has dependency engine warnings. Install dependencies with `npm ci`, then:

```powershell
node scripts/run-framework.mjs build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_fresh_peter_quill.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_cool_iron_lad.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_dusty_young_avengers.sql
node scripts/run-framework.mjs dev
```

Apply each D1 migration **once** to an empty local database. Production migrations are applied separately by the hosting workflow. Local sign-in is available only in the portable development profile at `/signin-with-chatgpt?return_to=/`; it uses a mock account and is not production authentication.

```powershell
node scripts/smoke-test.mjs
node scripts/role-smoke.mjs
node node_modules/typescript/bin/tsc --noEmit
```

The role smoke test creates and suspends a conspicuously fake pharmacy in the **local** DB. Never run it against a live service.

## Launch boundaries

- There is no public API for actual pharmacy inventory in this project. A pharmacy responds to each request and can update its own optional stock notes. Do not call this real-time synchronized inventory.
- Admin authorization needs an account-ID allowlist in `APP_ADMIN_IDS`; admin sign-up is intentionally not public.
- Before public launch: obtain regulatory/legal review in Algeria, perform independent pharmacy identity/license verification, agree on service and data-protection terms, establish operational monitoring and support, and replace the free public map tile service with a production-appropriate provider or a compliant hosted tile stack at scale.
- Fictional pharmacies are visible only with the explicit demo toggle (`?demo=1`). Their automatic responses and bookings are demonstrations. They are never routed to for actual pickup. Real mode shows only admin-approved registrations.
- No medicine photos or prescription files are sent to the server for OCR. The only patient search data stored is the medicine name and selected wilaya; avoid entering diagnosis/personal health details in that field.

The generated LQADWA logo is `public/brand/luqya.png`, paired with the Arabic wordmark in the UI. The name is a working brand, not a trademark clearance. IBM Plex Sans Arabic fonts in `public/fonts/` use the IBM Plex OFL license.

## Mobile pilot and navigation

`android/` builds a signed hybrid pilot APK with a native animated launch screen and Android Browser Helper (Trusted Web Activity). The application shares authentication, camera-file upload, geolocation and database with the web version. `?app=1` uses the compact application layout and hides web installation panels. A supporting browser such as Chrome is required. Full-screen display requires the deployed `/.well-known/assetlinks.json` to match the signing certificate and package. Authentication may show browser controls on the identity-provider origin. Internet is required; offline mode displays a reconnect screen and never caches patient records. No background location tracking, offline medicine inventory or push notifications are claimed. Android 6+ is supported; this pilot is not a fully native rewrite or a Play Store release.

Build with Java 17+, Gradle 8.6 and Android SDK 34: set `ANDROID_HOME`, then `gradle -p android assembleRelease`. The release pilot uses the local Android debug signing key; retain that key for pilot updates. Before store distribution, use a dedicated release key and update `.well-known/assetlinks.json` with its SHA-256 fingerprint. No signing keys are committed. Download artifact: `public/downloads/lqadwa-demo.apk`.

Map planning uses FOSSGIS public OSRM car and foot profiles, with explicit location disclosure, manual recalculation, route geometry, estimated time/distance, and an optional device-local live marker. Google Maps links provide turn-by-turn navigation and transit where available. No live traffic or comprehensive Algerian transit coverage is claimed. Public routing is limited to light pilot traffic (provider max one request/second); contract/self-host before scale. Booking approach sharing is opt-in, coarsened to about 100 m, accessible only to the assigned verified pharmacy, and disappears when stale. It runs while the app is open, not in the background.

The medicine catalog is the ministry's August 2026 nomenclature (see `scripts/import-medicines.py`), not a medical or stock verification service. OCR text must be checked against name and dose. Kabyle copy needs native-language review before clinical/public rollout.

Prescription scanning is device-local: Arabic/French/English OCR, progress display, editable extracted text, and possible brand matches against a locally loaded catalog. Full prescription text and images are never submitted or saved. Closing the scanner terminates its worker and clears the text. The patient explicitly chooses a medicine before the ordinary search flow. Handwritten prescriptions are unreliable with Tesseract; no prescription validity, clinical interpretation or dosing recommendations are produced.

Schema migrations `0003`–`0005` add one-time admin invitations and ephemeral approach locations. Apply these once after `0002` in local development; Sites applies them during deployment. Admins are never granted access through a shared demo password; the owner creates one-use invitations from the admin space.
