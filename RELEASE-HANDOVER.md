# LQADWA 0.11.0-rc1 — release handover

27 September 2026. Android first; no Play Store or App Store submission.

A signed, hosted **release candidate for controlled testing**, not clinical/legal certification or a comprehensive security guarantee. Do not advertise fictional availability as real pharmacy stock.

## Implemented

- Shared persistent Cloudflare D1 database, 18 application tables, additive migrations through `0008`, indexed ownership/status queries.
- Server-enforced patient/pharmacy/admin access. No public administration option; `/operations` requires an approved admin identity. Changing a URL or submitting `role: admin` cannot grant access.
- Only the configured owner creates one-use admin invitations and revokes delegated admins. Admins manage pharmacy approval/rejection/suspension, account suspension, pharmacy details and inventory visibility, without unrestricted patient-location browsing.
- Pharmacies are invisible to real searches until approved. Suspension atomically cancels active bookings, invalidates availability replies and removes arrival points. Human license verification is still required.
- Native Android UI (Java/Material + MapLibre, not a website wrapper), OCR/QR, bookings, foreground location and walking/driving routes. Transit opens external navigation, subject to coverage.
- Android compile/target API 36, min API 23, versionCode 4. Dedicated release signing key, no release fallback to the debug key.
- Confirmed account deletion on Android and web; scoped, paginated data export. Closure removes account-owned active data, revokes phones and cancels bookings at a closed pharmacy. Owner self-deletion is blocked.
- Request-size/content-type checks, same-origin browser mutations, bounded queries, rate limits, hashed server tokens, encrypted Android tokens, expiration cleanup.
- `/privacy` and `/account-data`, support contact `abdelkarim.douadjia@gmail.com`. Legal business identity/address was not supplied and is not invented.
- Patients remain free. Pharmacy subscription: 300 DA/month, waived through 30 September 2027. No payment collection or medicine delivery.

## Checks actually passed

| Check | Result |
| --- | --- |
| TypeScript and production web build | Passed with updated dependencies |
| Full npm audit | 0 reported vulnerabilities at verification time |
| `scripts/smoke-test.mjs` | Auth, consent, input validation, idempotency, concurrent reservation, persistence, expiry timestamp, pickup and cancellation guards |
| `scripts/role-smoke.mjs` | Approval/suspension, stock CRUD, replies, bookings, opt-in approach, collection, invitation replay |
| `scripts/security-smoke.mjs` | Device code/proof/origin checks, one-use exchange, revocation, role isolation and root protection |
| `scripts/release-smoke.mjs` | Cross-account access, hidden pickup codes, input limits, suspension cancellation, export, deletion, stale-account prevention and pickup throttling |
| Migration generation | Schema matches committed migrations |
| Local backup/restore | Consistent SQLite snapshot, isolated restore, integrity/FK checks |
| Android Gradle | `assemblePilot assembleRelease bundleRelease` passed |
| Release ARM64 APK | Signature and `zipalign -P 16` verification passed |
| 64-bit native ELF libraries | All 6 ARM64/x86-64 libraries passed 16 KB alignment checks |
| AAB signing | `jarsigner -verify` passed; normal self-signed Android upload certificate |

Destructive tests use **localhost and fictional fixtures only**. No real-user deletion test was run. Local backup verification does not prove hosted recovery. Dependency audit results do not replace independent security testing.

## Android delivery

- Recommended: `/downloads/lqadwa-release.apk` (ARM64).
- Older phones: `/downloads/lqadwa-release-armv7.apk` (ARMv7).
- Legacy debug-signed pilot upgrades: `/downloads/lqadwa-demo.apk`, `/downloads/lqadwa-armv7.apk`. These are not store artifacts.
- Signed store bundle: `android/app/build/outputs/bundle/release/app-release.aab`, local only; it exceeds the hosting per-file asset limit.
- **Uninstall the old pilot before installing the release APK**, then sign in again. Server account data remains; unsaved local input does not. Their signing identities differ.
- Sign-in currently requires ChatGPT; Android confirms linking in a browser. Separate email/password/SMS auth is not implemented.

SHA-256:

| Artifact | Digest |
| --- | --- |
| ARM64 release APK | `fa944dcca9da55b7061190becb58cba4553170cc1dd5e88f4382cdf3932ffadf` |
| ARMv7 release APK | `ef629b90f009498c2e8deffec103f3fdddc203ce6c415ea733f18d6b81fea68b` |
| AAB | `782887b63116069ed58a3d758be6562b10c99e70b67dc60256426a1bca470348` |
| Signing certificate | `013d3b8b49f41d51f17358c586ff4e81a1c7471c31a9e31bbcdbca065896fa7c` |

## Required before broad real-patient launch

1. **Real-device acceptance:** old/current Android and a 16 KB device/emulator; install/upgrade, browser return, rotation/process death, weak network, permissions, camera/gallery, QR, GPS/routing and battery. Compilation/alignment alone does not prove these.
2. **Pharmacist acceptance:** professional-license verification, real names/strengths, stale stock and handover. OCR/catalog matches do not validate prescriptions or treatment. Native OCR supports printed Latin, not Arabic/handwritten prescriptions.
3. **Legal/operator:** supply legal operator identity/address and obtain Algerian pharmacy/data-protection advice, including overseas processing and retention/consent. No regulatory authorization is asserted.
4. **Language/accessibility:** fluent Kabyle review (still beta), screen reader, large text and low-end-phone testing.
5. **Recovery/key custody:** provider-level hosted DB export/restore drill and encrypted off-device signing-key backup with tested recovery. Neither is independently verified yet.
6. **Operations:** quota/load testing, monitoring ownership, incident handling and independent security review. CSP currently constrains embedding/objects/form destinations; it is not a complete nonce-based script policy.

Store data-safety, app-access and health-app declarations must also be completed before submission. iOS is out of this release. See [OPERATIONS.md](./OPERATIONS.md).

Official preparation references: [Android target requirements](https://developer.android.com/google/play/requirements/target-sdk), [16 KB page sizes](https://developer.android.com/guide/practices/page-sizes), [Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [D1 free-limit enforcement](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/).
