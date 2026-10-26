import { catalogVersion, searchMedicines } from "@/lib/medicine-catalog";
import { currentReleasePolicy } from "@/lib/release-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if(currentReleasePolicy().mode!=="CORE")return Response.json({items:[],error:"Medicine lookup is closed while the service is information-only."},{status:503,headers:{"Cache-Control":"private, no-store"}});
  const query = new URL(request.url).searchParams.get("q") || "";
  return Response.json({ items: searchMedicines(query), source: "MIPH 2026-08", catalogVersion }, { headers: { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
