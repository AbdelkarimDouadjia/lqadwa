import { authClient } from "@/lib/supabase-server";
import { database } from "@/db";
import { isRootAdmin, tokenHash } from "@/lib/access";
import { privateHeaders } from "@/lib/http-security";
export const dynamic = "force-dynamic";
// Only the caller's verified identity; never accept a user ID from the request.
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_.-]{50,4096})$/)?.[1];
  if (!token) return Response.json({ closed: false }, { status: 401, headers: privateHeaders });
  try {
    const { data: { user }, error } = await (await authClient()).auth.getUser(token);
    if (error || !user?.email_confirmed_at || user.is_anonymous) return Response.json({ closed: false }, { status: 401, headers: privateHeaders });
    const closed = !isRootAdmin(user.id) && Boolean(await database().prepare("SELECT hash FROM closed_accounts WHERE hash = ?").bind(await tokenHash(user.id)).first());
    return Response.json({ closed }, { headers: privateHeaders });
  } catch { return Response.json({ closed: false }, { status: 503, headers: privateHeaders }); }
}
