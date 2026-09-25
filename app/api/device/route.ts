import { z } from "zod";
import { database } from "@/db";
import { audit, HttpError, identity, tokenHash } from "@/lib/access";
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
    const raw = await request.text(); if (raw.length > 1024) throw new HttpError("Request too large", 413);
    const input = schema.parse(JSON.parse(raw)), db = database(), now = Date.now();
    if (input.action === "create") {
      const requestKey = await tokenHash(request.headers.get("cf-connecting-ip") || "local");
      const count = await db.prepare("SELECT count(*) AS n FROM device_links WHERE request_key = ? AND created > ?").bind(requestKey, now - 3600_000).first<{ n: number }>();
      if ((count?.n || 0) >= 20) throw new HttpError("Too many sign-in attempts. Try later.", 429);
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
      // Browser SIWC only. Mobile sessions cannot approve another device.
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
      const challenge = await tokenHash(input.verifier);
      const link = await db.prepare("SELECT owner FROM device_links WHERE id = ? AND challenge = ? AND expires > ?").bind(input.id, challenge, now).first<{ owner: string | null }>();
      if (!link) throw new HttpError("Expired or invalid device link", 401);
      if (!link.owner) return json({ pending: true }, 202);
      const consumed = await db.prepare("UPDATE device_links SET consumed = 1 WHERE id = ? AND challenge = ? AND consumed = 0 AND expires > ? RETURNING owner").bind(input.id, challenge, now).first<{ owner: string }>();
      if (!consumed) throw new HttpError("Already exchanged", 409);
      if (await db.prepare("SELECT owner FROM account_controls WHERE owner = ? AND suspended = 1").bind(consumed.owner).first()) throw new HttpError("Account suspended", 403);
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      await db.prepare("INSERT INTO mobile_sessions (hash, owner, created, expires) VALUES (?, ?, ?, ?)").bind(await tokenHash(token), consumed.owner, now, now + 7 * 86400_000).run();
      return json({ token, expires: now + 7 * 86400_000 });
    }
    await identity(request);
    await db.prepare("DELETE FROM mobile_sessions WHERE hash = ?").bind(await tokenHash(request.headers.get("x-lqadwa-session") || "")).run();
    return json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    if (error instanceof z.ZodError || error instanceof SyntaxError) return json({ error: "Invalid request" }, 400);
    console.error("Device sign-in unavailable", error instanceof Error ? error.message : "unknown");
    return json({ error: "Service unavailable. Please retry." }, 503);
  }
}
