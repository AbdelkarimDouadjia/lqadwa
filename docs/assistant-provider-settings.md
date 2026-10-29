# Owner-managed assistant credentials

The private page `/operations/assistant` is linked only inside the owner's administration. It supports OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, Mistral and DeepSeek credentials. It does not accept custom URLs or arbitrary provider/model IDs. Adding another integration requires a reviewed allowlisted endpoint; “OpenAI compatible” is not permission to send keys to any URL.

## Owner workflow

1. Sign in through `/operations/login`, verify the authenticator if requested, then open **Assistant providers and API keys**.
2. Choose the provider and paste its key into the password field. Save encrypts it and clears the field; neither the full key nor a fragment is ever returned by the API, HTML, account exports or audit records.
3. Check the public-evidence consent box and choose **Test connection**. OpenAI/Anthropic/Gemini/Groq/Mistral/DeepSeek receive a fixed model-metadata GET only, using the proper authentication header. No paid inference is tested or enabled for those providers.
4. OpenRouter additionally receives a small synthetic PUBLIC service-guide probe. A successful test checks authentication and the strict evidence-ID response format, not clinical safety or handwriting accuracy. Then the owner can explicitly enable **openrouter/free**.
5. Disable stops new calls. Remove erases the active encrypted key and retains only a non-secret revision tombstone to prevent an old in-flight test validating a replacement key. Removal does not revoke the provider's own credential; revoke old keys in its account. A call already sent may finish. Encrypted database backups follow the existing backup policy.

Saving/replacing always disables inference and invalidates the previous connection check. Activation requires a check of the current key within 24 hours, explicit consent, recent verified MFA and the server's external-evidence switch. Optimistic revisions protect concurrent browser windows; keys are re-read before use, never cached globally. Ordinary users, pharmacies, delegated admins and opaque native tokens cannot read or change these settings. The general app/admin snapshot never includes them.

## Free-only execution and privacy

Only OpenRouter's fixed `openrouter/free` router may be enabled. Its request has zero ceilings for prompt/completion/per-request price, paid fallback disabled, provider data collection denied and ZDR required. Providers that cannot satisfy those constraints are unavailable; the app returns its normal source excerpts. Other saved providers remain credential-management integrations, not active chat providers. No billing plan is changed or credits purchased.

The optional model sees already-retrieved public guide excerpts only. It receives no question/history, account ID, request status, patient medicine lookup, prescription image/OCR, location, cookies or user IP header. It can select existing citation IDs only; server-owned source text is displayed, and model-authored medical advice, URLs, tools or SQL are rejected. This is bounded extractive assistance, not unrestricted generative medical chat.

Production calls and OpenRouter probes share the existing 20-attempt/day global inference budget. Metadata connection checks have their own 20/day owner-wide limit. Public responses remain private/no-store; errors and audit events never record keys, ciphertext or raw provider bodies. Timeouts, response byte limits, strict citation validation, the shared failure circuit and non-model fallback remain in force.

## Storage and recovery

Additive migration `0015_assistant_provider_credentials.sql` creates one table, with no alteration/deletion of existing accounts, pharmacy records or medical records. The operator explicitly approved this migration on 28 October 2026. It was rehearsed against a protected production export before application. This vault is managed exclusively by reviewed Wrangler SQL and direct D1 queries, deliberately outside `db/schema.ts` and Drizzle's generated schema. An isolated `db:generate` regression verifies that it does not recreate the vault table or write a duplicate migration. Do not introduce an ORM declaration without reconciling the SQL-owned table first.

Keys use AES-256-GCM with a random 96-bit IV and provider-bound additional authenticated data. `ASSISTANT_SETTINGS_KEY_V1` is a Cloudflare Worker secret, never a public environment variable or client bundle value. An encrypted D1 backup without the matching key cannot restore usable credentials.

A recovery copy of the encryption secret is protected by Windows DPAPI for the current Windows account, under the existing user/SYSTEM-only ignored backup directory. It is not in Git, website downloads, CI artifacts or the owner handover. Preserve that recovery copy and the Windows account recovery capability separately; do not rotate/replace the Worker secret during ordinary deployment. After an intentional rotation, re-encrypt credentials through a reviewed migration or have the owner re-enter/revoke keys. Do not print secret values while diagnosing recovery.

## Deployment

- `GROUNDED_ASSISTANT_ENABLED=true` enables the read-only, authenticated service assistant.
- `ASSISTANT_EVIDENCE_AI_ENABLED=true` permits an explicitly enabled provider; it makes no calls when no provider is configured/enabled. Saving credentials alone does not activate inference.
- `ASSISTANT_SETTINGS_KEY_V1` must be a server secret encoding 32 random bytes. Missing/invalid secure storage fails closed; there is no plaintext fallback.
- This feature adds no paid plan, authentication-provider change, public admin link or Android signing change. The signed APK is unchanged.

Core legal/privacy acceptance, real mailbox/pharmacy round-trip, MFA recovery and physical-phone acceptance remain independent launch requirements. A metadata check is not proof of a paid model entitlement or clinical quality. Actual upstream-key verification requires the owner to enter their credential in the private page; never send it through chat.

## Verification and references

`npm run test:assistant` covers encryption and wrong-provider/tamper rejection, all seven request contracts, no key echo, header-only credentials, fixed URLs, free price ceilings, paid activation denial and additive row preservation. The isolated HTTP/D1 suite tests owner/MFA/native access, encrypted CRUD, optimistic races and stale-test protection. The browser suite tests the real private login, four locales/mobile layouts, saving/removing a synthetic key and no plaintext in HTML. Upstream HTTP is mocked in these fixtures, and no patient data or real API credentials are seeded.

Official interfaces: [OpenRouter API](https://openrouter.ai/docs/api_reference/overview), [free router](https://openrouter.ai/openrouter/free), [provider price/privacy limits](https://openrouter.ai/docs/guides/routing/provider-selection), [OpenAI models](https://developers.openai.com/api/reference/resources/models/methods/list), [Anthropic models](https://platform.claude.com/docs/en/api/models/list), [Gemini models](https://ai.google.dev/api/models), [Groq models](https://console.groq.com/docs/models), [Mistral models](https://docs.mistral.ai/api/endpoint/models), [DeepSeek models](https://api-docs.deepseek.com/api/list-models/).
