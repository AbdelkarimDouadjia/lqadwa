import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "@/lib/supabase-server";
import { securityHeaders } from "./next.config";

function secured(response: NextResponse) {
  securityHeaders.forEach(({ key, value }) => response.headers.set(key, value));
  return response;
}

// API handlers write cookies directly; protected server-rendered pages need proxy refresh.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Keep early redirects protected, without refreshing Auth on public/API paths.
  if (!["/connect", "/operations"].includes(request.nextUrl.pathname)) return secured(response);
  const settings = authConfig();
  const client = createServerClient(settings.url, settings.key, {
    cookieOptions: authCookieOptions,
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }) },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(items, cacheHeaders) {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
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
