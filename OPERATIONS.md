# LQADWA operations — owner handover

## Expanded management dashboard (12 October 2026)

Use `/operations` with an authorized account. The owner has every management permission. Delegated admins only see granted sections; grants are checked again server-side on every request. The new `operations` permission is required for request/reservation lists and interventions. Existing delegates do not receive it automatically. Service-wide settings remain owner-only.

- **Overview:** current registered profiles, approved/pending pharmacies, suspended accounts, requests and reservations in the last 30 days, reservation outcomes, stock entries, and a 14-day UTC activity table with proportional bars. Live database aggregates, not fabricated analytics or sales revenue.
- **Users:** paginated search, edit display name/wilaya, suspend/reactivate. Signup uses the user's own verified identity. Passwords and sign-in email are not editable here; protected owner/admin accounts retain existing safeguards.
- **Pharmacies:** create a pending record for an existing registered account (requires pharmacy and account permissions), edit address/contact/license/coordinates/hours/duty, approve/reject, or suspend/hide. Suspension cancels active pickups and removes shared arrival positions. Reapproval does not restore cancelled reservations.
- **Inventory:** add, edit and delete entries, including pharmacy reference and quantity. This does not assert clinical suitability or automatically promise availability.
- **Requests and reservations:** paginated operational records, stop a request or cancel an active reservation. Stopping blocks later replies/reservations and notifies affected users. Codes, prescription images/full OCR text, authentication secrets and patient GPS are not exposed. Completed pickups cannot be fabricated, reset or deleted.
- **Service controls:** independently pause new requests/reservations or pickup confirmation, plus a public notice. Account/support/cancellation remain available. Existing reservations retain their original expiry. Database triggers enforce pauses even against older or in-flight clients.
- **Audit:** searchable, paginated, read-only history. Sensitive edits require a reason; pharmacy approval follows the existing audited workflow. Stale pharmacy/settings edits are rejected. Account/pharmacy removal uses suspension, not destructive historical deletion. Patient self-service data deletion remains separate.

Migration `0010_service_controls.sql` is additive; its defaults leave both pauses off. Apply it before deploying the new Worker. A production export was saved outside Git at `.cloudflare/backups/pre-admin-management-2026-10-12.sql`. Never seed production with integration fixtures. D1 batching provides transactional changes: [Cloudflare documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).

## Access and costs

The website is deployed to the owner's Cloudflare Worker at https://lqadwa.lqadwa-dz.workers.dev, backed by D1 `lqadwa-production`. Supabase provides email/password authentication and protected sign-in-record deletion. No paid subscription, paid API, credit card, SMS gateway, domain purchase or payment processor was activated. Maps/routing use public OpenStreetMap/FOSSGIS services. Free plans have quotas and do not promise indefinite availability.

Cloudflare D1 Free documents 5 million rows read/day, 100,000 rows written/day, 500 MB/database and 5 GB total storage. Index maintenance also counts as writes. Exceeding free daily query limits can fail requests until reset. Monitor both Cloudflare and Supabase dashboards before widening access. [Pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [Limits](https://developers.cloudflare.com/d1/platform/limits/).

Search fan-out is bounded to 25 eligible pharmacies in the selected area; dashboard lists are bounded. Visible web screens poll every 30 seconds. Android pharmacy polling preserves focused input. Public routing/tiles have no guaranteed SLA. National-scale load testing and reporting are not claimed.

## Administration

- `/operations` requires server-verified admin identity, not just knowledge of its URL.
- `APP_ADMIN_IDS` is the server-only allowlist of stable user IDs. An email alone does not grant admin rights. Never expose this setting/session credentials in public JS.
- Root invitations expire after seven days and are single-use. Share each privately with its intended recipient, never alongside public app links.
- Root can revoke admins/pending invitations. Delegated admins cannot remove/suspend root or promote admins.
- Verify professional license and physical location independently before pharmacy approval; submitted form data is not verification.
- Never request passwords, prescription photos or diagnoses via the support email.

## Backup and recovery

`python scripts/backup-restore-smoke.py` tests a consistent snapshot and isolated restoration of the **local fixture SQLite database**. Ignored output under `.sites-runtime/db-restore-*` is never published.

The new hosted D1 export was restored into isolated local SQLite on 30 September 2026; integrity, foreign keys and migration count passed. `python scripts/verify-db-export.py <export.sql>` repeats this check without touching the live database. Private exports belong under ignored `.cloudflare/backups/`, never public assets or Git. Before broad operation, also rehearse provider-level recovery with representative data and record recovery time. Do not restore over live data without an outage/reconciliation plan.

Migrations in `drizzle/` are additive/versioned. Never edit a deployed migration. Back up before destructive changes. Web-version rollback does not roll back D1 data/schema.

## Health, incidents and retention

- `/api/health` returns status/release after a harmless DB query or 503; no private rows/credentials. Cache 30 seconds. No external monitoring subscription was created.
- `/privacy` is public; `/account-data` requires identity for export/deletion. Native Android also has confirmed application-data deletion; finish removing sign-in records through the account-data page. The protected Supabase function verifies the caller and D1 closure, and cannot delete the configured owner. Closed identities cannot be reopened through stale sessions.
- Phone sessions: 7 days. Pairing links: 10 minutes. Reservations: 2 hours. Booking availability confirmation: 30 minutes.
- Arrival sharing is optional, foreground only, coarse coordinates, assigned approved pharmacy only, active bookings only. Points disappear after 60 seconds without update; old points are cleared during activity-driven cleanup. Global cleanup runs at most once/15 minutes when requests arrive, not on an exact clock during inactivity.
- Account closure removes active account data and revokes phones. A hashed closure identifier and existing suspension flag remain against automatic recreation/suspension evasion. Provider backups have separate retention.
- Incident response: suspend affected accounts/pharmacies; revoke sessions/invites; preserve a minimal access-restricted incident record; contact the operator and assess notification obligations with qualified advice. Never publish patient records/tokens in logs/chat.

## Build and signing custody

Use Node 24 LTS, JDK 17+, Android SDK 36, build-tools 35.0.0, Gradle 8.13. The build script uses `.sites-runtime/android-tools/gradle-8.13`; install the official distribution there on a clean machine or adjust that path.

Private signing key: `C:\Users\pc\.lqadwa-signing\upload.keystore`. Password file: `password.dpapi`, encrypted to this Windows user. Access is restricted to that user and SYSTEM. Neither file is included in source, the website or APK.

**DPAPI is not a portable backup.** Copying the password file alone to another PC cannot recover the password. Arrange encrypted owner-controlled key/password recovery while this Windows account is available. Do not email keys, upload them to the Site or paste passwords in chat. Loss may prevent APK updates. Decide Play App Signing custody before store upload.

Set `JAVA_HOME`/`ANDROID_HOME`, then run `./scripts/build-android.ps1`. Do not create a replacement key because the current one cannot be read. Verify signatures/hashes and run `python scripts/verify-native-pages.py` on ARM64/x86-64 release APKs before distribution.

## Repeatable verification

Run `npm run check`, `npm audit --omit=dev --audit-level=high`, `npm run build`, `npm run test:integration` and `npm run test:ocr`. Integration applies local migrations and manages its isolated localhost Worker/Auth fixtures; port 5173 must be free. Destructive checks are hard-coded to localhost. Never deploy the local owner override or fixture accounts. Earlier `smoke-test`, `role-smoke` and `security-smoke` scripts retain previous-provider assumptions; use the current suites for this migration.

Publish with `wrangler deploy --config dist/server/wrangler.json` after a successful production build. Run `scripts/public-release-check.mjs` to check the public endpoint and exact APK downloads without creating/deleting live accounts. No further deployment to the former host is authorized.

Supabase email confirmation stays enabled. Set the Site URL to the public Cloudflare address and allow `https://lqadwa.lqadwa-dz.workers.dev/auth/callback**`. Custom SMTP needs owner-entered credentials; confirm email delivery to a non-team address before opening signup broadly. Built-in leaked-password protection is a Pro feature and remains disabled under the free-plan constraint; see [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Keep the lockfile, review advisories and rerun tests after updates. Focused overrides pin patched image-size under vinext and patched esbuild under Drizzle's legacy loader; migration generation and production build passed with them. Zero audit findings is not a penetration-test result.

## Private repository and CI

Source is held in the private repository https://github.com/AbdelkarimDouadjia/lqadwa. On 12 October 2026, a check found it public despite earlier documentation; it was changed to private with explicit owner approval and GitHub confirmed `isPrivate: true`. This does not recall any copies made while it was public. Cloudflare website and APK access remain public. Repository visibility does not authorize application administration. Keys, environment files, database exports and local runtime state are excluded. The common-credential scan checks publishable source; `node scripts/source-security-check.mjs --history` also checks committed patches. This is a useful leak check, not exhaustive secret detection.

The Release checks workflow runs on main-branch pushes, pull requests and manual dispatch. It validates web source, dependency audit, local authentication/role isolation, actual printed OCR and native Android build/lint. GitHub Actions use pinned versions and read-only repository permissions. Signed distribution packages remain built under owner-controlled key custody, not from unsigned CI output.

The Publish verified web release workflow is manual and restricted to main/master. Configure a separate Cloudflare API token with only the necessary deployment permissions as repository secret `CLOUDFLARE_API_TOKEN`, and the non-secret account identifier as `CLOUDFLARE_ACCOUNT_ID`. Do not reuse/export the local OAuth session. Configure environment approval controls if supported by the current free GitHub plan; none is claimed automatically. The workflow does not migrate D1 or sign Android releases. Free private-repository Actions minutes are finite; review usage and never enable paid overages without owner approval.
