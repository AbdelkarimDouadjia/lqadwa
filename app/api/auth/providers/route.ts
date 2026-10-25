import { oauthProviders } from "@/lib/oauth-providers";
import { privateHeaders } from "@/lib/http-security";
import { currentReleasePolicy } from "@/lib/release-runtime";
export const dynamic = "force-dynamic";
export async function GET() {
  const release = currentReleasePolicy();
  return Response.json({ ...(release.registration ? await oauthProviders() : { google: false, apple: false }), release }, { headers: privateHeaders });
}
