import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const headers = { "Cache-Control": "no-store", "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" };
const json = (value: unknown, status = 200) => Response.json(value, { status, headers });
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "METHOD" }, 405);
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_.-]{50,4096})$/)?.[1];
  if (!token) return json({ error: "AUTH" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    // Platform JWT verification plus live Auth verification: expired/deleted users fail closed.
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user?.email_confirmed_at || user.is_anonymous) return json({ error: "AUTH" }, 401);
    const proof = await fetch("https://lqadwa.lqadwa-dz.workers.dev/api/account/deletion-proof", {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000), redirect: "error",
    });
    if (!proof.ok || ((await proof.json()) as { closed?: boolean }).closed !== true) return json({ error: "CLOSE_ACCOUNT_FIRST" }, 403);
    // The service credential stays inside Supabase. No caller-supplied target is used.
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const revoked = await admin.auth.admin.signOut(token, "global");
    if (revoked.error && revoked.error.status !== 404) return json({ error: "RETRY" }, 503);
    const removed = await admin.auth.admin.deleteUser(user.id);
    if (removed.error) return json({ error: "RETRY" }, 503);
    return json({ deleted: true });
  } catch { return json({ error: "RETRY" }, 503); }
});
