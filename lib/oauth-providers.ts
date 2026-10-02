import { authConfig } from "./supabase-server";

export type OAuthProvider = "google" | "apple";
let cached: { expires: number; providers: Record<OAuthProvider, boolean> } | undefined;
// Only advertise providers enabled by the operator. No OAuth secrets reach clients.
export async function oauthProviders(): Promise<Record<OAuthProvider, boolean>> {
  if (cached && cached.expires > Date.now()) return cached.providers;
  const { url, key } = authConfig();
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("settings");
    const settings = await response.json() as { external?: Record<string, boolean> };
    const providers = { google: settings.external?.google === true, apple: settings.external?.apple === true };
    cached = { expires: Date.now() + 30000, providers };
    return providers;
  } catch { return { google: false, apple: false }; }
}
