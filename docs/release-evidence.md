# Release evidence — 2026-10-25

Engineering evidence only; no legal, clinical, mail-delivery or real-device certification. Workflow/browser fixtures were synthetic and loopback-only. No real prescription was used in screenshots or tests.

## Fresh source and production comparison

- `git fetch origin` completed. Main remains `fd2f052ae204c2849580c2cab7088e32534a78de`. Existing editor/dependency work was preserved in `e00af2d`; candidate branch is `feat/core-release-readiness`. No reset/reversion.
- Fresh `gh run list` returned successful [Release checks run 39136734212](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/39136734212) for exact main SHA. That result applies to the baseline, not the candidate.
- Fresh Cloudflare inspection: deployment `cb7edb74-2771-4b71-8fc5-65aa67974960`, version `60fa7df1-4e94-4d73-be5f-1bbd5e498ad1`, 2026-10-18T14:37:18Z. Live health reports 1.1.0; landing API 200, anonymous operations redirect, private APIs 401. No new deployment occurred.
- Initial migration-list attempt returned Cloudflare 7403. Later D1 listing and read-only `SELECT name FROM d1_migrations ORDER BY name` succeeded: 0000–0012 applied; 13 rows read, zero written. Earlier denial is superseded, not assumed persistent.
- Fresh full backup is in an ignored, ACL-restricted local folder. SHA-256 `e110c39cf8c6e241bbf2981e52332e9fcd073ba627006fca8d72316ecd9da57a`, 13,255 bytes. SQL and temporary download URL are not repository artifacts.
- Local `scripts/restore-rehearsal.mjs` exited 0: integrity, CMS tables, additive migrations 0013/0014, existing rows and legacy request/profile/stock SQL compatibility passed. Compatibility writes ran inside a rolled-back savepoint. No production migration or restore.

## Candidate commands and results

| Command / check | Observed result |
|---|---|
| `npm run check` | Exit 0: TypeScript, source/security guards, branding, route/auth/navigation, contrast, OCR candidates, editor schema/reorder, new release/MFA/medicine regressions |
| `npm run lint` | Exit 0; 28 warnings, zero errors |
| `npm audit --omit=dev --audit-level=high` | Exit 0; zero reported production dependency vulnerabilities |
| `npm run build` | Exit 0; local dirty development candidate, not a verified deployed commit. Publication requires clean exact-commit CI/build identity |
| `npm run test:discovery` | Exit 0; five local SQLite scales, indexed selection, stable ties/cursors, radius, duty/exclusions. Not hosted D1 billing/latency |
| `npm run test:ocr` | Exit 0; real installed Tesseract and Arabic/French/English workers on one synthetic printed Latin fixture. CER 0, WER 0 for that fixture only; no handwriting inference |
| `npm run test:ai-safety` | Exit 0; five synthetic candidate cases, uncertainty spans, edit-distance metrics, assistant tool injection/limits/citations |
| Standalone admin integration | Exit 0: AAL1 owner denied admin-data/CMS/actions, provider step-up succeeds; permission/invitation/CMS/health privacy checks. Full suite repeats amended stock/assistant regressions |
| Standalone workflow integration | Exit 0: account isolation, hidden pickup codes, suspension/cancellation, location withdrawal/staleness, export/deletion/tombstones, opaque-token privilege denial and pickup rate limits |
| Full browser run, then exact-head PR CI | Initial local run 16/18 passed; diagnosed editor fixes passed targeted Chromium/Firefox/WebKit tests. On commit `9d52b232213b759c71a04ba2bdb24ebc4cfef283`, [CI run 40215151158](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/40215151158) web job passed the full 18-test suite in 4.7 minutes, plus API/build/check/lint/audit/OCR/AI checks |
| `node scripts/ci-smoke.mjs` final API gate | Exit 0: discovery/concurrency/identity, admin/MFA/CMS/stock/assistant, auth/provider response contract, workflow/privacy and information-only tests all passed |
| `wrangler deploy --dry-run` | Exit 0; 146 modules, upload 3783 KiB / gzip 996.33 KiB; 83 static assets. No deployment was made |
| Android `assembleRelease assembleDebug assembleDebugAndroidTest lintRelease` | Exit 0; Gradle 8.13, 1m49s, latest native 16/1.1.1 source including durable retry metadata and logout clearing. Signing configuration preserved; unsigned outputs not advertised as distribution |
| Local Android instrumentation | Not successfully run: emulator could not start because the Windows hypervisor driver is missing; no connected device. Compiling its APK is separate |
| PR Android CI at `9d52b23` | Build/debug/test APK compilation and lint passed; emulator startup step timed out before instrumentation ran. Startup stderr was not retained, so the emulator failure cause is unknown. Follow-up runner diagnostics add bounded startup/adb calls and always-upload logs; no native test pass is inferred |
| PR CI at `68bfff9` | [Run 40233471026](https://github.com/AbdelkarimDouadjia/lqadwa/actions/runs/40233471026): web passed all 18 browser tests (4.2m), full API gate, check/build/lint/audit/OCR/AI and fake runner tests. Android build/lint passed; captured `environment.txt` identifies QEMU startup failure: missing `libpulse.so.0` on the Ubuntu runner. Instrumentation did not run. The workflow now explicitly installs `libpulse0`; actual emulator execution must pass on the subsequent commit |
| `node scripts/android-runner-smoke.mjs` | Exit 0 for fake-process early exit, no-device timeout, instrumentation failure rejection and success sentinel. This checks runner control flow only, not Android behavior |
| `node scripts/request-race-smoke.mjs` | Exit 0: actual service SQL against the complete local migration schema, with pause/pharmacy suspension/patient suspension/account closure injected after discovery. The existing database pause trigger already prevented a write; the new predicate now returns an explicit 409 `SERVICE_PAUSED` rather than leaking the trigger abort into a generic 503 |
| Real phone signed install/upgrade | Not run |
| Real non-team mailbox signup/recovery | Not run; no authorized inbox supplied |
| Live pharmacy round trip | Not run; participating pharmacy acceptance not supplied |
| Production data/account/provider changes | Not performed |

The initial integration run failed an old assertion expecting identical reservation retries to return 409. Intended behavior now returns the existing reservation; regression asserts one durable reservation and one patient event. An intentionally failing local notification trigger produces a 503 and verifies the reply state rolls back. Injected errors are not treated as successful production behavior.

Browser scope: Arabic RTL/French/English/Kabyle, light/dark, widths 320/360/375/390/414/768/1024/1440, role menus, keyboard, axe, directory and visual CMS. Initial full run: 16 passed, 2 failed (Firefox sidebar drag; WebKit canvas drag). Pointer handling was unified; the trusted React preview frame now permits its event handlers without accepting arbitrary CMS HTML. A subsequent WebKit Escape focus failure was fixed with capture listeners in both frame and parent documents. Targeted editor regressions passed in all three engines. Automated axe is not manual screen-reader or native-language acceptance. The auth integration's old provider-key assertion was also updated to verify the new, bounded public release-policy fields; the final API gate passes.

Fresh Supabase advisors reported leaked-password protection disabled. No paid feature was enabled. Operator review of free Auth settings and [password-security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains required. No Auth setting/account was silently changed.

Requested skills were verified installed and read for applicable work. The established design was retained. Static canvas/theme guidance did not justify unnecessary artwork. No unavailable skill executable, handwriting model, clinical review or user mailbox is represented as tested.
