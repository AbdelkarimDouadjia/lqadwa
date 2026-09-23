# دوائي DZ — Dawa DZ

A trilingual (Arabic RTL, French, English) Algerian pharmacy-orientation pilot. Patients request medicine availability, verified pharmacists answer, and a two-hour pickup code/QR is issued. There is **no in-app medicine sale, pricing, delivery, prescription upload, or promise of live stock**.

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
- The six fictional demo pharmacies are visible **only** to admin/test accounts, labelled as demonstrations, and never routed to for actual pickup. Ordinary users see only admin-approved registrations.
- No medicine photos or prescription files are sent to the server for OCR. The only patient search data stored is the medicine name and selected wilaya; avoid entering diagnosis/personal health details in that field.

The original logo is `public/brand/dawa-symbol.png`, paired with the Arabic wordmark in the UI. IBM Plex Sans Arabic font files are in `public/fonts/` under the IBM Plex OFL license.
