import { currentReleasePolicy } from "@/lib/release-runtime";
import { privateHeaders } from "@/lib/http-security";
export const dynamic = "force-dynamic";
export async function GET() { return Response.json(currentReleasePolicy(), { headers: privateHeaders }); }
