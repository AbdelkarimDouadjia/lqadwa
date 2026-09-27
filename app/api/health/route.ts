import { database } from "@/db";
export const dynamic = "force-dynamic";
// No identity, configuration, counts or private records in public health output.
export async function GET() {
  try {
    await database().prepare("SELECT 1").first();
    return Response.json({ status: "ok", release: "0.11.0-rc1" }, { headers: { "Cache-Control": "public, max-age=30", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
