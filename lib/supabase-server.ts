import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "cloudflare:workers";

export function authConfig() {
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error("Authentication configuration missing");
  return { url: env.SUPABASE_URL, key: env.SUPABASE_PUBLISHABLE_KEY };
}
export const authCookieOptions = { httpOnly: true, secure: !import.meta.env.DEV, sameSite: "lax" as const, path: "/", maxAge: 7 * 86400 };
export async function authClient() {
  const store = await cookies(), config = authConfig();
  return createServerClient(config.url, config.key, {
    cookieOptions: authCookieOptions,
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try { for (const { name, value, options } of items) store.set(name, value, options); }
        catch { /* Server-component refresh is handled by proxy.ts. */ }
      },
    },
  });
}
