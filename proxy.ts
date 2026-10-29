import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "@/lib/supabase-server";
import { securityHeaders } from "./next.config";
import { publicLanguage } from "@/lib/public-page";
import { env } from "cloudflare:workers";
import { assistantPolicy } from "@/lib/assistant-contract";

function secured(response: NextResponse) {
  securityHeaders.forEach(({ key, value }) => response.headers.set(key, value));
  return response;
}

// API handlers write cookies directly; protected server-rendered pages need proxy refresh.
export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-lqadwa-locale", publicLanguage(request.nextUrl.searchParams.get("lang"), publicLanguage(request.cookies.get("lqadwa-language")?.value)));
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const authRoot = request.nextUrl.pathname === "/" && request.cookies.getAll().some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
  const assistantPage = request.nextUrl.pathname === "/assistant" && assistantPolicy(env).enabled;
  if (request.nextUrl.pathname === "/") response.headers.set("Cache-Control", "private, no-store");
  // Keep early redirects protected, without refreshing Auth on public/API paths.
  if (!authRoot && !assistantPage && !["/connect", "/operations", "/operations/editor", "/operations/security", "/operations/assistant", "/operations/assistant/chat"].includes(request.nextUrl.pathname)) return secured(response);
  const settings = authConfig();
  const client = createServerClient(settings.url, settings.key, {
    cookieOptions: authCookieOptions,
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items, cacheHeaders) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        requestHeaders.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers: requestHeaders } });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders || {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return secured(response);
}
export const config = { matcher: ["/:path*"] };
