# LQADWA operations — owner handover

## Access and costs

Site hosting and persistent D1 use the existing Sites project. No new paid subscription, paid API, credit card, SMS gateway or payment processor was activated. Maps/routing use public OpenStreetMap/FOSSGIS services. This is not a promise of unlimited free hosting or indefinite availability.

Cloudflare's directly purchased D1 Free plan documents 5 million rows read/day, 100,000 rows written/day, 500 MB/database and 5 GB total storage. Index maintenance also counts as writes. Exceeding free daily query limits can fail requests until reset. Sites may impose its own limits; its underlying billing allocation is not independently visible here. Confirm actual quotas with the hosting owner before a large launch. [Pricing](https://developers.cloudflare.com/d1/platform/pricing/) · [Limits](https://developers.cloudflare.com/d1/platform/limits/).

Search fan-out is bounded to 25 eligible pharmacies in the selected area; dashboard lists are bounded pilot views. Visible web screens poll every 30 seconds. Public routing/tiles have no guaranteed SLA. National-scale load testing and reporting are not claimed.

## Administration

- `/operations` requires server-verified admin identity, not just knowledge of its URL.
- `APP_ADMIN_IDS` is the server-only allowlist of stable user IDs. An email alone does not grant admin rights. Never expose this setting/session credentials in public JS.
- Root invitations expire after seven days and are single-use. Share each privately with its intended recipient, never alongside public demo links.
- Root can revoke admins/pending invitations. Delegated admins cannot remove/suspend root or promote admins.
- Verify professional license and physical location independently before pharmacy approval; submitted form data is not verification.
- Never request passwords, prescription photos or diagnoses via the support email.

## Backup and recovery

`python scripts/backup-restore-smoke.py` tests a consistent snapshot and isolated restoration of the **local fixture SQLite database**. Ignored output under `.sites-runtime/db-restore-*` is never published.

Before real-patient launch, obtain provider-level export/recovery access, verify retention, restore a production-format export into isolated staging, compare row counts/foreign keys and replay patient/pharmacy flows. Record recovery time and last successful drill. Do not restore over live data without an outage/reconciliation plan. Current Sites tools expose DB inspection, not a verified independent disaster-recovery workflow; automatic cloud recovery is not guaranteed here.

Migrations in `drizzle/` are additive/versioned. Never edit a deployed migration. Back up before destructive changes. Web-version rollback does not roll back D1 data/schema.

## Health, incidents and retention

- `/api/health` returns status/release after a harmless DB query or 503; no private rows/credentials. Cache 30 seconds. No external monitoring subscription was created.
- `/privacy` is public; `/account-data` requires identity for export/deletion/rejoining. Native Android also has confirmed account deletion.
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

Build the web project, apply committed migrations to local D1, start localhost:5173, then run the four `.mjs` smoke scripts in `scripts/` and the Python backup/native checks. Smoke tests are hard-coded to localhost to avoid live account deletion. Fictional fixtures are not production seeds.

Keep the lockfile, review advisories and rerun tests after updates. Focused overrides pin patched image-size under vinext and patched esbuild under Drizzle's legacy loader; migration generation and production build passed with them. Zero audit findings is not a penetration-test result.
