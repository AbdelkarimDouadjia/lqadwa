# Phase-one verification record

13 October 2026, local Windows / Node 24.19.0. Source baseline `e04c3255b7fed99cf3bb645d535d16e9642a0c6d`. Commands use existing installed dependencies and scripts. Production was not modified or load-tested. Logs/screenshots are ignored local artifacts under `.cloudflare/phase-one/`, not invented evidence attached to this document.

| Command/check | Result | Evidence / limitation |
|---|---|---|
| `npm run install`, `npm run test` | NOT AVAILABLE | No such package scripts; no invented run. Existing install script is `install:ci`; dependencies already present. |
| `npm run check` | PASS baseline and final source build | TypeScript and source-security/branding/map/workspace/experience/design/OCR source checks; `baseline-check.log`, `after-check.log`. Not a full security audit. |
| `npm run lint` | FAIL before and after: 29 errors / 26 warnings | `baseline-lint.log`, `after-lint.log`. Pre-existing React effects/refs/memo/unused findings; unchanged count is not proof of no new problems, so changed files also linted. |
| Focused ESLint on changed discovery/landing/test slice | PASS (exit 0; image warning may remain) | `focused-lint.log`; CI adds the focused gate. Full lint cleanup/gate remains backlog. |
| `npm audit --omit=dev --audit-level=high` | PASS: 0 reported vulnerabilities | `baseline-audit.log`; same locked dependencies, no new package. Does not establish application security or dev-dependency safety. |
| `npm run build` | PASS final code | `after-build.log`; v1 route included. vinext warns that static route classification is incomplete. No framework upgrade made. |
| `npm run test:ocr` | PASS | `after-ocr.log`: real local Tesseract worker reads a synthetic printed prescription and matches two catalog brands. Not handwriting, clinical validation or physical Android OCR acceptance. |
| Baseline discovery regression | Expected FAIL: 400 vs required 200 | `discovery-red.log`; correct failure after fixing oversized-SQL/LIKE-pattern fixture errors. No claim those initial harness failures proved an app defect. |
| `npm run test:discovery` | PASS | `discovery-benchmark.log`: 10/100/300/1,000/10,000 synthetic SQLite rows; index plan, recipient bound, stable tied-score pagination, duty/radius/exclusions. Host-local timing only. |
| `npm run test:integration` / `--review` | PARTIAL: new discovery suite PASS; complete Windows gate FAIL | Fresh isolated local D1 migrations; 350 rows in seven directory pages, 25 recipients, first native profile/notice, public allowlist, filter validation/suspension and concurrent reply/reserve/pickup replay pass. Later legacy admin stock edit hit a local Worker connection drop. No complete final integration pass claimed. |
| `gradle -p android assembleRelease lintRelease --console=plain --no-daemon` | PASS unsigned | `android-unsigned.log`: 52 tasks, successful. Initial attempt lacked SDK environment, then reran with the already installed SDK. Signing environment cleared, no keystore opened. Not a distributable signed APK. |
| Design-taste source linter | Baseline FAIL, known source patterns | `baseline-design-lint.json`: decorative labels/gradient/hairline/shadows/outlined boxes. Source heuristic, not clinical or WCAG gate; giant compact lines can be skipped. |
| Browser inspection | Partial PASS, not full matrix | Actual guest locale/menu/theme interactions, RTL, one h1, no observed overflow at 416/1600; actual dark mobile screenshot. Desktop capture timed out; full details in design evidence. |
| Production SMTP/OAuth/settings, main protections, legal/operator acceptance, physical phones, field CWV | NOT TESTED / APPROVAL BLOCKED | Do not claim final launch acceptance. No deployments or provider/account changes. |

## Integration reruns and reproducibility

The initial old-build role/admin/auth/release checks passed before the new discovery red test. Later modified-build runs failed on a local Miniflare `Network connection lost` during a stock or deletion request; these are failures, not green tests. A separate rerun reused `.wrangler/state` and failed signup rate limiting. That collision is addressed by a fresh `integration-*` local database per run, shared with child fixture scripts via `LQADWA_TEST_STATE`. No production guard is loosened and no mutation request is automatically retried.

Retained failure log examples: `integration-reused-state-failure.log` and `integration-local-connection-failure.log`. The final run uses the final build and isolated state. Final exit/test output must be checked before commit; CI still needs to verify the exact committed tree on Linux. No blind retry of non-idempotent business operations has been added.

Final observed Windows run: new discovery suite passed; local query CLI metadata exposed only `duration: 2`, not rows read/written. The complete run exited 1 on `admin-smoke.mjs` stock edit with HTTP 500 and Miniflare `Network connection lost`. That transport failure recurred even with isolated state and is unresolved. The draft must remain unmerged until the exact committed integration gate passes and any platform difference is understood. Source checks/build/OCR/unsigned Android passes do not override it.

## Artifact and compatibility boundaries

Public 1.0.9 ARM64/ARMv7 APKs and release signing configuration are untouched. This PR keeps `/api/app`, Auth/device/profile/stock/admin paths and pickup code semantics. Native compatibility is checked by opaque-session API integration, source assertions and unsigned compilation; a physical installed-APK pass is still required before rollout. No new signed release or APK upload is claimed.

Fresh client bundle samples (uncompressed bytes, local build): `page-CLSpjfUO.js` 326,507; `medicines-2026-CA7SvYZf.js` 534,762; framework 190,152; Leaflet 148,829. Filenames can change with builds. These are chunk sizes, **not** all initial transfer bytes or measured CWV. Browser OCR and Leaflet dynamic imports already exist. No claimed performance win from static import inspection alone.

## Required next verification

Run cross-browser locale/theme/role fixtures, keyboard/axe/screen-reader checks and exact requested breakpoints; investigate Windows Worker connection stability if it recurs; clear full lint before enforcing that gate; test concurrent identical UUID request creation/outbox; verify D1 billed row operations and full endpoint p95 in approved staging; obtain real email/device/legal acceptance. Migration/rollback/30–90-day plans are in the main audit. The first draft PR is reviewable without claiming all of those gates have passed.
