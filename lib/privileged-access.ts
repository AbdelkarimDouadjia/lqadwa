import { authClient } from "@/lib/supabase-server";
import { HttpError } from "@/lib/access";
import { hasRecentMfa } from "@/lib/mfa-assurance";

export async function recentPrivilegedSession(subject: string, request?: Request) {
  // Opaque Android tokens carry no Supabase assurance, even alongside a cookie.
  if (request?.headers.has("x-lqadwa-session")) return false;
  const client = await authClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || user?.id !== subject || !user.email_confirmed_at || user.is_anonymous) return false;
  // SDK verifies asymmetric signatures (or asks Auth to validate symmetric JWTs).
  // Never treat a decoded JWT, metadata or a user-provided AAL as proof.
  const verified = await client.auth.getClaims();
  return !verified.error && hasRecentMfa(verified.data?.claims, subject);
}
export async function requirePrivilegedSession(subject: string, request?: Request) {
  if (!await recentPrivilegedSession(subject, request)) throw new HttpError("Verify your authenticator at /operations/security. / أكّد الدخول بتطبيق المصادقة.", 403, "MFA_REQUIRED");
}
