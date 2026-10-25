# LQADWA release decision — 25 October 2026

Decision: **BLOCKED for production publication / READY_CORE not established.**

This document supersedes historical release claims where they conflict with fresh evidence. The existing site remains on its October 18 Worker. The candidate implements a safe `INFORMATION_ONLY` default, but that default is not active on the old deployed code. No live migration, account change, provider configuration change, signing-key change or new deployment was performed during this implementation.

## Gate matrix

| Gate | Evidence / result on 2026-10-25 | Responsible party |
|---|---|---|
| Fresh comparison | `origin/main` = `fd2f052ae204c2849580c2cab7088e32534a78de`; existing editor work preserved in `e00af2d`; candidate branch `feat/core-release-readiness` | Engineering |
| Baseline CI | GitHub run `39136734212` succeeded for exact main SHA; this does not validate the new candidate or production | Engineering |
| Candidate checks | See [release-evidence](release-evidence.md); review-branch CI must pass on its final SHA | Engineering |
| Live deployment identity | Cloudflare deployment `cb7edb74-2771-4b71-8fc5-65aa67974960`, Worker version `60fa7df1-4e94-4d73-be5f-1bbd5e498ad1`, 2026-10-18 14:37 UTC; health reports 1.1.0 | Engineering |
| Live schema | Fresh read-only query confirmed migrations 0000–0012. Earlier transient 7403 error was superseded by a successful query. Proposed 0013/0014 are not applied | Engineering / operator approval |
| Backup and rehearsal | Fresh protected export; local restore + both additive migrations passed; existing rows preserved. No restore against production | Engineering |
| Real signup and recovery | **Not verified.** SMTP previously reported configured; no authorized non-team inbox/receipt/callback test supplied in this session | Operator + inbox owner |
| Participating pharmacy | **Not established.** A database account or approved flag is insufficient evidence of license, pin, hours, staffing or a working response agreement | Operator + participating pharmacist |
| Operational round trip | Local synthetic workflow tests exist; a consented live end-to-end pharmacy exercise is still required | Operator + participating pharmacist |
| Medicine uncertainty | Server resolves versioned IDs; brand/ingredient/strength/form are snapshotted; manual/legacy entries stay unverified. Catalog identification never verifies a prescription | Engineering + pharmacist acceptance |
| Privileged access | Recent provider-verified TOTP required for admin APIs, general endpoint admin data and owner CMS. Native tokens cannot elevate. Live enrollment and owner recovery rehearsal pending | Engineering + owner |
| Operator / privacy / legal | **Not confirmed.** Public support email is not a legal-operator declaration or legal acceptance | Operator + qualified Algerian reviewers |
| Web acceptance | Automated browsers and axe scope documented separately; native-language Kabyle and assistive-technology review remain human acceptance tasks | Engineering + reviewers |
| Android channel | Version 16 / 1.1.1 candidate; native Java retained. Compilation/lint and actual instrumentation/physical-device upgrade are separate gates | Engineering + device tester |
| AI | Separate flags default OFF. No handwriting or LLM readiness claimed | Operator + specialist reviewers |

## What the operating modes permit

`INFORMATION_ONLY` exposes public information and approved pharmacy directory cards. It blocks medicine lookup, new app registration, OAuth initiation, availability requests, replies, reservations, new pharmacy applications and new location sharing. Existing account access, withdrawal of sharing, cancellation, existing pickup completion, stock maintenance, support, export and deletion remain available subject to existing permissions, suspension and service controls. Direct provider-created users cannot bootstrap new application profiles. Provider signup itself must also be closed in Supabase by the operator before advertising a fully closed registration service.

`CORE` must be explicitly configured after all core gates pass. New optional health-note collection remains OFF independently. Existing health notes are preserved and can be cleared; consent can be withdrawn. No retention policy was changed.

Prescription OCR and the read-only assistant are independently OFF by default. Experimental AI must not block a safe manually operated core release, and must not be enabled just to fill a feature checklist.

See [operator actions](operator-actions.md), [runbook](release-runbook.md), [medicine identity](medicine-identification.md) and [AI evaluation](ai-evaluation.md).
