import { z } from "zod";
import { database } from "@/db";
import { cities } from "@/lib/domain";
import { HttpError } from "@/lib/access";
import { privateHeaders, rateLimit, maintainEphemeralData } from "@/lib/http-security";
import { discoverPharmacies, pharmacyFromRow } from "@/lib/pharmacy-discovery";

export const dynamic = "force-dynamic";
const city = z.enum(cities.map(c => c.id) as [string, ...string[]]);
const schema = z.object({
  city, night: z.enum(["true", "false"]).default("false"),
  limit: z.string().regex(/^\d{1,2}$/).transform(Number).pipe(z.number().int().min(1).max(50)).default(50),
  radiusKm: z.string().regex(/^\d{1,3}(\.\d{1,2})?$/).transform(Number).pipe(z.number().min(0).max(100)).optional(),
  cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();
const cursorSchema = z.object({
  v: z.literal(1), city, night: z.boolean(), radiusKm: z.number().min(0).max(100).nullable(),
  score: z.number().finite().min(0).max(1e16), id: z.string().min(1).max(100),
}).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privateHeaders });
function encodeCursor(value: unknown) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value)))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function decodeCursor(value: string) {
  const base = value.replaceAll("-", "+").replaceAll("_", "/");
  const bytes = Uint8Array.from(atob(base.padEnd(Math.ceil(base.length / 4) * 4, "=")), c => c.charCodeAt(0));
  return cursorSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
}
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const keys = [...params.keys()];
    if (keys.length !== new Set(keys).size) return json({ error: "Invalid filters", code: "invalid_filters" }, 400);
    const input = schema.parse(Object.fromEntries(params)), night = input.night === "true";
    let after: { score: number; id: string } | undefined;
    if (input.cursor) {
      try {
        const cursor = decodeCursor(input.cursor);
        if (cursor.city !== input.city || cursor.night !== night || cursor.radiusKm !== (input.radiusKm ?? null)) throw new Error("Cursor filter mismatch");
        after = { score: cursor.score, id: cursor.id };
      } catch { return json({ error: "Invalid cursor", code: "invalid_cursor" }, 400); }
    }
    // Cloudflare supplies this header. Local previews use one shared bucket.
    await rateLimit(request.headers.get("cf-connecting-ip") || "local-directory", "public-directory", 60);
    await maintainEphemeralData();
    const rows = await discoverPharmacies(database(), { city: input.city, night, limit: input.limit + 1, radiusKm: input.radiusKm, after });
    const page = rows.slice(0, input.limit), last = page.at(-1);
    const center = cities.find(c => c.id === input.city)!;
    return json({
      items: page.map(pharmacyFromRow),
      nextCursor: rows.length > input.limit && last ? encodeCursor({ v: 1, city: input.city, night, radiusKm: input.radiusKm ?? null, score: last.score, id: last.id }) : null,
      distanceOrigin: { type: "wilaya-center", approximate: true, lat: center.lat, lng: center.lng },
      availability: "not-confirmed",
    });
  } catch (error) {
    if (error instanceof z.ZodError) return json({ error: "Invalid filters", code: "invalid_filters" }, 400);
    if (error instanceof HttpError) return json({ error: error.message, code: "rate_limited" }, error.status);
    // No query, medicine, GPS, account ID or raw provider error in public logs.
    console.error("Pharmacy directory unavailable");
    return json({ error: "Directory temporarily unavailable", code: "directory_unavailable" }, 503);
  }
}
