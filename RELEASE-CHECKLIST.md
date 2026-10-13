# LQADWA release checklist

The latest recorded release is 1.0.9 on Cloudflare with signed native Android downloads. Source is maintained in the owner's GitHub repository. Historical release checks below are not a fresh production-readiness certification. This checklist separates engineering checks from acceptance tasks still required for broad patient use. Details, links and artifact hashes are in [RELEASE-HANDOVER.md](./RELEASE-HANDOVER.md); repeatable procedures are in [OPERATIONS.md](./OPERATIONS.md).

## Completed verification

- TypeScript, production web build and production npm audit pass.
- Local checks pass for authentication/role isolation, owner/delegated permissions, CSRF/input limits, privacy, reservation/stock flows and account closure. GitHub CI evidence is recorded per release in the handover.
- Guest, client, pharmacy and admin navigation is separated on web/native. Pharmacy requests, pickups and stock have separate tabs; application resubmission is restricted by server-side status checks.
- Actual browser OCR engine reads a synthetic printed prescription and matches both catalog brands. The patient must review the result and select the correct medicine/strength.
- Signed Android APKs/AAB build; full native lint has zero errors. APK signatures, ARM64 zip alignment and six ARM64/x86_64 native-library 16 KB ELF checks pass.
- Public HTTPS pages, security headers, private admin redirect, catalog and exact hosted APK hashes pass. APK buttons follow the release version and downloads require cache revalidation.
- Public screens have no fictional pharmacy directory, public admin signup or ChatGPT sign-in. Common credential checks pass for publishable source/history; keys and database exports are excluded.

## Required acceptance before broad patient use

- Verify confirmation and password recovery with a non-team address, including delivery failures and expired links. Earlier documentation observed SMTP off; the owner subsequently reported configuring it. Current configuration and end-to-end delivery remain unverified in this audit. Do not expose provider credentials.
- Verify supported physical Android phones: fresh install/upgrade, login, returning from account confirmation/recovery, rotation, camera/gallery, permission denial, GPS/routes, QR pickup, weak networks and process death. No physical-device pass is claimed.
- Independently verify pharmacy licenses/locations and pharmacist handling of name/strength, stale availability, reservation expiry and original-prescription pickup.
- Complete fluent Kabyle review. Native OCR supports printed Latin; Arabic/handwritten recognition is not promised. OCR/catalog matching is not clinical advice or prescription verification.
- Supply legal operator details and obtain Algerian pharmacy/data-protection review. Confirm consent/retention, support, incident response and representative recovery procedures.
- Complete independent security/load/accessibility review and encrypted signing-key recovery. Public map/routing quotas and transit coverage must be monitored; establish another compliant service or hosting arrangement before scale.

## Owner configuration and store submission

Google/Apple providers remain hidden until configured and accepted. No paid membership or service was activated. Configure a separate least-privilege Cloudflare token in GitHub secrets before using the manual deployment workflow; signed Android releases and database migrations remain owner-controlled steps.

Play/App Store publication has not been performed. iOS is deferred. Prepare store account ownership, current submission requirements, privacy/data-safety declarations and phone acceptance before uploading the signed AAB.

Email/password accounts use Supabase; app data uses Cloudflare D1. Administration requires a server-authorized identity and individual credentials, never a public shared password. Only approved real pharmacies appear in searches. Patient access is free; pharmacy pricing is 300 DA/month, waived through 30 September 2027, with no payment collection or delivery.
