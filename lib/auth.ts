import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase-server";
import { safeReturnPath } from "@/lib/auth-redirect";

export async function getAppUser() {
  const client = await authClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || !user.email_confirmed_at || user.is_anonymous) return null;
  // Display metadata is never used to authorize pharmacy or administration access.
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.slice(0, 60) : null;
  return { userId: user.id, displayName: fullName || user.email || "LQADWA", email: user.email || "", fullName };
}
export async function requireAppUser(returnTo: string) {
  const user = await getAppUser();
  if (!user) redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
  return user;
}
