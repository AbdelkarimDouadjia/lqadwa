import { authClient, authConfig } from "@/lib/supabase-server";

// Called only after verified identity, owner protection and D1 closure have succeeded.
export async function deleteAuthAccount() {
  try {
    const client = await authClient(), { data: { session } } = await client.auth.getSession();
    if (!session) return false;
    const { url, key } = authConfig();
    const response = await fetch(`${url}/functions/v1/delete-own-account`, {
      method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, apikey: key },
      signal: AbortSignal.timeout(25000), redirect: "error",
    });
    if (!response.ok) return false;
    await client.auth.signOut({ scope: "local" });
    return true;
  } catch { return false; }
}
