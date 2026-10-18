# Branded authentication emails

The Supabase Auth message templates for signup confirmation and password recovery are stored in `supabase/templates/`. Both use the hosted LQADWA mark, inline email-safe styling and Supabase's `{{ .ConfirmationURL }}` one-time action link. No password, medicine search or prescription details are included.

## Apply in Supabase

1. Open the LQADWA project in Supabase Dashboard → Authentication → Email Templates.
2. Keep email confirmation enabled. Paste `confirm-signup.html` into the **Confirm signup** template and set its subject to `أكّد بريدك الإلكتروني في LQADWA`.
3. Paste `reset-password.html` into the **Reset password** template and set its subject to `إعادة تعيين كلمة مرور LQADWA`.
4. Save, then test signup and recovery using an email inbox you control. Confirm the logo loads, the link returns to the correct LQADWA page, and the one-time link expires after use.

The owner previously confirmed configuring SMTP directly in Supabase. That configuration and mailbox delivery are outside this repository and are not independently verified here; the project still needs the live inbox check above. The current supported app flows send only signup-confirmation and password-recovery emails. Other Supabase templates are intentionally unchanged because the app does not currently send magic-link or email-invite messages.

The logo references the current product mark `https://lqadwa.lqadwa-dz.workers.dev/brand/luqya.png`. If the hosting domain changes, update both templates and verify the public image before saving. The template is Arabic-first with concise English/French/Kabyle guidance; it is not dynamically localized per account.
