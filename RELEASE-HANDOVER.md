# LQADWA 1.0.5 release handover

2 October 2026. Web and signed native Android release 1.0.5, versionCode 10. This release includes authentication layout polish, safer prescription matching, native Android compatibility fixes and repeatable CI checks. No store submission.

## Published links

- Client: https://lqadwa.lqadwa-dz.workers.dev/
- Pharmacy: https://lqadwa.lqadwa-dz.workers.dev/?space=pharmacy#pharmacy
- Private administration: https://lqadwa.lqadwa-dz.workers.dev/operations
- Private owner/admin login: https://lqadwa.lqadwa-dz.workers.dev/operations/login
- Android ARM64: https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release.apk
- Android ARMv7: https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release-armv7.apk

The active deployment is in the owner's Cloudflare account. No paid plan, paid API, domain purchase or payment collection was enabled. Old hosted data remains preserved; old host identities were not silently merged into new accounts.

## Hosting and identity

- Cloudflare Worker `lqadwa`, D1 `lqadwa-production`, ten applied migrations through `0009_admin_permissions`.
- Supabase project `iqbqqlwappehjppupzde`: Authentication and protected sign-in-record deletion. Application data stays in D1.
- Email/password authentication replaces host identity headers. Email confirmation remains required. The verified account for the supplied support email is configured as owner in `APP_ADMIN_IDS`; that configuration is server-only.
- Native Android uses Java/Material views, MapLibre, on-device OCR/QR and encrypted Android Keystore session storage. Email/password sign-in runs inside the app. Account creation/confirmation, recovery and optional device linking use the browser.
- Android search now has an explicit GPS control and sorts from that position; without permission, distances are marked approximate from the selected wilaya centre. Approved pharmacy staff can open a private arrival map for their own active bookings. Shared points disappear after 60 seconds, and expired phone sessions stop GPS and clear private map state. Navigation uses public walking/driving routing; transit opens external navigation and depends on provider coverage.
- Supabase Site URL was corrected from localhost to the public Cloudflare URL. The production callback allowlist is saved as `https://lqadwa.lqadwa-dz.workers.dev/auth/callback**`. Screenshot evidence is under ignored `.cloudflare/qa/auth-redirects.png`.
- Added server-allowlisted Google/Apple PKCE integration and native browser/device linking. Fresh public settings report Google=false, Apple=false; no non-working provider buttons are displayed. Operator credentials and provider acceptance are required. See `AUTH-PROVIDERS.md`.
- Client web/native maps now display a permission-based current location with accuracy, foreground-only updates, recenter, destination address/copy and Google Maps driving/walking/bus/train coverage links. Web destination maps appear before route calculation. Native rerouting replaces old lines and ignores stale map/mode responses. Invalid browser sessions close dialogs and clear position.
- Read-only production counts on 1 October: D1 has zero profiles, registered pharmacies, requests and reservations; Supabase has one confirmed non-anonymous owner. No live records were deleted. Removed the fictional pharmacy names/coordinates from the bundled directory; only a deny-list of legacy sample IDs remains for rejecting old clients.
- Web interfaces use Arabic, French, English and Kabyle. Kabyle medical/legal wording still needs fluent human review.
- Public administration links and synthetic-data controls are removed. Public searches include only approved registered pharmacies. No fictional pharmacy was seeded into the new production database.
- Patient service remains free. Pharmacy price: 300 DA/month, waived through 30 September 2027. In-pharmacy pickup only; no delivery or medicine payments.

## Owner and delegated administration

Open `/operations/login` and use username `admin` or `abdelkarim.douadjia@gmail.com`. The username resolves to the owner email on the server; Supabase still verifies the account password. The dashboard checks the configured owner ID, not an editable display name or user metadata. This private login has no public signup or social-login controls.

The owner password was not changed. The numeric value shared in chat was not installed or hard-coded. Enter a new unique password of at least 12 characters directly in the protected recovery flow, using “Forgot password” and the owner email. Actual email receipt and real-owner login acceptance remain unverified; a local Auth fixture does not prove these external services work.

The owner appears at the top with full administrative permissions. In **Admin team**, enter an administrator's email, select permissions, create a single-use invitation and share the link directly with that recipient. The recipient registers or signs in with that same verified email and their own password. Invitations expire after seven days and cannot grant ownership. The owner can change an admin's permissions, revoke access and invalidate unused invitations.

Permissions separately govern pharmacies/inventory, account moderation, audit history and service totals. The backend checks both reads and writes on every request; changing permissions affects the next request without waiting for JWT refresh. Delegated admins cannot appoint other admins, change their own access, suspend the owner or access prescription images/full text/personal live locations. No new live admin was appointed during implementation.

Before migration, live D1 contained zero delegated admins and invitations. An ignored local SQL backup was saved at `.cloudflare/backups/pre-admin-1.0.4.sql`; the migration only adds permission/email columns. No live records were deleted. The production configuration was checked to exclude the local Auth fixture server.

## Verified

- Authentication branding uses rounded, bordered logo tiles with consistent spacing on web/native screens. Signed-out public navigation does not show an account menu. Mobile web inputs are 48 pixels high with 16-pixel text.
- `scripts/ocr-smoke.mjs` checks exact whole-brand matching, punctuation, duplicate removal, unrecognized text and multi-medicine prescriptions without silently selecting a strength or dropping later brands. `scripts/ocr-engine-smoke.mjs` runs the actual Arabic/French/English Tesseract worker on a synthetic printed prescription and finds both real catalog brands. This does not prove handwriting, camera or physical-phone recognition.
- Native OCR ignores callbacks from a signed-out/replaced session. Launch behavior avoids a duplicate custom splash on Android 12+, uses adaptive launcher assets and rounded legacy branding. Android 16 back handling uses the supported back dispatcher; distance sorting works at the minimum API level. Backup rules exclude app data from cloud/device transfer.
- Signed native 1.0.5 APKs and AAB built successfully. Full Android lint passed with zero errors and eight warnings; warnings include dependency freshness, legacy splash/resource conventions and unused resources, not waived lint errors. Physical-device acceptance is still required.
- Common credential patterns were absent from publishable source and Git history. Private keys, environment files, database exports and local runtime state are excluded. This is not exhaustive secret detection or an independent security audit.
- Live 1.0.5 security headers passed on static pages, application pages and the private admin redirect. A regression gate checks static pages and redirects locally. Cloudflare static header rules complement framework/proxy headers; hiding the admin link is not a security control. Both hosted APK hashes match the signed 1.0.5 artifacts byte for byte.
- TypeScript and production web build pass.
- `scripts/auth-smoke.mjs`: forged headers/cookies rejected, origin enforcement, validation, invalid native login rejected, deletion-proof authentication and safe redirects.
- `scripts/release-smoke.mjs`: patient/pharmacy/admin isolation, stock and booking flows, hidden pickup codes, opt-in arrival sharing, stale-point hiding, immediate consent withdrawal, suspension cancellation, export, account closure, stale-session rejection and pickup throttling. Fixtures are local only.
- `scripts/map-auth-check.mjs`: directions modes/origin, provider allowlist/PKCE, no fictional directory, GPS lifecycle and stale-route guards.
- `scripts/admin-smoke.mjs`: owner username/password verification, email-bound invitation acceptance, single use, metadata privilege denial, scoped reads/writes, immediate permission changes, protected owner and revoked access. This uses an isolated LOCAL synthetic Auth server and local D1; it never creates live users or proves production email delivery.
- `scripts/branding-smoke.mjs`: public wording and four-language/native release checks.
- Production npm dependency audit: zero reported vulnerabilities at verification time. A fresh scan identified the newly indexed [Next.js ImageResponse advisory](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j) and [fast-uri advisory](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj); Next.js/eslint-config-next were updated to 16.3.8 and fast-uri to 3.1.8. This application does not define an ImageResponse handler. Registry signatures/attestations were verified during migration.
- Supabase deletion endpoint rejects unauthenticated/forged callers. Successful Auth deletion needs acceptance with a disposable verified account; no real user was deleted for verification.
- Hosted D1 SQL export restored to a separate local SQLite database; integrity, foreign keys, required tables and migration count pass. Export and restore are under ignored `.cloudflare/backups/`. This does not prove a populated live-cloud disaster recovery drill.
- Android APK signatures, ARM64 16 KB zip alignment, all six ARM64/x86_64 ELF library alignments and AAB signature verification passed for 1.0.5. Self-signed Android upload-certificate warnings are expected; the signing certificate is unchanged.
- Public HTTPS, health release, catalog and unauthenticated administration redirect were verified. `scripts/public-release-check.mjs` passed after deployment, including byte-for-byte SHA-256 matches for both hosted signed APKs.
- Public login DOM/layout inspection confirms no ChatGPT sign-in option or account menu, a 48-pixel rounded logo and 48-pixel inputs at a 375-pixel viewport. Arabic and French had no horizontal overflow. English and Kabyle controls were also inspected. Screenshot capture timed out, so no new screenshot evidence is asserted. This is layout/DOM evidence, not a completed visual screenshot review.
- Fresh public `/operations/login` inspection confirms the private owner/admin identifier/password controls, owner-only delegation explanation and no signup/social-login buttons. The local English private login fits the observed mobile viewport without horizontal overflow.

## Android artifacts

| Artifact | SHA-256 |
| --- | --- |
| ARM64 APK | `a4a66440f41acd6e84e7a3e26afb19b5ab30710fe1ee095119f19e8c383b0309` |
| ARMv7 APK | `58861cc444a2655f8e288891639e4e85c622ddcbfe7ca5926bb109dea39c39fd` |
| Store AAB | `d308b714103aecc659f40952c54ee99eb07b02eaf2c2919bd8ed3adb8ecc19eb` |
| Signing certificate | `013d3b8b49f41d51f17358c586ff4e81a1c7471c31a9e31bbcdbca065896fa7c` |

The signed AAB is local at `android/app/build/outputs/bundle/release/app-release.aab`. Protected signing material remains outside the repository. Previous signed APKs are recoverable under ignored `.cloudflare/previous-apks/`.

## Source and release automation

The owner-authorized private repository is https://github.com/AbdelkarimDouadjia/lqadwa. Source/history and the signed public download packages are included; private signing credentials and database exports are not. Both web and Android jobs passed in the [verified GitHub CI run](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/36972787792). Gates include the web build, production dependency audit, local authentication/role isolation, actual printed OCR and Android build/lint, using pinned actions and read-only repository permissions. The initial Android SDK-discovery issue was corrected by using the Ubuntu 24.04 runner's preinstalled SDK. [Runner SDK inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md).

Manual web deployment automation is included but Cloudflare repository secrets are not configured. A separate least-privilege deployment token must be entered by the owner; the local OAuth session was not copied into GitHub. The workflow does not apply D1 migrations or sign Android packages. No paid plan, paid overage or store publication was enabled.

Public APK buttons derive their cache-version parameter from package metadata. Signed download responses require cache revalidation so existing users can receive release updates.

## Remaining acceptance and operator tasks

1. Public email delivery is not verified. A fresh check on 2 October confirmed “Enable custom SMTP” still off (`Toggle SMTP`, `aria-checked=false`) in the LQADWA project. The owner was asked to enable and save credentials directly in Supabase. Production redirect settings are saved, but public signup, confirmation and recovery still need acceptance using a non-team address. No credentials should be pasted into chat. Prior screenshot evidence is under ignored `.cloudflare/qa/smtp-status.png`; the fresh check is a DOM observation, not a new screenshot.
2. Configure and accept Google/Apple identity providers before claiming these logins work. Apple requires an eligible existing developer account; no paid membership was activated. Google public audience/consent and provider credentials are operator tasks.
3. Install on actual supported phones and verify login, upgrade, camera/gallery, printed-prescription OCR, QR pickup, GPS/routes, foreground arrival sharing and weak-network behavior. No physical-device acceptance was completed here. Native OCR supports printed Latin; handwriting/Arabic recognition is not guaranteed. Catalog matches do not validate a prescription.
4. Supply the legal operator identity/address and obtain the required local pharmacy/data-protection review before broad real-patient operation. No approval or clinical certification is asserted.
5. Complete fluent Kabyle review, hosted recovery operations, portable encrypted signing-key backup and independent security/load review. Free service quotas and public map/transit coverage remain real constraints.
6. Supabase's security advisor reports built-in leaked-password protection disabled. That feature requires Pro; it was not enabled because the owner requires free plans. The app enforces 12-character new passwords and request rate limits. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Public pages use normal release branding. Presentation changes are not evidence that the remaining acceptance tasks passed. iOS is deferred. Play/App Store publication remains for the owner after acceptance.
