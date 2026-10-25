# Release and recovery runbook

## Before publication

1. Use the reviewed PR and current main; preserve accounts, existing data, package ID `dz.lqidwa.pilot` and the established signing certificate. Never reset to the historical baseline.
2. Run the repository checks on the exact candidate commit. Require the protected `web` and `android` checks. Review the actual results, including emulator output; a compiled test APK is insufficient.
3. Read the live Worker version and health, then query `d1_migrations` read-only. Confirm the Worker binds the existing production database. Do not infer migration absence from one provider error or a blank metadata count.
4. Export a fresh backup into an ignored, access-restricted directory. Wrangler can emit a temporary signed backup URL: keep logs restricted and do not paste or publish that URL. Record a SHA-256 receipt, not database rows or credentials. Keep an independently controlled recovery copy according to the operator's accepted backup policy.
5. Rehearse the backup locally using `node scripts/restore-rehearsal.mjs .cloudflare/backups/<backup>.sql`. This script never targets remote D1. It verifies integrity, both additive migrations, preserved rows and CMS tables. Restore folders contain private data and must remain restricted.
6. Obtain explicit approval for these concrete live schema changes: `0013_request_identity.sql` creates a request-identity table with a cascading request FK; `0014_stock_identity.sql` adds three nullable identity columns. Existing rows are not rewritten or deleted. Generated Drizzle snapshots/journal accompany them. Inspect actual remote history immediately before applying only pending migrations. Do not run all SQL files manually or mark an unapplied migration as complete.
7. Complete the mode-specific human gates in `release-readiness.md`. A web-only acceptance may be separate from a new Android distribution; do not advertise an unaccepted APK.

## Approval receipt and deployment

Production workflow is manual, restricted to main and the `production` environment. It checks credentials early, reruns validation, checks live migration history, requires exact-commit evidence and deploys with experimental features OFF.

Set the non-secret environment variable `LQADWA_RELEASE_APPROVAL` in the GitHub production environment to JSON. Include evidence references only, never mailbox contents, patient data, keys, passwords or backup download URLs. Format:

```json
{
  "commit": "<exact approved main SHA>",
  "mode": "INFORMATION_ONLY",
  "operator": "<responsible operator>",
  "expires": "<UTC time within the next 48 hours>",
  "gates": {
    "exactCommitCI": {"passed": true, "evidence": "<run URL>"},
    "schemaVerified": {"passed": true, "evidence": "<dated schema receipt>"},
    "freshBackup": {"passed": true, "evidence": "<protected backup receipt>"},
    "restoreRehearsal": {"passed": true, "evidence": "<rehearsal receipt>"},
    "rollbackCompatible": {"passed": true, "evidence": "<reviewed rollback receipt>"},
    "informationLegalAcceptance": {"passed": true, "evidence": "<operator acceptance reference>"}
  }
}
```

For `CORE`, the script additionally requires `realEmail`, `verifiedPharmacy`, `operationalRoundTrip`, `privilegedMfaRecovery`, `privacyLegalAcceptance`, `channelAcceptance` and `medicineIdentity`, each with passed status and evidence. These are attestations for reviewers; the script cannot independently certify legal or clinical suitability. Never fabricate the receipt to get past a failing gate.

After approved migrations and protected-main merge, dispatch **Publish approved web release** with the accepted mode. `--keep-vars` preserves existing unrelated configuration; explicit flags set the mode and turn health collection/OCR/assistant OFF. Do not enable a paid plan or replace account/database bindings.

Health includes the compiled source commit, Git tree, dirty flag, schema version and runtime mode. The post-deploy check compares the expected commit and rejects a dirty build. Verify actual auth callbacks, localized pages, private endpoint denials, directory, CMS tables and accepted channel hashes. A 200 health response does not prove mail delivery, pharmacy operations or lawful readiness.

## Rollback and incidents

The new migrations are additive. The old Worker can continue using the original columns; roll back **application code**, keeping added schema/data in place. The local rehearsal exercises legacy request/profile/stock SELECT/INSERT paths inside a rolled-back savepoint; it is not a live rollback or complete old-Worker acceptance test. Do not drop identity columns/tables as a routine rollback. Keep the previous Worker version ID and configuration receipt. Review current `wrangler rollback --help` before an operator-authorized rollback. Verify the resulting Worker identity and mode afterward; the old Worker does not enforce the new information-only policy.

For a service incident, use owner service controls to pause requests/pickups as appropriate, contact affected participating pharmacies through the agreed operational channel, and preserve minimal incident evidence. Existing cancellation/data rights should remain available. Do not restore a whole old database over newer patient records to fix an application bug.

Owner recovery: use Supabase's documented administrator-controlled MFA recovery procedure with independent operator identity verification. Do not add a password-only owner bypass, recovery query parameter, shared account, native-token elevation or hardcoded OTP. Remove a lost factor only through an authorized provider operator, revoke affected sessions, require re-enrollment, then test fresh step-up. Keep recovery evidence without TOTP seeds/codes. Delegated-admin access remains subject to current D1 permissions after step-up.
