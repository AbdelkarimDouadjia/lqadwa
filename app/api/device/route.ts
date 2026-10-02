import { z } from "zod";
import { limitedJson, rateLimit } from "@/lib/http-security";
import { database } from "@/db";
import { audit, HttpError, identity, tokenHash } from "@/lib/access";
import { createDeviceSession } from "@/lib/device-session";
export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), challenge: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ action: z.literal("approve"), id: z.string().uuid(), code: z.string().regex(/^[0-9A-F]{8}$/) }),
  z.object({ action: z.literal("exchange"), id: z.string().uuid(), verifier: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ action: z.literal("logout") }),
]);
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await limitedJson(request, 1024)), db = database(), now = Date.now();
    if (input.action === "create") {
      const requestKey = await tokenHash(request.headers.get("cf-connecting-ip") || "local");
      await rateLimit(requestKey, "device-create", request.headers.has("cf-connecting-ip") ? 20 : 100, 3600);
      const id = crypto.randomUUID(), code = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      await db.batch([
        db.prepare("DELETE FROM device_links WHERE created < ?").bind(now - 86400_000),
        db.prepare("DELETE FROM mobile_sessions WHERE expires < ?").bind(now),
        db.prepare("INSERT INTO device_links (id, challenge, code, request_key, created, expires) VALUES (?, ?, ?, ?, ?, ?)").bind(id, input.challenge, code, requestKey, now, now + 600_000),
      ]);
      return json({ id, code, expires: now + 600_000, url: `/connect?id=${id}` });
    }
    if (input.action === "approve") {
      if (request.headers.get("origin") !== new URL(request.url).origin) throw new HttpError("Invalid origin", 403);
      // Verified browser session only. Mobile sessions cannot approve another device.
      if (request.headers.has("x-lqadwa-session")) throw new HttpError("Use browser sign-in", 403);
      const user = await identity();
      const row = await db.prepare("UPDATE device_links SET attempts = attempts + 1 WHERE id = ? AND expires > ? AND owner IS NULL AND attempts < 5 RETURNING code").bind(input.id, now).first<{ code: string }>();
      if (!row || row.code !== input.code) throw new HttpError("رمز غير صحيح أو منتهي الصلاحية. / Code incorrect or expired.", 400);
      const saved = await db.prepare("UPDATE device_links SET owner = ? WHERE id = ? AND owner IS NULL AND expires > ?").bind(user.userId, input.id, now).run();
      if (!saved.meta.changes) throw new HttpError("Already used", 409);
      await audit(user.userId, "device-linked", input.id, "Native Android session approved").run();
      return json({ approved: true });
    }
    if (input.action === "exchange") {
      await rateLimit(input.id, "device-exchange", 30);
      const challenge = await tokenHash(input.verifier);
      const link = await db.prepare("SELECT owner FROM device_links WHERE id = ? AND challenge = ? AND expires > ?").bind(input.id, challenge, now).first<{ owner: string | null }>();
      if (!link) throw new HttpError("Expired or invalid device link", 401);
      if (!link.owner) return json({ pending: true }, 202);
      const consumed = await db.prepare("UPDATE device_links SET consumed = 1 WHERE id = ? AND challenge = ? AND consumed = 0 AND expires > ? RETURNING owner").bind(input.id, challenge, now).first<{ owner: string }>();
      if (!consumed) throw new HttpError("Already exchanged", 409);
      if (await db.prepare("SELECT owner FROM account_controls WHERE owner = ? AND suspended = 1").bind(consumed.owner).first()) throw new HttpError("Account suspended", 403);
      return json(await createDeviceSession(consumed.owner));
    }
    await identity(request);
    await db.prepare("DELETE FROM mobile_sessions WHERE hash = ?").bind(await tokenHash(request.headers.get("x-lqadwa-session") || "")).run();
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid request" }, 400);
    console.error("Device sign-in unavailable", error instanceof Error ? error.name : "unknown");
    return json({ error: "Service unavailable. Please retry." }, 503);
  }
}
