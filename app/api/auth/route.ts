import { z } from "zod";
import { env } from "cloudflare:workers";
import { authClient } from "@/lib/supabase-server";
import { safeReturnPath } from "@/lib/auth-redirect";
import { limitedJson, privateHeaders, rateLimit } from "@/lib/http-security";
import { database } from "@/db";
import { HttpError, isAdmin, tokenHash } from "@/lib/access";
import { adminLoginEmail } from "@/lib/admin-login";
import { createDeviceSession } from "@/lib/device-session";
import { oauthProviders } from "@/lib/oauth-providers";
import { initialPersonalDetails } from "@/lib/profile-details";
import { requireCoreAction, currentReleasePolicy } from "@/lib/release-runtime";
import { isRootAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";
const email = z.string().trim().email().max(254);
const password = z.string().min(12).max(128);
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("admin-login"), identifier: z.string().trim().min(1).max(254), password }),
  z.object({ action: z.literal("oauth"), provider: z.enum(["google", "apple"]), returnTo: z.string().max(1000).optional() }),
  z.object({ action: z.literal("login"), email, password: z.string().min(1).max(128), returnTo: z.string().max(1000).optional(), native: z.boolean().default(false) }),
  z.object({ action: z.literal("register"), email, password, name: z.string().trim().min(2).max(121).optional(), firstName:z.string().trim().min(1).max(60).optional(), lastName:z.string().trim().min(1).max(60).optional(), returnTo: z.string().max(1000).optional() }),
  z.object({ action: z.literal("recover"), email }),
  z.object({ action: z.literal("update"), password }),
  z.object({ action: z.literal("logout") }),
]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privateHeaders });
export async function POST(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    if (request.headers.get("origin") !== origin) return json({ error: "ORIGIN" }, 403);
    const input = schema.parse(await limitedJson(request));
    const ip = request.headers.get("cf-connecting-ip") || "local";
    await rateLimit(ip, `auth-${input.action}`, input.action === "recover" || input.action === "register" ? 3 : 15, 600);
    requireCoreAction(input.action);
    const client = await authClient();
    if (input.action === "oauth") {
      if (!(await oauthProviders())[input.provider]) return json({ error: "PROVIDER_UNAVAILABLE" }, 409);
      const { data, error } = await client.auth.signInWithOAuth({ provider: input.provider, options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(input.returnTo))}`,
        skipBrowserRedirect: true,
      } });
      if (error || !data.url) return json({ error: "UNAVAILABLE" }, 503);
      return json({ redirect: data.url });
    }
    if (input.action === "logout") {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error && error.status !== 401 && error.status !== 403) return json({ error: "UNAVAILABLE" }, 503);
      return json({ ok: true, redirect: "/" });
    }
    if (input.action === "login" || input.action === "admin-login") {
      const address = input.action === "admin-login" ? adminLoginEmail(input.identifier, env.APP_OWNER_EMAIL) : input.email.toLowerCase();
      if (!email.safeParse(address).success) return json({ error: "CREDENTIALS" }, 401);
      await rateLimit(address, "auth-account-login", 10, 600);
      const { data, error } = await client.auth.signInWithPassword({email:address, password:input.password});
      if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) return json({ error: "CREDENTIALS" }, 401);
      if (currentReleasePolicy().mode !== "CORE" && !isRootAdmin(data.user.id) && !await database().prepare("SELECT id FROM profiles WHERE id=?").bind(data.user.id).first()) {
        await client.auth.signOut({scope:"local"});return json({error:"INFORMATION_ONLY"},403);
      }
      if (input.action === "admin-login") {
        const blocked = await database().prepare("SELECT 1 AS blocked FROM closed_accounts WHERE hash = ? UNION ALL SELECT 1 FROM account_controls WHERE owner = ? AND suspended = 1 LIMIT 1").bind(await tokenHash(data.user.id), data.user.id).first();
        if (blocked || !await isAdmin(data.user.id)) { await client.auth.signOut({scope:"local"}); return json({error:"CREDENTIALS"},401); }
        return json({ok:true,redirect:"/operations"});
      }
      if (input.native) {
        try {
          const session = await createDeviceSession(data.user.id);
          await database().prepare("INSERT INTO profiles (id, name, city, details) SELECT ?, ?, 'algiers', ? WHERE NOT EXISTS (SELECT 1 FROM closed_accounts WHERE hash = ?) ON CONFLICT(id) DO NOTHING")
            .bind(data.user.id, String(data.user.user_metadata?.full_name || "LQADWA").slice(0, 121), JSON.stringify(initialPersonalDetails(data.user.user_metadata)), await tokenHash(data.user.id)).run();
          return json({ ok: true, ...session });
        } finally { await client.auth.signOut({ scope: "local" }); }
      }
      return json({ ok: true, redirect: safeReturnPath(input.returnTo) });
    }
    if (input.action === "register") {
      if (Boolean(input.firstName)!==Boolean(input.lastName) || (!input.name && !input.firstName)) return json({error:"FIELDS"},400);
      const name=input.firstName&&input.lastName?`${input.firstName} ${input.lastName}`:input.name!;
      const callback = `${origin}/auth/callback?next=${encodeURIComponent(safeReturnPath(input.returnTo))}`;
      const { error } = await client.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name:name,...(input.firstName?{first_name:input.firstName,last_name:input.lastName}:{}) }, emailRedirectTo: callback } });
      if (error && error.code !== "user_already_exists") return json({ error: error.code === "email_address_not_authorized" || error.code === "over_email_send_rate_limit" ? "EMAIL_DELIVERY" : "UNAVAILABLE" }, 503);
      return json({ ok: true, message: "CHECK_EMAIL" });
    }
    if (input.action === "recover") {
      const { error } = await client.auth.resetPasswordForEmail(input.email, { redirectTo: `${origin}/auth/callback?recovery=1` });
      if (error) return json({ error: "EMAIL_DELIVERY" }, 503);
      return json({ ok: true, message: "CHECK_EMAIL" });
    }
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user?.email_confirmed_at || user.is_anonymous) return json({ error: "CREDENTIALS" }, 401);
    const updated = await client.auth.updateUser({ password: input.password });
    if (updated.error) return json({ error: "PASSWORD" }, 400);
    await database().prepare("DELETE FROM mobile_sessions WHERE owner = ?").bind(user.id).run();
    await client.auth.signOut({ scope: "global" });
    return json({ ok: true, redirect: "/login?changed=1" });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: "FIELDS" }, 400);
    if (error instanceof HttpError) return json({ error: error.code || (error.status === 429 ? "RATE_LIMIT" : "FIELDS") }, error.status);
    console.error("Authentication unavailable");
    return json({ error: "UNAVAILABLE" }, 503);
  }
}
