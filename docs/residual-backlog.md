# Residual work, separated from publication claims

## Acceptance and operational work

- Exact human/operator gates are in `operator-actions.md`; no automated result replaces them.
- Hosted staging latency and real D1 read/write costs need a designated authorized staging environment. Local SQLite scale tests are not production billing/load measurements. Do not load-test real patient production without approval.
- Formal screen-reader and native-speaker Kabyle acceptance must complement automated browser/axe checks. The editor viewport renders trusted React components with escaped CMS text, never arbitrary HTML; its current browser test includes the frame in axe.
- Signed Android fresh-install/upgrade, weak network/process-death/rotation/camera/GPS/QR behavior need the real-device matrix. The candidate increments the native version without changing its application ID or signing configuration. Existing public APK links are deliberately preserved until acceptance.
- Older APKs' display-only radius filters cannot be repaired remotely. They submit legacy wilaya-only requests. The updated web/native clients submit the routing radius; do not advertise that improvement for an unchanged old APK. A web-only release must state native limitations and keep the new Android distribution gated.
- Full browser OCR cancellation/no-upload/network inspection and hostile image-decoder cases need broader coverage before its disabled flag can be enabled. Synthetic printed OCR is insufficient for handwriting.

## Separately reviewable roadmap

- Decompose large application/API/native files by domain; isolate high-frequency countdown and polling renders without broad release-time rewrites.
- Govern catalog updates with licensed provenance, immutable versions, withdrawals/renewals and crosswalks; extend exact identity coverage and pharmacist review of confusable products.
- Add genuinely delivered notification adapters after provider authorization, with an outbox, retry/deduplication, delivery receipts and operator visibility. Current notices are transactional database events fetched by polling, not push or guaranteed delivery. Establish the participating-pharmacy staffing process first.
- Exercise actual native process death on accepted devices. The candidate persists account-scoped pending UUIDs and payload hashes encrypted with Android Keystore/AES-GCM, synchronously before a send, and clears them after success/logout. Instrumentation tests store recreation and account separation; a real process-death/device pass is still required. No medicine text, full transcription, image or GPS is persisted for this mechanism.
- Short-lived rotating mobile sessions with reuse detection and an explicit old-client migration. Current opaque sessions retain existing expiry/revocation and cannot perform privileged administration.
- Pharmacy staff memberships and granular roles instead of shared pharmacy credentials.
- Strict CSP enforcement after reviewing report-only findings; independent security review, account lifecycle review and data-retention/legal review.
- Expanded inventory reconciliation/imports with canonical IDs and validation; no stock-to-availability inference.
- Assistant official-document ingestion, multilingual grounded answers and adversarial/provider-failure evaluation, with model adapter OFF until accepted.
- iOS packaging/signing and channel acceptance remain a later task; no Apple build was produced.

Do not describe these items as shipped. Keep the manually usable core independent of experimental handwriting/LLM work.
