# LQADWA

LQADWA connects people in Algeria with registered, independently approved pharmacies for medicine availability and in-pharmacy pickup. The web application supports Arabic RTL, French, English and Kabyle. The Android application uses native Material views and MapLibre, not a WebView.

There is no medicine checkout, delivery, commission or guaranteed synchronized stock. Patients use the service free of charge. The displayed pharmacy subscription is 300 DA/month, waived through 30 September 2027; billing is disabled.

## Published access

- [Client](https://lqadwa.lqadwa-dz.workers.dev/)
- [Pharmacy](https://lqadwa.lqadwa-dz.workers.dev/?space=pharmacy#pharmacy)
- [Private owner and admin login](https://lqadwa.lqadwa-dz.workers.dev/operations/login)
- [Android ARM64 APK](https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release.apk)
- [Android ARMv7 APK](https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release-armv7.apk)

Hosting uses the owner's Cloudflare Worker and D1 database on free plans. Supabase provides authentication. No ChatGPT login or hosting is used. Source is held in the owner's [GitHub repository](https://github.com/AbdelkarimDouadjia/lqadwa). Repository visibility is independent of protected application access.

## Roles and privacy

Patients confirm their email, search by medicine/location, request availability, reserve after pharmacy confirmation and present a pickup QR/code. Pharmacy registration requires administrative approval. Pharmacists answer requests, manage optional private stock notes, verify pickup codes and mark collection only after checking the original prescription when legally required.

Administration is not advertised in public navigation. The owner is identified by a server-side stable-ID allowlist. Owner login accepts `admin` or the configured owner email and verifies the actual Supabase password. No shared password or public admin signup exists. The owner creates email-bound, seven-day, single-use invitations with scoped permissions, and can edit or revoke delegated access. Every administrative read/write is checked on the server.

Prescription images and full extracted text stay on the device. OCR produces editable text and possible catalog matches, not prescription validation or dosing advice. Users must check the medicine and strength themselves. Browser OCR supports Arabic/French/English models; native Android supports printed Latin. Handwriting is unreliable. No patient prescription images are collected for administrators to inspect.

## Maps and catalog

Maps show registered approved pharmacy pins and a permission-based current position. Walking/driving route previews use public OpenStreetMap/FOSSGIS services. Google Maps links support external navigation and transit/train options where coverage exists. No live traffic, complete Algerian transit coverage or public-map availability guarantee is claimed. Arrival sharing is optional, coarse, foreground-only and restricted to the assigned pharmacy; stale positions disappear.

The bundled medicine reference comes from the ministry's August 2026 nomenclature; see `scripts/import-medicines.py`. Catalog presence does not confirm present stock, prescription validity or suitability. The geographic reference source and licenses are retained in the project. Pharmacies supply their own coordinates. The generated logo and IBM Plex Sans Arabic fonts are bundled with their attribution/license information; the brand is not trademark clearance.

## Local verification

Use Node.js 24. Install and run the same web gates used by CI:

```sh
npm run install:ci
npm run check
npm run lint
npm audit --omit=dev --audit-level=high
npm run build
npx --no-install playwright install chromium firefox webkit
npm run test:e2e
npm run test:ocr
```

The integration command applies migrations to local D1, starts an isolated localhost Worker, runs synthetic account/role checks and stops it. Port 5173 must be free. Fixtures never run against production. OCR verification renders a synthetic printed image in memory and runs the shipped Tesseract models; it is not a physical-phone camera test.

`test:e2e` includes those integration checks plus isolated Chromium/Firefox/WebKit tests. Browser artifacts are under ignored `.cloudflare/e2e/`; the Auth stub stays responsive during browser login. The layout matrix covers guest/client/pharmacy/owner, four languages, both themes and eight widths. Axe is an automated check, not screen-reader or WCAG certification. Linux CI installs browser OS dependencies with `--with-deps`. Use `test:integration` for an API-only run.

Guests receive server-rendered landing content and a paginated approved-pharmacy directory without an Auth lookup. `?lang=ar|fr|en|kab` supplies indexable language variants; private `?space=…` and legacy app fragments keep their journeys. Pharmacy distances in the public directory are explicitly approximate from the wilaya centre. No stock availability is inferred from a listing; requests and pickup reservations require a verified account.

For ordinary local development, build once, apply local migrations with `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/wrangler-dist/cli.js d1 migrations apply DB --local --config dist/server/wrangler.json --persist-to .wrangler/state`, then run `npm run dev`. Configure development authentication separately. Never deploy local fixture identities or the local Auth server URL.

## Android distribution

Use Java 17+, Android SDK 36, build-tools 35.0.0 and Gradle 8.13. On the owner's Windows machine, `./scripts/build-android.ps1` builds signed release APKs and an AAB using protected signing material outside the repository. CI compiles and runs Android lint without signing credentials; its unsigned packages are not distribution downloads. See `OPERATIONS.md` for signing custody and recovery.

The app includes branded launch behavior, native email/password sign-in, medicine search, reservations, QR/OCR, pharmacy operations, GPS/maps and foreground arrival sharing. Account confirmation/recovery, optional provider/device linking and the private admin console may open the browser. No background location collection or iOS build is included.

## CI and deployment

`.github/workflows/ci.yml` runs web checks, local role/security checks, actual OCR and Android build/lint. Actions are pinned and repository permissions are read-only. `.github/workflows/deploy.yml` is manual and requires separately configured, least-privilege Cloudflare repository secrets. It does not change database schema or expose signing material. No paid runner or hosting plan was activated.

Production migrations are managed separately, with a backup first. Deploy a verified web build using `wrangler deploy --config dist/server/wrangler.json`, then run `node scripts/public-release-check.mjs` to check public headers/endpoints and exact hosted APK hashes.

## Launch requirements

See `RELEASE-HANDOVER.md`, `OPERATIONS.md`, `AUTH-PROVIDERS.md` and `RELEASE-CHECKLIST.md`. Before broad patient use, verify public confirmation/recovery email receipt, actual supported Android phones, independent pharmacy licenses, legal operator details and Algerian pharmacy/data-protection requirements, fluent Kabyle wording and recovery procedures. Google/Apple buttons remain hidden until configured and accepted. No paid provider enrollment was purchased. Free service quotas and public routing limits still apply. Passing automated checks is not clinical, legal or complete security certification.
