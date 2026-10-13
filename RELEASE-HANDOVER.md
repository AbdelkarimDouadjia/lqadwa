# LQADWA 1.0.8 release handover

## Experience expansion — 13 October 2026

Deployed Cloudflare version `f5143068-ed15-442c-b678-36add0fe89c7`, source `8ef54768f0986cef65e1b5adaad813fe53d8d162`. Both web and Android jobs passed in [CI run 38428260172](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/38428260172). Public release checks passed for release/experience markers, HTTPS/security headers, protected admin/profile/stock endpoints, catalog and both exact signed APK download hashes. The website and downloads remain on the existing free Cloudflare services.

Web and native Android 1.0.8 (versionCode 13) add client distance/name/saved-pharmacy filters, recent booking/request tracking filters, local display/refresh preferences and an approved-pharmacy inventory workspace. Stock paging searches the complete inventory, with low/out/in-stock filters, sorting, threshold, item rename/quantity/deletion, +1/−1 and current-page CSV export. Existing-entry changes reject stale timestamps and SQL writes recheck approval/ownership. The public landing page has a branded vector/CSS illustration, service workflow/benefits, pharmacy pricing, FAQ and working account/Android links. Public promotion does not change geographic pharmacy ranking or add paid drug/pharmacy advertisements. UI/UX guidance informed progressive controls, mobile targets, semantic theme colors and reduced motion; no raster image generation or additional dependency was needed.

Local integration passed with stock isolation, 51-entry paging, filtering, duplicate rejection and stale quantity/deletion tests. Pure checks cover pharmacy filters, true request/booking states and spreadsheet formula escaping. Signed APK/AAB builds and Android lint passed (zero errors, eight warnings); both APK signatures and ARM64 zip alignment passed. Physical-phone acceptance remains outstanding. Browser capture timed out, so screenshots are not evidence for this release. No live patient/pharmacy fixture was created and no database migration is required.

Browser DOM review caught and removed the obsolete signed-out CSS rule that hid the landing page. Fresh review confirmed the English sections, working Arabic language/FAQ controls, RTL and a single-column mobile layout without horizontal overflow. The requested 375-pixel override reported an actual 416-pixel viewport; this is observed layout evidence, not exact 375-pixel or screenshot acceptance. The local preview was stopped after review and integration fixtures were cleaned up.

1.0.8 SHA-256: ARM64 `f545a7ce37d75f89c79adcda4f86cff1a9ebd81083d0d3d0266bd5027c07cdc9`; ARMv7 `ba26edc45bfca3a2d5ffd6ae1ee9d57347ace980be2803f19700cce493804be2`; AAB `d95841bfc9da5a911ab4c28749614bcb276af2e7af9020a4b217b1c8904d319a`. Previous 1.0.7 APKs are preserved under ignored `.cloudflare/previous-apks/1.0.7/`.

## Profile expansion — 12 October 2026

Completed deployment on 13 October 2026: Cloudflare version `9e8200cb-7be7-43ce-b2b4-e36fe9582f98`, source commit `7be450e70cecabd7fc4965a180392bc9a4dc3d4a`. Both jobs passed in [CI run 38421472052](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/38421472052), including signup name initialization, optional-field validation, consent/owner/delegate isolation, medical-edit rejection, export/erasure, legacy save preservation and pharmacy detail changes. Public release checks passed for HTTPS, protected profile/admin endpoints, catalog and exact signed APK download hashes. Migration `0011_profile_details.sql` is installed (twelve migrations); a private pre-migration export is at `.cloudflare/backups/pre-profile-details-2026-10-12.sql`. No live users or health notes were fabricated or edited for testing. Hosted APKs are 1.0.7; signup/browser/API completion required no further native binary change.

Web and native Android 1.0.7 (versionCode 12) add separate first/last names, optional phone/commune/home address/age/profession, client health notes/long-term conditions/allergies, pharmacy contact/accessibility details and owner-visible admin membership details. Health notes are private unless the client explicitly consents to owner access; delegated admins and pharmacies cannot see them. Optional notes can be erased and consent withdrawn. Basic admin edits cannot change medical notes or consent. Export/deletion cover the new fields. Migration `0011_profile_details.sql` is additive and initializes empty values, with no invented user information. Native signed APKs and AAB were built with the unchanged owner-held signing certificate; Android lint and APK signature/alignment checks passed. Physical-phone acceptance has not been performed.

Public signup asks for separate first and last names in all four languages. Confirmed accounts initialize those fields without splitting legacy display names or overwriting existing profiles. Native email sign-in uses the same metadata initialization. Name metadata is never used to grant roles. The existing Supabase [signup metadata API](https://supabase.com/docs/reference/javascript/auth-signup) is retained; health/address/age data remain solely in the application database.

Current 1.0.7 artifact SHA-256 values: ARM64 `b6d8627313d06fe46f66e88b56b338bdebb585171eefa4ff855adbc454594258`; ARMv7 `a1e7a0627c35c174f7a4542746cfe68242d4bfe34b2e98aaa60c4a57457d5647`; AAB `5989bb70bed39951c125e71d4cdbe26f11946167de188f2c962d186c177f33f6`. Previous 1.0.6 APKs are preserved under ignored `.cloudflare/previous-apks/1.0.6/`. The older release evidence below is retained as history.

12 October 2026. Web and signed native Android release 1.0.6, versionCode 11. This release separates guest, client, pharmacy and administrative journeys. No store submission or paid service was enabled.

Previous 1.0.6 Cloudflare deployment version: `ec63e22c-ab15-4ada-adcb-9a3619cdf06b`, including the management expansion and migration below. The production deployment uses the real Supabase configuration, not the local authentication fixtures. The preceding journey-only deployment was `19aa064f-0d19-45d5-bdf9-7e6e324b2613`.

Post-deployment public checks passed on 12 October: release 1.0.6, HTTPS/security headers, public wording, protected administration redirect, rejected forged identity, real medicine catalog, and both hosted APKs matching the signed local SHA-256 hashes. Download checks allow two minutes for each approximately 20 MB package; the initial 30-second check timed out on a download before this adjustment.

GitHub visibility was found public during verification, contrary to earlier documentation. With explicit owner approval, the repository was made private on 12 October and `isPrivate: true` was verified. Website and APK access remain public through Cloudflare. Previously downloaded public source cannot be recalled. No paid plan was enabled; private-repository CI remains subject to the account's free Actions allowance.

## Changes and verification in 1.0.6

### Management expansion — 12 October 2026

Deployed source commit `639931e9ef39f586ce4344e4db2dc111967f4101`. Both web and Android jobs passed in [CI run 38306983314](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/38306983314), including integration, OCR, dependency audit, build and Android lint checks. Post-deployment `scripts/public-release-check.mjs` passed: the management release marker, protected admin API, HTTPS/security headers, authentication isolation, catalog and both signed APK download hashes were verified. No APK reinstall is required for this web dashboard expansion.

The private dashboard now has paginated Users, Pharmacies, Inventory, Requests, Reservations and Audit sections; real service totals and a 14-day UTC trend; profile editing, pharmacy creation/editing/review/suspension, inventory CRUD, request stopping, reservation cancellation, and owner-only pause/announcement controls. Only owners automatically receive the new `operations` permission. Delegated grants remain explicit. The UX review guided progressive sections, required reasons and labelled confirmations; obsolete limited record panels were replaced rather than duplicated.

Accounts/pharmacies are suspended rather than destructively erasing history. Passwords, sign-in identities, pickup codes, raw prescriptions and patient GPS remain protected; the audit trail is read-only. Signup remains verified self-service. The app still has no online medicine sales or payment processing. See the expanded management instructions in `OPERATIONS.md`.

Migration `0010_service_controls` was applied after a private database export; eleven migrations are now installed. Both production pause flags were verified off. Isolated integration checks cover CRUD, unauthorized/scoped access, stale edits, request/booking cancellation, notifications/location cleanup, and direct database enforcement of pickup pauses. Browser review confirmed owner navigation, live fixture statistics, the user-edit dialog and service controls. The observed mobile layout had no horizontal overflow. Screenshot capture timed out, so pixel-perfect visual acceptance is not claimed. No live user record was edited to test these controls. Android binaries remain 1.0.6; authorized Android admins already open this protected web dashboard.

- Guests see onboarding, not disabled workspaces. Clients have Search, Requests, Map and Account; pharmacy users have Pharmacy and Account; administrators have Operations and Account. Pharmacy onboarding is a deliberate secondary action for clients. Native administration opens the protected web dashboard from an authorized account.
- Approved pharmacy work is divided into Requests, Pickups and Stock on web and Android. Pending/suspended applications show their status, not a resubmission form. The API also rejects changes to pending/approved/suspended applications, including a concurrent-approval race.
- Administration filters applications by status. Permission-specific dialogs close or disappear when access changes. Empty filtered lists explain that there are no matching records.
- Location remains opt-in. Web arrival sharing stops when the page is hidden or left; stale arrival markers expire locally. Late native location callbacks are ignored after navigation or logout. Expired staff bookings do not offer pickup, and stock deletion requires confirmation.
- Rounded logo sizing, less installation text, role-specific page titles, and fewer repeated navigation controls follow the UX review. No framework migration or new dependency was needed for these changes.
- TypeScript, source security checks, role navigation matrix, booking/auth/admin integration and production web build pass. Actual printed OCR passed on 11 October; this is not handwriting or phone-camera acceptance. Android release build and lint: zero errors, eight warnings. Signatures, ARM64 alignment and six native-library 16 KB checks pass.
- Local browser sign-in and navigation were exercised for client, pharmacy and owner. Mobile client/pharmacy layouts had no horizontal overflow. Browser screenshot capture timed out, so no fresh pixel-based visual acceptance is claimed. Temporary fixtures stayed local.
- Production dependency audit reports zero vulnerabilities after updating sharp to 0.35.5 and source-map-js to 1.2.2. Upstream advisories: [sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).

The older verification details below are retained as historical evidence, not as a substitute for physical-device, email-delivery or legal acceptance. Those outstanding operator tasks remain at the end of this document.

## Published links

- Client: https://lqadwa.lqadwa-dz.workers.dev/
- Pharmacy: https://lqadwa.lqadwa-dz.workers.dev/?space=pharmacy#pharmacy
- Private administration: https://lqadwa.lqadwa-dz.workers.dev/operations
- Private owner/admin login: https://lqadwa.lqadwa-dz.workers.dev/operations/login
- Android ARM64: https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release.apk
- Android ARMv7: https://lqadwa.lqadwa-dz.workers.dev/downloads/lqadwa-release-armv7.apk

The active deployment is in the owner's Cloudflare account. No paid plan, paid API, domain purchase or payment collection was enabled. Old hosted data remains preserved; old host identities were not silently merged into new accounts.

## Hosting and identity

- Cloudflare Worker `lqadwa`, D1 `lqadwa-production`, twelve applied migrations through `0011_profile_details`.
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

Permissions separately govern pharmacies/inventory, account moderation, audit history, service totals and request/reservation operations. Global service pauses remain owner-only. The backend checks both reads and writes on every request; changing permissions affects the next request without waiting for JWT refresh. Delegated admins cannot appoint other admins, change their own access, suspend the owner or access prescription images/full text/personal live locations. No new live admin was appointed during implementation.

Before migration, live D1 contained zero delegated admins and invitations. An ignored local SQL backup was saved at `.cloudflare/backups/pre-admin-1.0.4.sql`; the migration only adds permission/email columns. No live records were deleted. The production configuration was checked to exclude the local Auth fixture server.

## Previous release verification (1.0.5)

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

## Android artifacts (1.0.8)

| Artifact | SHA-256 |
| --- | --- |
| ARM64 APK | `f545a7ce37d75f89c79adcda4f86cff1a9ebd81083d0d3d0266bd5027c07cdc9` |
| ARMv7 APK | `ba26edc45bfca3a2d5ffd6ae1ee9d57347ace980be2803f19700cce493804be2` |
| Store AAB | `d95841bfc9da5a911ab4c28749614bcb276af2e7af9020a4b217b1c8904d319a` |
| Signing certificate | `013d3b8b49f41d51f17358c586ff4e81a1c7471c31a9e31bbcdbca065896fa7c` |

The signed AAB is local at `android/app/build/outputs/bundle/release/app-release.aab`. Protected signing material remains outside the repository. Previous signed APKs are recoverable under ignored `.cloudflare/previous-apks/`.

## Source and release automation

The owner-authorized private repository is https://github.com/AbdelkarimDouadjia/lqadwa. Source/history and the signed public download packages are included; private signing credentials and database exports are not. Release 1.0.6 source commit `6b61b92` passed both web and Android jobs in the [verified GitHub CI run](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/38250757816). Gates include the web build, production dependency audit, local authentication/role isolation, actual printed OCR and Android build/lint, using pinned actions and read-only repository permissions. The initial Android SDK-discovery issue was corrected by using the Ubuntu 24.04 runner's preinstalled SDK. [Runner SDK inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md).

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
