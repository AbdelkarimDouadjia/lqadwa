# Multi-page content workspace

This extends the editor deployed through PR #8. The October 18 release number remains 1.1.0; compiled source SHA and Worker version identify newer maintenance releases. Migrations 0013/0014 were approved, applied and verified previously. They are not pending and must not be reapplied for this editor.

## Owner controls

Open `/operations/editor?page=home` after owner sign-in and recent authenticator verification. The page selector covers Home, How it works, For pharmacies, Safety, Pricing, Help and the Privacy introduction/additions. Each page has a separate draft, publication version and 25-revision history. Unsaved navigation is confirmed; draft imports must belong to the selected page. Switching pages never publishes or silently saves edits.

Add up to 40 blocks per page, with up to 12 items per card group, step group or FAQ. Text, calls to action, images with descriptions, cards, steps, FAQ and dividers can be inserted, moved, duplicated, hidden or removed. The introduction is movable. Built-in home sections can be converted into editable blocks; their original version is retained hidden for recovery. Width, spacing, alignment, theme-safe tones and column counts work responsively. All four languages have separate content. A content block without text in a language is omitted there instead of inventing a translation.

Images use the existing local illustration allowlist. Buttons have validated internal destinations. Arbitrary HTML, JavaScript, CSS and tracking-image URLs are not accepted. Editor flexibility does not grant access to clinical controls, account deletion, authorization or authentication templates. Privacy additions do not replace the existing legal policy or account-data tools; changing the legal policy requires its own reviewed source change.

## Storage and compatibility

No database migration is needed. Home keeps the existing `landing_content.id='main'`. Other pages use bound allowlisted `page:<slug>` IDs in the same table. New content includes its page identity. Revisions are filtered/pruned/restored by that identity; legacy revisions without a page belong to Home. A revision from another page is rejected. Public reads expose only published JSON. Defaults are constructed in memory on reads, never seeded into the live database.

The 512 KiB input/file limit, strict content schema, owner authorization, recent provider-verified MFA, CSRF, rate limit, optimistic version check, idempotent draft retry and atomic audit saves remain enforced. Existing homepage JSON and native clients remain compatible. No account, health record, inventory or prescription processing changes are introduced.

## Workspace navigation

Patient and pharmacy workspaces display counts from their authenticated snapshot. Owners and authorized analytics administrators see the aggregates already permitted by the API; other admins retain scoped views. Navigation badges expose current tasks without adding another role's destinations. The optional WebGL decoration starts OFF, is independent of maps and clinical content, uses no external resources/data, stops when hidden or reduced motion is requested, and releases resources on removal. Missing WebGL falls back to the normal static surface. Mobile, RTL, theme and keyboard behavior require browser verification.

## Verification and release

Run `npm run check`, `npm run lint`, `npm audit --omit=dev --audit-level=high`, `npm run build`, `npm run test:e2e`, `npm run test:ocr` and the existing CI Android compilation/lint job. Regression coverage includes all page defaults, movable introduction, rich item/asset constraints, draft isolation, page-bound retry/history/restore, SSR publication, dirty page-switch cancellation and the existing real drag gestures. Exact command/CI/deployment results belong in the PR receipt; this document does not turn pending checks into passes.

Before upload, take a fresh protected D1 backup, rehearse recovery and check the current Worker version. After upload, compare `/api/health` with the exact clean merged commit, verify served editor bytes, localized pages, rejected private requests, published content and unchanged signed APK hashes. Deployment does not publish a user's saved draft.

For rollback to PR #8's Worker, restore compatible homepage content first if new block types or movable introductions have been published. Other page rows can remain safely stored: the older code ignores them. Never restore an old full database over newer patient records. Keep a current exported draft before deliberate content restoration.

## Separate launch gates

The broad CORE candidate remains separate in PR #7. Real non-team confirmation/recovery email delivery, a licensed participating pharmacy with a staffed/consented live round trip, owner MFA recovery, operator/legal/privacy acceptance, and signed physical-phone install/upgrade acceptance are unresolved until their evidence is supplied. They cannot be replaced by local fixtures or an APK build. New handwriting AI and the expanded assistant remain undeployed/disabled; iOS remains deferred. Public map integrations do not establish nationwide transit/train coverage or verified synchronized pharmacy inventory.
