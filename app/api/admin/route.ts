import { z } from "zod";
import { env } from "cloudflare:workers";
import { database } from "@/db";
import { adminAccess, audit, HttpError, identity, isAdmin, isRootAdmin } from "@/lib/access";
import { limitedJson, privateHeaders, rateLimit, requireMutationOrigin } from "@/lib/http-security";
import { cities } from "@/lib/domain";
import { adminPermissions, type AdminPermission } from "@/lib/admin-permissions";
import type { ManagementRow, ServiceControls } from "@/lib/admin-management";
import { stopPharmacyBookings } from "@/lib/pharmacy-status";
import { personalSchema, healthSchema, pharmacyDetailsSchema, parseDetails } from "@/lib/profile-details";
import { requirePrivilegedSession } from "@/lib/privileged-access";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: privateHeaders });
const id = z.string().min(1).max(100), reason = z.string().trim().min(3).max(200);
const city = z.enum(cities.map(c => c.id) as [string, ...string[]]);
const pharmacyFields = { name: z.string().trim().min(3).max(100), address: z.string().trim().min(8).max(160), city,
  latitude: z.number().min(18.9).max(37.2), longitude: z.number().min(-8.7).max(12), phone: z.string().regex(/^0\d{8,9}$/),
  license: z.string().trim().min(5).max(100), hours: z.string().trim().min(3).max(100), duty: z.boolean() };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("account-edit"), id, name: z.string().trim().min(2).max(121), city, details: personalSchema.optional(), reason }),
  z.object({ action: z.literal("pharmacy-details"), id, details: pharmacyDetailsSchema, reason }),
  z.object({ action: z.literal("pharmacy-create"), owner: id, ...pharmacyFields, reason }),
  z.object({ action: z.literal("pharmacy-edit"), id, updated: z.number().int(), ...pharmacyFields, reason }),
  z.object({ action: z.literal("pharmacy-remove"), id, reason }),
  z.object({ action: z.literal("stock-save"), id: id.optional(), pharmacy: id, name: z.string().trim().min(2).max(512), quantity: z.number().int().min(0).max(9999), reason }),
  z.object({ action: z.literal("stock-delete"), id, reason }),
  z.object({ action: z.literal("reservation-cancel"), id, reason }),
  z.object({ action: z.literal("request-stop"), id, reason }),
  z.object({ action: z.literal("service-save"), requests_paused: z.boolean(), pickups_paused: z.boolean(), message: z.string().trim().max(300), updated: z.number().int(), reason }),
]);
function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: "تحقق من الحقول المطلوبة / Check the required fields." }, 400);
  console.error("Admin management failed", error instanceof Error ? error.name : "unknown");
  return json({ error: "تعذر تنفيذ العملية. حدّث الصفحة ثم حاول مجدداً / Refresh and retry." }, 503);
}
async function access(request: Request) {
  const user = await identity(request), permissions = await adminAccess(user.userId);
  if (!permissions) throw new HttpError("Admin access required", 403);
  await requirePrivilegedSession(user.userId, request);
  return { owner: user.userId, ...permissions };
}
export async function GET(request: Request) {
  try {
    const actor = await access(request), db = database();
    await rateLimit(actor.owner, "admin-read", 60);
    const url = new URL(request.url), section = z.enum(["overview", "accounts", "pharmacies", "inventory", "requests", "reservations", "audit", "service"]).parse(url.searchParams.get("section") || "overview");
    const permission: AdminPermission | null = ({ overview: "analytics", accounts: "accounts", pharmacies: "pharmacies", inventory: "pharmacies", requests: "operations", reservations: "operations", audit: "audit", service: null } as const)[section];
    if (permission ? !actor.permissions.includes(permission) : !actor.isOwner) throw new HttpError("Permission required", 403);
    const page = z.coerce.number().int().min(0).max(100000).parse(url.searchParams.get("page") || 0);
    const query = z.string().max(100).parse(url.searchParams.get("q") || "").trim();
    if (section === "service") return json({ rows: [], total: 0, page, service: await db.prepare("SELECT requests_paused, pickups_paused, message, updated FROM service_controls WHERE id = 1").first<ServiceControls>() });
    if (section === "overview") {
      const now = Date.now(), since = now - 30 * 86400_000;
      const results = await db.batch([
        db.prepare("SELECT (SELECT count(*) FROM profiles) AS users, (SELECT count(*) FROM registered_pharmacies WHERE status = 'approved') AS approved, (SELECT count(*) FROM registered_pharmacies WHERE status = 'pending') AS pending, (SELECT count(*) FROM account_controls WHERE suspended = 1) AS suspended, (SELECT count(*) FROM requests WHERE created >= ?) AS searches30, (SELECT count(*) FROM reservations WHERE created >= ?) AS bookings30, (SELECT count(*) FROM reservations WHERE status = 'active' AND expires > ?) AS active, (SELECT count(*) FROM reservations WHERE status = 'collected') AS collected, (SELECT count(*) FROM reservations WHERE status = 'cancelled') AS cancelled, (SELECT count(*) FROM reservations WHERE status = 'expired' OR (status = 'active' AND expires <= ?)) AS expired, (SELECT count(*) FROM stock_items) AS stock").bind(since, since, now, now),
        db.prepare("WITH RECURSIVE days(day,n) AS (SELECT date('now','-13 days'),0 UNION ALL SELECT date(day,'+1 day'),n+1 FROM days WHERE n<13), searches AS (SELECT date(created/1000,'unixepoch') AS day,count(*) AS n FROM requests WHERE created >= ? GROUP BY day), bookings AS (SELECT date(created/1000,'unixepoch') AS day,count(*) AS n FROM reservations WHERE created >= ? GROUP BY day) SELECT days.day, COALESCE(searches.n,0) AS searches, COALESCE(bookings.n,0) AS bookings FROM days LEFT JOIN searches USING(day) LEFT JOIN bookings USING(day) ORDER BY days.day").bind(now - 14 * 86400_000, now - 14 * 86400_000),
      ]);
      return json({ rows: [], page, total: 0, metrics: results[0].results[0], daily: results[1].results });
    }
    // Only server-owned SQL fragments; filter text and pagination remain bound values.
    const queries = {
      accounts: "SELECT p.id,p.name,p.city,p.details,p.health,a.email,a.permissions,a.invited_by AS invitedBy,a.created AS adminSince,COALESCE(c.suspended,0) AS suspended,COALESCE(c.reason,'') AS reason,CASE WHEN a.owner IS NOT NULL THEN 'admin' WHEN f.id IS NOT NULL THEN 'pharmacist' ELSE 'client' END AS role FROM profiles p LEFT JOIN account_controls c ON c.owner=p.id LEFT JOIN admin_members a ON a.owner=p.id LEFT JOIN registered_pharmacies f ON f.owner=p.id",
      pharmacies: "SELECT id,owner,name,address,city,latitude/1000000.0 AS latitude,longitude/1000000.0 AS longitude,phone,license,status,duty,hours,created,updated,details FROM registered_pharmacies",
      inventory: "SELECT s.id,s.pharmacy,s.name,s.quantity,s.updated,p.name AS pharmacyName FROM stock_items s JOIN registered_pharmacies p ON p.id=s.pharmacy",
      requests: "SELECT r.id,r.owner,r.medicine AS name,r.city,r.created,CASE WHEN c.request IS NOT NULL THEN 'stopped' WHEN r.created <= ? THEN 'expired' ELSE 'active' END AS status FROM requests r LEFT JOIN request_controls c ON c.request=r.id",
      reservations: "SELECT b.id,b.owner,b.request,b.pharmacy,p.name AS pharmacyName,r.medicine AS name,b.created,b.expires,CASE WHEN b.status='active' AND b.expires<=? THEN 'expired' ELSE b.status END AS status FROM reservations b JOIN requests r ON r.id=b.request LEFT JOIN registered_pharmacies p ON p.id=b.pharmacy",
      audit: "SELECT id,actor,action AS name,target,detail,created FROM audit_log",
    };
    const inner = queries[section], hasTime = section === "requests" || section === "reservations";
    const bindings = hasTime ? [section === "requests" ? Date.now() - 86400_000 : Date.now()] : [];
    const filter = " WHERE instr(lower(COALESCE(name,'') || ' ' || id),lower(?)) > 0";
    const order = section === "accounts" ? "name,id" : section === "inventory" ? "updated DESC,id" : "created DESC,id";
    const results = await db.batch([
      db.prepare(`SELECT * FROM (${inner})${filter} ORDER BY ${order} LIMIT 50 OFFSET ?`).bind(...bindings, query, page * 50),
      db.prepare(`SELECT count(*) AS n FROM (${inner})${filter}`).bind(...bindings, query),
    ]);
    const rows = results[0].results as ManagementRow[];
    for (const row of rows) {
      if (section === "accounts") {
        Object.assign(row, parseDetails(personalSchema,row.details)); delete row.details;
        const health = parseDetails(healthSchema,row.health); delete row.health;
        if (actor.isOwner && health.shareWithOwner) Object.assign(row,{conditions:health.conditions,chronicConditions:health.chronicConditions,allergies:health.allergies});
        if (!actor.isOwner) { delete row.email; delete row.permissions; delete row.invitedBy; delete row.adminSince; }
        else if (isRootAdmin(String(row.id))) { row.email=env.APP_OWNER_EMAIL || ""; row.permissions=JSON.stringify(adminPermissions); }
      } else if (section === "pharmacies") { Object.assign(row,parseDetails(pharmacyDetailsSchema,row.details)); delete row.details; }
    }
    if (section === "accounts") for (const row of rows) { row.protected = row.id === actor.owner || isRootAdmin(String(row.id)) || (!actor.isOwner && row.role === "admin"); if (isRootAdmin(String(row.id))) row.role = "owner"; }
    return json({ rows, total: (results[1].results[0] as {n:number}).n, page });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const actor = await access(request), db = database(), now = Date.now();
    await rateLimit(actor.owner, "admin-write", 40);
    const input = schema.parse(await limitedJson(request));
    const permission: AdminPermission = input.action.startsWith("account") ? "accounts" : input.action.startsWith("pharmacy") || input.action.startsWith("stock") ? "pharmacies" : "operations";
    if (input.action === "service-save" ? !actor.isOwner : !actor.permissions.includes(permission)) throw new HttpError("Permission required", 403);
    const target = input.action === "stock-save" ? input.id || crypto.randomUUID() : "id" in input ? input.id : "owner" in input ? input.owner : "service";
    const log = audit(actor.owner, input.action, target, input.reason);
    const changedLog = db.prepare("INSERT INTO audit_log (id,actor,action,target,detail,created) SELECT ?,?,?,?,?,? WHERE changes()>0").bind(crypto.randomUUID(),actor.owner,input.action,target,input.reason,now);
    if (input.action === "account-edit") {
      if (isRootAdmin(input.id) || input.id === actor.owner || (!actor.isOwner && await isAdmin(input.id))) throw new HttpError("Protected account; use its own profile settings", 403);
      if (!await db.prepare("SELECT id FROM profiles WHERE id=?").bind(input.id).first()) throw new HttpError("Account not found", 404);
      const name=input.details ? [input.details.firstName,input.details.lastName].filter(Boolean).join(" ") || input.name : input.name;
      await db.batch([db.prepare("UPDATE profiles SET name=?,city=?,details=COALESCE(?,details) WHERE id=?").bind(name,input.city,input.details?JSON.stringify(input.details):null,input.id),log]);
    } else if (input.action === "pharmacy-details") {
      const result=await db.batch([db.prepare("UPDATE registered_pharmacies SET details=?,updated=MAX(updated+1,?) WHERE id=?").bind(JSON.stringify(input.details),now,input.id),changedLog]);
      if(!result[0].meta.changes)throw new HttpError("Pharmacy not found",404);
    } else if (input.action === "pharmacy-create") {
      if (!actor.permissions.includes("accounts")) throw new HttpError("Account-management permission required",403);
      if (!actor.isOwner && await isAdmin(input.owner)) throw new HttpError("Protected account",403);
      if (!await db.prepare("SELECT id FROM profiles WHERE id=?").bind(input.owner).first()) throw new HttpError("The owner must register first",404);
      if (await db.prepare("SELECT id FROM registered_pharmacies WHERE owner=?").bind(input.owner).first()) throw new HttpError("Account already has a pharmacy",409);
      await db.batch([db.prepare("INSERT INTO registered_pharmacies (id,owner,name,address,city,latitude,longitude,phone,license,status,duty,hours,created,updated) VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?,?,?)").bind(crypto.randomUUID(),input.owner,input.name,input.address,input.city,Math.round(input.latitude*1e6),Math.round(input.longitude*1e6),input.phone,input.license,Number(input.duty),input.hours,now,now),log]);
    } else if (input.action === "pharmacy-edit") {
      const result = await db.batch([db.prepare("UPDATE registered_pharmacies SET name=?,address=?,city=?,latitude=?,longitude=?,phone=?,license=?,hours=?,duty=?,updated=? WHERE id=? AND updated=?").bind(input.name,input.address,input.city,Math.round(input.latitude*1e6),Math.round(input.longitude*1e6),input.phone,input.license,input.hours,Number(input.duty),Math.max(now,input.updated+1),input.id,input.updated),changedLog]);
      if (!result[0].meta.changes) throw new HttpError("Record changed; refresh before editing",409);
    } else if (input.action === "pharmacy-remove") {
      // Archive, never erase pickup history or orphan another patient's reservation.
      if (!await db.prepare("SELECT id FROM registered_pharmacies WHERE id=?").bind(input.id).first()) throw new HttpError("Pharmacy not found",404);
      await db.batch([db.prepare("UPDATE registered_pharmacies SET status='suspended',duty=0,updated=? WHERE id=?").bind(now,input.id),...stopPharmacyBookings(input.id,now),log]);
    } else if (input.action === "stock-save") {
      if (!await db.prepare("SELECT id FROM registered_pharmacies WHERE id=?").bind(input.pharmacy).first()) throw new HttpError("Pharmacy not found",404);
      const duplicate = await db.prepare("SELECT id FROM stock_items WHERE pharmacy=? AND name=? AND id!=?").bind(input.pharmacy,input.name,input.id || "").first();
      if (duplicate) throw new HttpError("Medicine already exists in this inventory; edit its existing entry",409);
      if (input.id && !await db.prepare("SELECT id FROM stock_items WHERE id=? AND pharmacy=?").bind(input.id,input.pharmacy).first()) throw new HttpError("Stock item not found",404);
      await db.batch([input.id ? db.prepare("UPDATE stock_items SET medicine_id=CASE WHEN name=? THEN medicine_id ELSE NULL END,catalog_version=CASE WHEN name=? THEN catalog_version ELSE NULL END,identity_json=CASE WHEN name=? THEN identity_json ELSE NULL END,name=?,quantity=?,updated=? WHERE id=? AND pharmacy=?").bind(input.name,input.name,input.name,input.name,input.quantity,now,input.id,input.pharmacy) : db.prepare("INSERT INTO stock_items (id,pharmacy,name,quantity,updated) VALUES (?,?,?,?,?)").bind(target,input.pharmacy,input.name,input.quantity,now),log]);
    } else if (input.action === "stock-delete") {
      if (!await db.prepare("SELECT id FROM stock_items WHERE id=?").bind(input.id).first()) throw new HttpError("Stock item not found",404);
      await db.batch([db.prepare("DELETE FROM stock_items WHERE id=?").bind(input.id),log]);
    } else if (input.action === "reservation-cancel" || input.action === "request-stop") {
      const isRequest = input.action === "request-stop";
      const entity = await db.prepare(isRequest ? "SELECT id FROM requests WHERE id=?" : "SELECT id FROM reservations WHERE id=? AND status='active' AND expires>?").bind(...(isRequest ? [input.id] : [input.id,now])).first();
      if (!entity) throw new HttpError("Record missing or reservation no longer active",409);
      const predicate = isRequest ? "request=?" : "id=?";
      await db.batch([
        ...(isRequest ? [db.prepare("INSERT INTO request_controls (request) VALUES (?) ON CONFLICT(request) DO NOTHING").bind(input.id),db.prepare("UPDATE responses SET status='no',updated=? WHERE request=?").bind(now,input.id),db.prepare("INSERT INTO notifications (id,owner,title,created,read) SELECT lower(hex(randomblob(16))),owner,'LQADWA: availability request stopped by administration. Please contact support.',?,0 FROM requests WHERE id=?").bind(now,input.id)] : []),
        db.prepare(`INSERT INTO notifications (id,owner,title,created,read) SELECT lower(hex(randomblob(16))),owner,'LQADWA: reservation cancelled by administration. Please contact support.',?,0 FROM reservations WHERE ${predicate} AND status='active'`).bind(now,input.id),
        db.prepare(`INSERT INTO notifications (id,owner,title,created,read) SELECT lower(hex(randomblob(16))),p.owner,'LQADWA: reservation cancelled by administration.',?,0 FROM registered_pharmacies p WHERE p.id IN (SELECT pharmacy FROM reservations WHERE ${predicate} AND status='active')`).bind(now,input.id),
        db.prepare(`DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE ${predicate})`).bind(input.id),
        db.prepare(`UPDATE reservations SET status='cancelled' WHERE ${predicate} AND status='active'`).bind(input.id),log,
      ]);
    } else if (input.action === "service-save") {
      const result = await db.batch([db.prepare("UPDATE service_controls SET requests_paused=?,pickups_paused=?,message=?,updated=? WHERE id=1 AND updated=?").bind(Number(input.requests_paused),Number(input.pickups_paused),input.message,Math.max(now,input.updated+1),input.updated),changedLog]);
      if (!result[0].meta.changes) throw new HttpError("Settings changed; refresh before saving",409);
    }
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
