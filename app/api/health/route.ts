import { database } from "@/db";
import { buildInfo } from "@/lib/build-info";
import { currentReleasePolicy } from "@/lib/release-runtime";
export const dynamic = "force-dynamic";
// No identity, configuration, counts or private records in public health output.
export async function GET() {
  try {
    await database().batch([
      database().prepare("SELECT id FROM landing_content LIMIT 0"),
      database().prepare("SELECT id FROM landing_content_revisions LIMIT 0"),
      database().prepare("SELECT request FROM request_identity LIMIT 0"),
      database().prepare("SELECT medicine_id,catalog_version,identity_json FROM stock_items LIMIT 0"),
    ]);
    return Response.json({ status: "ok", release: "1.1.1", source:buildInfo, mode:currentReleasePolicy().mode, schema:14, management: "2026-10-12", profiles: "2026-10-12", experience: "2026-10-13", design: "2026-10-13", discovery: "2026-10-14", presentation: "2026-10-15", android: "2026-10-15", editor: "2026-10-25" }, { headers: { "Cache-Control": "public, max-age=30", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
