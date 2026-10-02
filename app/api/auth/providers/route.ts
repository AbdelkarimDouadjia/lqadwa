import { oauthProviders } from "@/lib/oauth-providers";
import { privateHeaders } from "@/lib/http-security";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await oauthProviders(), { headers: privateHeaders });
}
