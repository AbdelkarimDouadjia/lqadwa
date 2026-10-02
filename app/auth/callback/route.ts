import { authClient } from "@/lib/supabase-server";
import { safeReturnPath } from "@/lib/auth-redirect";
import { privateHeaders } from "@/lib/http-security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get("code");
  let target = "/login?expired=1";
  if (code && code.length < 4096) {
    try {
      const { error } = await (await authClient()).auth.exchangeCodeForSession(code);
      if (!error) target = url.searchParams.get("recovery") === "1" ? "/login?mode=update" : safeReturnPath(url.searchParams.get("next"));
    } catch { /* Fail closed and offer sign-in again. */ }
  }
  return new Response(null, { status: 303, headers: { ...privateHeaders, Location: new URL(target, url.origin).href } });
}
