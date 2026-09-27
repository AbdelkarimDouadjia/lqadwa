import { z } from "zod";
import { database } from "@/db";
import { HttpError, identity, isRootAdmin, tokenHash } from "@/lib/access";
import { limitedJson, privateHeaders, rateLimit, requireMutationOrigin } from "@/lib/http-security";
export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });
function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: "Invalid confirmation" }, 400);
  console.error("Account operation failed"); return json({ error: "Service unavailable; retry later." }, 503);
}
export async function GET(request: Request) {
  try {
    const user = await identity(request, { allowClosed: true, allowSuspended: true }), db = database(), owner = user.userId;
    await rateLimit(owner, "account-read", 30);
    const closed = Boolean(await db.prepare("SELECT hash FROM closed_accounts WHERE hash = ?").bind(await tokenHash(owner)).first());
    if (new URL(request.url).searchParams.get("export") !== "1") return json({ closed, canDelete: !isRootAdmin(owner) });
    // Only the current person's data. Never include other patients or authentication secrets.
    const page = z.coerce.number().int().min(0).max(10000).parse(new URL(request.url).searchParams.get("page") || "0");
    const limit = 1000, offset = page * limit;
    const rows = await db.batch([
      db.prepare("SELECT name, city FROM profiles WHERE id = ?").bind(owner),
      db.prepare("SELECT id, medicine, city, created FROM requests WHERE owner = ? ORDER BY created, id LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT b.id, b.request, b.pharmacy, b.created, b.expires, b.status FROM reservations b WHERE b.owner = ? ORDER BY b.created, b.id LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT name, address, city, latitude, longitude, phone, license, status, hours, created FROM registered_pharmacies WHERE owner = ?").bind(owner),
      db.prepare("SELECT s.name, s.quantity, s.updated FROM stock_items s JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE p.owner = ? ORDER BY s.id LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT title, created, read FROM notifications WHERE owner = ? ORDER BY created, id LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT s.request, s.pharmacy, s.status, s.updated FROM responses s JOIN requests r ON r.id = s.request WHERE r.owner = ? ORDER BY s.request, s.pharmacy LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT l.reservation, l.latitude, l.longitude, l.updated FROM reservation_locations l JOIN reservations b ON b.id = l.reservation WHERE b.owner = ? ORDER BY l.reservation LIMIT ? OFFSET ?").bind(owner, limit + 1, offset),
      db.prepare("SELECT suspended FROM account_controls WHERE owner = ?").bind(owner),
    ]);
    const keys = ["profile", "requests", "reservations", "pharmacy", "stock", "notifications", "responses", "sharedLocation", "securityStatus"];
    const data = Object.fromEntries(rows.map((r, i) => [keys[i], r.results.slice(0, limit)]));
    const next = rows.some(r => r.results.length > limit) ? `/api/account?export=1&page=${page + 1}` : null;
    return new Response(JSON.stringify({ app: "LQADWA", exported: new Date().toISOString(), page, next, data }, null, 2), { headers: { ...privateHeaders, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="lqadwa-my-data.json"' } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const input = z.object({ action: z.enum(["delete", "reopen"]), confirmation: z.literal("LQADWA") }).parse(await limitedJson(request, 512));
    const user = await identity(request, { allowClosed: true, allowSuspended: true }), owner = user.userId, db = database();
    await rateLimit(owner, "account-write", 3, 3600);
    if (input.action === "reopen") {
      // Rejoining is an explicit browser action, never an automatic side-effect of a stale cookie.
      if (request.headers.has("x-lqadwa-session")) throw new HttpError("Browser sign-in required", 403);
      if (await db.prepare("SELECT owner FROM account_controls WHERE owner = ? AND suspended = 1").bind(owner).first()) throw new HttpError("Contact support before rejoining", 403);
      await db.prepare("DELETE FROM closed_accounts WHERE hash = ?").bind(await tokenHash(owner)).run();
      return json({ reopened: true });
    }
    if (isRootAdmin(owner)) throw new HttpError("Transfer platform ownership before deleting this owner account. / انقل ملكية المنصة أولاً.", 409);
    const hash = await tokenHash(owner), now = Date.now();
    await db.batch([
      db.prepare("INSERT INTO closed_accounts (hash, created) VALUES (?, ?) ON CONFLICT(hash) DO NOTHING").bind(hash, now),
      db.prepare("INSERT INTO notifications (id, owner, title, created, read) SELECT lower(hex(randomblob(16))), b.owner, 'LQADWA: pharmacy account closed; your active reservation was cancelled.', ?, 0 FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE p.owner = ? AND b.owner != ? AND b.status = 'active' AND b.expires > ?").bind(now, owner, owner, now),
      db.prepare("DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE owner = ? OR pharmacy IN (SELECT id FROM registered_pharmacies WHERE owner = ?))").bind(owner, owner),
      db.prepare("UPDATE reservations SET status = 'cancelled' WHERE pharmacy IN (SELECT id FROM registered_pharmacies WHERE owner = ?) AND status = 'active'").bind(owner),
      db.prepare("DELETE FROM reservations WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM responses WHERE request IN (SELECT id FROM requests WHERE owner = ?) OR pharmacy IN (SELECT id FROM registered_pharmacies WHERE owner = ?)").bind(owner, owner),
      db.prepare("DELETE FROM requests WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM stock_items WHERE pharmacy IN (SELECT id FROM registered_pharmacies WHERE owner = ?)").bind(owner),
      db.prepare("DELETE FROM audit_log WHERE target IN (SELECT id FROM registered_pharmacies WHERE owner = ?)").bind(owner),
      db.prepare("DELETE FROM registered_pharmacies WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM pharmacy_settings WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM notifications WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM mobile_sessions WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM device_links WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM admin_invites WHERE used_by = ? OR created_by = ?").bind(owner, owner),
      db.prepare("DELETE FROM admin_members WHERE owner = ?").bind(owner),
      // Preserve a suspension flag so deletion cannot bypass a safety suspension; remove free-text reason.
      db.prepare("UPDATE account_controls SET reason = '' WHERE owner = ?").bind(owner),
      db.prepare("DELETE FROM audit_log WHERE actor = ? OR target = ?").bind(owner, owner),
      db.prepare("DELETE FROM profiles WHERE id = ?").bind(owner),
    ]);
    return json({ deleted: true });
  } catch (error) { return failure(error); }
}
