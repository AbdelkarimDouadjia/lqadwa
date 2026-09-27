# LQADWA — previous pilot checklist

**Superseded for 0.11.0-rc1 by [RELEASE-HANDOVER.md](./RELEASE-HANDOVER.md) and [OPERATIONS.md](./OPERATIONS.md).** The record below describes the earlier pilot, not the latest verification state.

The hosted pilot has persistent D1 storage, authenticated users, private administration and a native Android APK. This is **not** clinical validation or Play Store clearance.

## Verified automatically in this release

- TypeScript compilation and production web build.
- Local patient/pharmacy workflow and role isolation smoke tests.
- Device pairing: code/proof/CSRF checks, one-time exchange, session revocation.
- Suspension, root protection and used-invitation replay regression test.
- Native Android release compilation for ARM64, ARMv7 and x86-64.

## Required before a real-patient/public-store launch

- Physical Android tests: fresh install/upgrade, login and returning from browser, screen rotation, camera/gallery, permission denial, GPS timeout, route lifecycle, QR collection, weak network and process death. No physical-device pass is claimed yet.
- Independent pharmacy license verification and pharmacist testing of medicine name/dose matching, stale stock, expiry and prescription handover. Never treat OCR or catalog matching as medical advice or prescription verification.
- Native-speaker Kabyle review; native OCR currently supports printed Latin, not Arabic/handwritten prescriptions.
- Current Android target/API requirements, native-library 16 KB compatibility, dedicated release key custody, Play Console setup, privacy/data-safety declarations and accessibility review.
- Algerian legal/data-protection review, published operator identity/support contact, consent/retention policy, account/data deletion process, backup restore exercise and monitoring/incident response. Legal compliance is not asserted by the code.
- Production service agreements for maps/routing if traffic grows; public OSM/FOSSGIS endpoints have no paid SLA. Public transit coverage depends on the external navigation provider.
- Load/concurrency and independent security review; admin lists are bounded pilot views, not full analytics/export tooling.

## Sharing the pilot

Use explicit demo mode for fictional pharmacies. Never route to a demo pharmacy. Real mode requires actual approved pharmacy registration and availability confirmation. Do not upload sensitive prescriptions to support chats. Patient access stays free; pharmacy pricing is 300 DA/month, waived through 30 September 2027, with no payment collection enabled.

The APK and backend use the same production domain. Test users need ChatGPT sign-in, including a browser confirmation for native device linking. Admin access is by allowlist or a one-use owner invitation, never a public admin password.
