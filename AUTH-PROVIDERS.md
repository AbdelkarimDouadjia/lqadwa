# LQADWA sign-in provider setup

Production site: https://lqadwa.lqadwa-dz.workers.dev

Google and Apple use Supabase PKCE and the existing verified-account, role and account-closure checks. Only enabled providers are advertised. A disabled provider request returns HTTP 409, never a false success. Native Android uses the system browser for provider consent and the existing expiring device-code approval; no session token is passed in a URL. Email/password login is native.

## Google (no paid hosting or Maps API required)

1. In the operator's Google Auth Platform project, configure branding, support email and audience. For real public users, finish Google's publication/verification requirements rather than restricting access to test users.
2. Create a Web OAuth client. Authorized JavaScript origin: `https://lqadwa.lqadwa-dz.workers.dev`.
3. Authorized redirect URI: `https://iqbqqlwappehjppupzde.supabase.co/auth/v1/callback`.
4. Enter the client ID/secret **directly** in Supabase → Authentication → Sign In / Providers → Google, enable and save. Never paste secrets in chat, source or public assets.
5. Keep the Supabase application callback allowlist: `https://lqadwa.lqadwa-dz.workers.dev/auth/callback**`.
6. Within 30 seconds the website/Android provider availability endpoint recognizes the enabled provider. Reopen sign-in. Verify login, return to pharmacy/admin, consent cancellation, new-account onboarding and Android device approval. A provider's enabled flag alone does not verify its credentials or consent configuration.

[Supabase Google guide](https://supabase.com/docs/guides/auth/social-login/auth-google)

## Apple

Requires an existing eligible Apple Developer setup (Team ID, App ID, Services ID and signing key). Do not purchase membership or activate a paid plan under the user's free-only constraint. If the operator supplies this setup, configure the Apple provider directly in Supabase. Put the web Services ID first in Client IDs and configure the same Supabase provider callback above. Apple OAuth secrets need rotation at least every six months. No Apple login is advertised until the provider is enabled; it has not passed end-to-end acceptance.

[Supabase Apple guide](https://supabase.com/docs/guides/auth/social-login/auth-apple) · [Apple developer account](https://developer.apple.com/help/account/basics/about-your-developer-account)

## Email / launch gate

The owner confirmed SMTP setup on 18 October 2026. Signup confirmation and password recovery are implemented through Supabase Auth; polished Arabic-first templates live in `supabase/templates/`. SMTP state and mailbox delivery have not been independently verified in this workspace. Apply the templates and complete a real inbox test before broad public signup. Do not disable email confirmation to bypass delivery limits. See `docs/auth-email-templates.md`.

## Maps

Embedded map and GPS: OpenStreetMap/Leaflet on web, MapLibre on native Android. Walking/driving plans use the public FOSSGIS routing service, with no live traffic guarantee. Google Maps universal URLs supply destination coordinates, optional current origin and walking/driving/transit mode without an API key. Transit includes bus/train options **only where Google has local data**; there is no invented timetable or unsupported train-only URL parameter. External Maps handles detailed navigation and available transport preferences. App-local tracking is foreground-only and does not automatically share with pharmacies.

[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
