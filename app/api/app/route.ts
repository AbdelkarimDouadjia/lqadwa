import { z } from "zod";
import { stopPharmacyBookings } from "@/lib/pharmacy-status";
import { limitedJson, requireMutationOrigin, rateLimit, maintainEphemeralData } from "@/lib/http-security";
import { identity, HttpError, isAdmin, isRootAdmin, rootAdminIds, adminAccess, hasAdminPermission, tokenHash, audit } from "@/lib/access";
import { adminPermissions, parseAdminPermissions } from "@/lib/admin-permissions";
import { personalSchema, parseDetails } from "@/lib/profile-details";
import { database } from "@/db";
import { pharmacyFromRow, relatedPharmacies, type PublicPharmacyRow } from "@/lib/pharmacy-discovery";
import { createAvailabilityRequest } from "@/lib/request-service";
import { recentPrivilegedSession, requirePrivilegedSession } from "@/lib/privileged-access";
import { inAlgeriaBounds, publicPharmacyColumns } from "@/lib/pharmacy-discovery-query.mjs";
import { cities, legacySampleIds, type AppData, type Booking, type Notice, type Reply, type RequestRecord, type PharmacyApplication, type StaffRequest, type StaffBooking, type StockItem } from "@/lib/domain";

export const dynamic = "force-dynamic";
const cityId = z.enum(cities.map((c) => c.id) as [string, ...string[]]);
const id = z.string().min(1).max(100);
const permissions = z.array(z.enum(adminPermissions)).min(1).max(adminPermissions.length).transform(p => [...new Set(p)]);
const adminEmail = z.string().trim().email().max(254).transform(v => v.toLowerCase());
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), medicine: z.string().trim().min(2).max(100), city: cityId, night: z.boolean(), demo: z.literal(false).default(false), token: z.string().uuid() }),
  z.object({ action: z.literal("reply"), request: id, pharmacy: id, available: z.boolean() }),
  z.object({ action: z.literal("reserve"), request: id, pharmacy: id, consent: z.literal(true) }),
  z.object({ action: z.literal("cancel"), reservation: id }),
  z.object({ action: z.literal("collect"), reservation: id, pharmacy: id, code: z.string().regex(/^DZ-[A-F0-9]{8}$/), checked: z.literal(true) }),
  z.object({ action: z.literal("duty"), pharmacy: id, enabled: z.boolean() }),
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(121), city: cityId }),
  z.object({ action: z.literal("register-pharmacy"), name: z.string().trim().min(3).max(100), address: z.string().trim().min(8).max(160), city: cityId, latitude: z.number().min(18.9).max(37.2), longitude: z.number().min(-8.7).max(12), phone: z.string().regex(/^0\d{8,9}$/), license: z.string().trim().min(5).max(100) }),
  z.object({ action: z.literal("admin-review"), pharmacy: id, status: z.enum(["approved", "rejected", "suspended"]) }),
  z.object({ action: z.literal("admin-invite-create"), email: adminEmail, permissions }),
  z.object({ action: z.literal("admin-permissions"), owner: id, permissions }),
  z.object({ action: z.literal("admin-account"), owner: id, suspended: z.boolean(), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal("admin-revoke"), owner: id }),
  z.object({ action: z.literal("admin-invites-revoke") }),
  z.object({ action: z.literal("admin-pharmacy-edit"), pharmacy: id, name: z.string().trim().min(3).max(100), address: z.string().trim().min(8).max(160), phone: z.string().regex(/^0\d{8,9}$/), hours: z.string().trim().min(3).max(100) }),
  z.object({ action: z.literal("sessions-revoke") }),
  z.object({ action: z.literal("admin-invite-redeem"), token: z.string().regex(/^[0-9a-f-]{73}$/) }),
  z.object({ action: z.literal("share-location"), reservation: id, enabled: z.boolean(), latitude: z.number().min(18.9).max(38).optional(), longitude: z.number().min(-9).max(12).optional() }),
  z.object({ action: z.literal("stock-upsert"), pharmacy: id, name: z.string().trim().min(2).max(100), quantity: z.number().int().min(0).max(9999) }),
  z.object({ action: z.literal("stock-delete"), pharmacy: id, item: id }),
  z.object({ action: z.literal("read-notifications") }),
]);
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
type Registered = PharmacyApplication & { owner: string };

function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: "تحقق من البيانات المدخلة ثم أعد المحاولة." }, 400);
  console.error("Application request failed", error instanceof Error ? error.name : "unknown");
  return json({ error: "تعذّر الاتصال بالخدمة. بياناتك الحالية محفوظة؛ حاول مجدداً." }, 503);
}
async function snapshot(owner: string, fallbackName: string, initialDetails: unknown = {}, request?: Request): Promise<AppData> {
  const db = database();
  const now = Date.now();
  await db.batch([
    db.prepare("INSERT INTO profiles (id, name, city, details) SELECT ?, ?, 'algiers', ? WHERE NOT EXISTS (SELECT 1 FROM closed_accounts WHERE hash = ?) ON CONFLICT(id) DO NOTHING").bind(owner, fallbackName, JSON.stringify(parseDetails(personalSchema,initialDetails)), await tokenHash(owner)),
    db.prepare("UPDATE reservations SET status = 'expired' WHERE owner = ? AND status = 'active' AND expires <= ?").bind(owner, now),
    db.prepare("DELETE FROM reservation_locations WHERE updated < ?").bind(now - 5 * 60_000),
  ]);
  const results = await db.batch([
    db.prepare("SELECT id, name, city FROM profiles WHERE id = ?").bind(owner),
    db.prepare("SELECT r.id,r.medicine,r.city,r.created,COALESCE(c.stopped,0) AS stopped FROM requests r LEFT JOIN request_controls c ON c.request=r.id WHERE r.owner = ? ORDER BY r.created DESC LIMIT 100").bind(owner),
    db.prepare("SELECT s.request, s.pharmacy, s.status, s.updated FROM responses s JOIN requests r ON r.id = s.request WHERE r.owner = ? ORDER BY r.created DESC LIMIT 300").bind(owner),
    db.prepare("SELECT b.id, b.request, b.pharmacy, b.code, b.created, b.expires, b.status, r.medicine FROM reservations b JOIN requests r ON b.request = r.id WHERE b.owner = ? ORDER BY b.created DESC LIMIT 100").bind(owner),
    db.prepare("SELECT pharmacy, duty FROM pharmacy_settings WHERE owner = ?").bind(owner),
    db.prepare("SELECT id, title, created, read FROM notifications WHERE owner = ? ORDER BY created DESC LIMIT 40").bind(owner),
    db.prepare(`SELECT ${publicPharmacyColumns} FROM registered_pharmacies WHERE status = 'approved' ORDER BY name,id LIMIT 300`),
    db.prepare("SELECT id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated FROM registered_pharmacies WHERE owner = ? LIMIT 1").bind(owner),
    db.prepare("SELECT r.id, s.pharmacy, r.medicine, r.created, r.city, s.status FROM responses s JOIN requests r ON r.id = s.request JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE p.owner = ? AND p.status = 'approved' AND r.created > ? AND s.status = 'pending' ORDER BY r.created DESC LIMIT 100").bind(owner, now - 24 * 3600_000),
    db.prepare("SELECT b.id, b.request, b.pharmacy, b.created, b.expires, b.status, r.medicine, l.latitude / 1000.0 AS approachLat, l.longitude / 1000.0 AS approachLng, l.updated AS approachUpdated FROM reservations b JOIN requests r ON r.id = b.request JOIN registered_pharmacies p ON p.id = b.pharmacy LEFT JOIN reservation_locations l ON l.reservation = b.id AND l.updated > ? WHERE p.owner = ? AND p.status = 'approved' AND b.status = 'active' AND b.expires > ? ORDER BY b.created DESC LIMIT 100").bind(now - 60_000, owner, now),
    db.prepare("SELECT s.id, s.pharmacy, s.name, s.quantity, s.updated FROM stock_items s JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE p.owner = ? ORDER BY s.updated DESC LIMIT 200").bind(owner),
  ]);
  // Keep legacy sample records recoverable, but never present them as real care.
  const sampleIds = legacySampleIds;
  const sampleRequests = new Set((results[2].results as Reply[]).filter((r) => sampleIds.has(r.pharmacy)).map((r) => r.request));
  const ownPharmacy = results[7].results[0] as Registered | undefined;
  const directory = (results[6].results as PublicPharmacyRow[]).filter(p => !sampleIds.has(p.id) && inAlgeriaBounds(p.latitude / 1e6, p.longitude / 1e6)).map(pharmacyFromRow);
  const associatedIds = [...(results[2].results as Reply[]), ...(results[3].results as Booking[])].map(record => record.pharmacy);
  directory.push(...await relatedPharmacies(db, associatedIds, new Set(directory.map(p => p.id))));
  let admin: AppData["admin"] = null;
  const access = await adminAccess(owner, db);
  const privileged = access && await recentPrivilegedSession(owner, request);
  if (access && privileged) {
    const can = (permission: typeof adminPermissions[number]) => access.permissions.includes(permission);
    const empty = () => db.prepare("SELECT NULL WHERE 0");
    const roots = rootAdminIds();
    const rows = await db.batch([
      can("pharmacies") ? db.prepare("SELECT id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated FROM registered_pharmacies ORDER BY created DESC LIMIT 100") : empty(),
      can("analytics") ? db.prepare("SELECT count(*) AS n FROM profiles") : empty(),
      can("analytics") ? db.prepare("SELECT count(*) AS n FROM requests") : empty(),
      can("analytics") ? db.prepare("SELECT count(*) AS n FROM reservations") : empty(),
      can("accounts") ? db.prepare("SELECT p.id, p.name, p.city, COALESCE(c.suspended, 0) AS suspended, COALESCE(c.reason, '') AS reason, a.owner AS member FROM profiles p LEFT JOIN account_controls c ON c.owner = p.id LEFT JOIN admin_members a ON a.owner = p.id ORDER BY p.name LIMIT 200") : empty(),
      access.isOwner ? db.prepare("SELECT a.owner, p.name, a.created, a.email, a.permissions FROM admin_members a LEFT JOIN profiles p ON p.id = a.owner ORDER BY a.created DESC LIMIT 200") : empty(),
      can("audit") ? db.prepare("SELECT a.id, a.action, a.target, a.detail, a.created, COALESCE(p.name, a.actor) AS actor FROM audit_log a LEFT JOIN profiles p ON p.id = a.actor ORDER BY a.created DESC LIMIT 100") : empty(),
      can("pharmacies") ? db.prepare("SELECT s.id, s.pharmacy, s.name, s.quantity, s.updated, p.name AS pharmacyName FROM stock_items s JOIN registered_pharmacies p ON p.id = s.pharmacy ORDER BY s.updated DESC LIMIT 200") : empty(),
      roots.length ? db.prepare(`SELECT id, name FROM profiles WHERE id IN (${roots.map(() => "?").join(",")})`).bind(...roots) : empty(),
      can("analytics") ? db.prepare("SELECT count(*) AS n FROM registered_pharmacies") : empty(),
      can("pharmacies") ? db.prepare("SELECT count(*) AS n FROM registered_pharmacies WHERE status='pending'") : empty(),
      can("accounts") && !can("analytics") ? db.prepare("SELECT count(*) AS n FROM profiles") : empty(),
      can("operations") && !can("analytics") ? db.prepare("SELECT count(*) AS n FROM requests") : empty(),
      can("operations") && !can("analytics") ? db.prepare("SELECT count(*) AS n FROM reservations") : empty(),
    ]);
    const count = (index: number) => Number((rows[index].results[0] as { n?: number } | undefined)?.n || 0);
    admin = {
      applications: rows[0].results as Registered[], applicationsCount: count(9), users: count(1), searches: count(2), bookings: count(3), canInvite: access.isOwner, access,
      workload: { ...(can("pharmacies") ? { pendingPharmacies: count(10) } : {}), ...(can("accounts") ? { accounts: count(can("analytics") ? 1 : 11) } : {}), ...(can("operations") ? { requests: count(can("analytics") ? 2 : 12), reservations: count(can("analytics") ? 3 : 13) } : {}) },
      owners: roots.map(id => ({id, name: (rows[8].results as {id:string;name:string}[]).find(p => p.id === id)?.name || ""})),
      accounts: (rows[4].results as (NonNullable<AppData["admin"]>["accounts"][number] & {member?:string})[]).map(({member,...a}) => ({...a, protected: a.id === owner || isRootAdmin(a.id) || (!access.isOwner && Boolean(member))})),
      members: (rows[5].results as {owner:string;name:string;created:number;email:string;permissions:string}[]).map(a => ({...a, permissions:parseAdminPermissions(a.permissions)})),
      activity: rows[6].results as NonNullable<AppData["admin"]>["activity"], inventory: rows[7].results as NonNullable<AppData["admin"]>["inventory"],
    };
  }
  return {
    service: await db.prepare("SELECT requests_paused, pickups_paused, message, updated FROM service_controls WHERE id=1").first() as AppData["service"],
    profile: results[0].results[0] as AppData["profile"],
    requests: (results[1].results as RequestRecord[]).filter((r) => !sampleRequests.has(r.id)), responses: (results[2].results as Reply[]).filter((r) => !sampleIds.has(r.pharmacy)),
    reservations: (results[3].results as Booking[]).filter((b) => !sampleIds.has(b.pharmacy)), notifications: results[5].results as Notice[],
    pharmacies: directory,
    ownPharmacy: ownPharmacy || null,
    staffRequests: results[8].results as StaffRequest[], staffBookings: results[9].results as StaffBooking[], stock: results[10].results as StockItem[],
    role: admin ? "admin" : ownPharmacy ? "pharmacist" : "client", admin,
    adminStepUpRequired: Boolean(access && !privileged && !request?.headers.has("x-lqadwa-session")),
  };
}
export async function GET(request: Request) {
  try { const user = await identity(request); await rateLimit(user.userId, "snapshot", 30); await maintainEphemeralData(); return json(await snapshot(user.userId, user.fullName || "مرحباً بك", "personalDetails" in user ? user.personalDetails : {}, request)); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const input = actionSchema.parse(await limitedJson(request));
    const user = await identity(request);
    if (input.action.startsWith("admin-")) await requirePrivilegedSession(user.userId, request);
    const owner = user.userId, db = database(), now = Date.now(), ownerHash = await tokenHash(user.userId);
    await rateLimit(owner, input.action === "collect" ? "pickup-attempt" : "mutation", input.action === "collect" ? 10 : 90);
    const notify = (title: string, recipient = owner) => db.prepare("INSERT INTO notifications (id, owner, title, created, read) SELECT ?, ?, ?, ?, 0 WHERE EXISTS (SELECT 1 FROM profiles WHERE id = ?)").bind(crypto.randomUUID(), recipient, title, now, recipient);
    if (["search", "reserve", "collect"].includes(input.action)) {
      const controls = await db.prepare("SELECT requests_paused,pickups_paused FROM service_controls WHERE id=1").first<{requests_paused:number;pickups_paused:number}>();
      if (input.action === "collect" ? controls?.pickups_paused : controls?.requests_paused) throw new HttpError("الخدمة متوقفة مؤقتاً بقرار الإدارة. / Service temporarily paused by administration.", 409);
    }
    if ((input.action === "reply" || input.action === "reserve") && await db.prepare("SELECT request FROM request_controls WHERE request=?").bind(input.request).first()) throw new HttpError("أوقفت الإدارة هذا الطلب. / This request was stopped by administration.", 409);
    // Old clients cannot create or operate fictional bookings.
    if ("pharmacy" in input && legacySampleIds.has(input.pharmacy)) throw new HttpError("الصيدلية غير موجودة.", 404);
    if ("pharmacy" in input && input.action !== "admin-review" && !legacySampleIds.has(input.pharmacy)) {
      const registered = await db.prepare("SELECT id FROM registered_pharmacies WHERE id = ?").bind(input.pharmacy).first();
      if (!registered) throw new HttpError("الصيدلية غير موجودة.", 404);
    }
    if (input.action === "search") {
      await createAvailabilityRequest(db, owner, ownerHash, input, { name: user.fullName || "مرحباً بك", details: JSON.stringify(parseDetails(personalSchema, "personalDetails" in user ? user.personalDetails : {})) });
    } else if (input.action === "reply") {
      const pilot = legacySampleIds.has(input.pharmacy);
      const permitted = pilot
        ? await db.prepare("SELECT r.owner AS patient FROM responses s JOIN requests r ON r.id = s.request WHERE s.request = ? AND s.pharmacy = ? AND r.owner = ? AND r.created > ? AND s.status = 'pending'").bind(input.request, input.pharmacy, owner, now - 24 * 3600_000).first<{ patient: string }>()
        : await db.prepare("SELECT r.owner AS patient FROM responses s JOIN requests r ON r.id = s.request JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE s.request = ? AND s.pharmacy = ? AND p.owner = ? AND p.status = 'approved' AND r.created > ? AND s.status = 'pending'").bind(input.request, input.pharmacy, owner, now - 24 * 3600_000).first<{ patient: string }>();
      if (!permitted) throw new HttpError("لا تملك صلاحية الرد على هذا الطلب أو انتهت صلاحيته.", 403);
      const result = await db.prepare("UPDATE responses SET status = ?, updated = ? WHERE request = ? AND pharmacy = ? AND status = 'pending'").bind(input.available ? "yes" : "no", now, input.request, input.pharmacy).run();
      if (!result.meta.changes) throw new HttpError("تم الرد على الطلب من قبل.", 409);
      await notify(input.available ? "وصل تأكيد توفر من الصيدلية؛ يمكنك الحجز الآن." : "وصل رد من الصيدلية: الدواء غير متوفر.", permitted.patient).run();
    } else if (input.action === "reserve") {
      if (!legacySampleIds.has(input.pharmacy)) {
        const active = await db.prepare("SELECT id FROM registered_pharmacies WHERE id = ? AND status = 'approved'").bind(input.pharmacy).first();
        if (!active) throw new HttpError("هذه الصيدلية غير متاحة للحجز.", 409);
      }
      const bookingId = crypto.randomUUID(), code = `DZ-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const result = await db.prepare(`INSERT INTO reservations (id, owner, request, pharmacy, code, created, expires, status)
        SELECT ?, ?, r.id, s.pharmacy, ?, ?, ?, 'active' FROM requests r JOIN responses s ON s.request = r.id
        WHERE r.id = ? AND r.owner = ? AND s.pharmacy = ? AND s.status = 'yes' AND s.updated > ?
        AND (? = 1 OR EXISTS (SELECT 1 FROM registered_pharmacies p WHERE p.id = s.pharmacy AND p.status = 'approved'))
        AND NOT EXISTS (SELECT 1 FROM reservations b WHERE b.request = r.id)
        ON CONFLICT(request) DO NOTHING`).bind(bookingId, owner, code, now, now + 2 * 3600_000, input.request, owner, input.pharmacy, now - 30 * 60_000, Number(legacySampleIds.has(input.pharmacy))).run();
      if (!result.meta.changes) throw new HttpError("الطلب محجوز بالفعل أو انتهى تأكيد التوفر. أرسل طلب بحث جديداً.", 409);
      await notify("تم تأكيد الحجز لمدة ساعتين. رمز الاستلام موجود في حجوزاتي.").run();
    } else if (input.action === "cancel") {
      const result = await db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND owner = ? AND status = 'active' AND expires > ?").bind(input.reservation, owner, now).run();
      if (!result.meta.changes) throw new HttpError("الحجز لم يعد نشطاً.", 409);
      await db.prepare("DELETE FROM reservation_locations WHERE reservation = ?").bind(input.reservation).run();
      await notify("تم إلغاء الحجز وإبلاغ الصيدلية.").run();
      const pharmacyOwner = await db.prepare("SELECT p.owner FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE b.id = ?").bind(input.reservation).first<{ owner: string }>();
      if (pharmacyOwner) await notify("ألغى المريض حجزاً؛ أصبحت العلبة متاحة.", pharmacyOwner.owner).run();
    } else if (input.action === "collect") {
      const pilot = legacySampleIds.has(input.pharmacy);
      const permitted = pilot
        ? await db.prepare("SELECT id FROM reservations WHERE id = ? AND pharmacy = ? AND owner = ?").bind(input.reservation, input.pharmacy, owner).first()
        : await db.prepare("SELECT b.id FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE b.id = ? AND b.pharmacy = ? AND p.owner = ? AND p.status = 'approved'").bind(input.reservation, input.pharmacy, owner).first();
      if (!permitted) throw new HttpError("ليس لديك صلاحية الاستلام لهذه الصيدلية.", 403);
      const patient = await db.prepare("SELECT owner FROM reservations WHERE id = ?").bind(input.reservation).first<{ owner: string }>();
      const result = await db.prepare("UPDATE reservations SET status = 'collected' WHERE id = ? AND pharmacy = ? AND code = ? AND status = 'active' AND expires > ?").bind(input.reservation, input.pharmacy, input.code, now).run();
      if (!result.meta.changes) throw new HttpError("رمز الاستلام غير صحيح أو الحجز غير نشط.", 409);
      await db.prepare("DELETE FROM reservation_locations WHERE reservation = ?").bind(input.reservation).run();
      if (patient) await notify("اكتمل الاستلام من الصيدلية. نتمنى لك دوام الصحة.", patient.owner).run();
    } else if (input.action === "duty") {
      if (legacySampleIds.has(input.pharmacy)) await db.prepare("INSERT INTO pharmacy_settings (owner, pharmacy, duty) VALUES (?, ?, ?) ON CONFLICT(owner, pharmacy) DO UPDATE SET duty = excluded.duty").bind(owner, input.pharmacy, Number(input.enabled)).run();
      else {
        const result = await db.prepare("UPDATE registered_pharmacies SET duty = ?, updated = ? WHERE id = ? AND owner = ? AND status = 'approved'").bind(Number(input.enabled), now, input.pharmacy, owner).run();
        if (!result.meta.changes) throw new HttpError("لا تملك صلاحية تعديل هذه الصيدلية.", 403);
      }
    } else if (input.action === "profile") {
      const current=await db.prepare("SELECT details FROM profiles WHERE id=?").bind(owner).first<{details:string}>();
      const details=parseDetails(personalSchema,current?.details);
      const name=[details.firstName,details.lastName].filter(Boolean).join(" ") || input.name;
      await db.prepare("INSERT INTO profiles (id, name, city) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM closed_accounts WHERE hash = ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, city = excluded.city").bind(owner, name, input.city, ownerHash).run();
    } else if (input.action === "register-pharmacy") {
      const prior = await db.prepare("SELECT id, status FROM registered_pharmacies WHERE owner = ?").bind(owner).first<{ id: string; status: string }>();
      if (prior && prior.status !== "rejected") throw new HttpError("تواصل مع الإدارة لتعديل ملف الصيدلية المعتمدة.", 409);
      const saved = await db.prepare(`INSERT INTO registered_pharmacies (id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, '08:00 — 20:00', ?, ? WHERE NOT EXISTS (SELECT 1 FROM closed_accounts WHERE hash = ?)
        ON CONFLICT(owner) DO UPDATE SET name = excluded.name, address = excluded.address, city = excluded.city, latitude = excluded.latitude, longitude = excluded.longitude, phone = excluded.phone, license = excluded.license, status = 'pending', updated = excluded.updated WHERE registered_pharmacies.status = 'rejected'`)
        .bind(prior?.id || crypto.randomUUID(), owner, input.name, input.address, input.city, Math.round(input.latitude * 1e6), Math.round(input.longitude * 1e6), input.phone, input.license, now, now, ownerHash).run();
      if (!saved.meta.changes) throw new HttpError("ملف الصيدلية قيد المراجعة أو معتمد. تواصل مع الإدارة.", 409);
      await notify("وصل طلب انضمام صيدليتك؛ ستظهر للمرضى بعد تحقق الإدارة.").run();
    } else if (input.action === "admin-review") {
      if (!await hasAdminPermission(owner, "pharmacies", db)) throw new HttpError("صلاحية إدارة الصيدليات مطلوبة.", 403);
      const application = await db.prepare("SELECT owner, name FROM registered_pharmacies WHERE id = ?").bind(input.pharmacy).first<{ owner: string; name: string }>();
      if (!application) throw new HttpError("الطلب غير موجود.", 404);
      if (input.status === "approved" && await db.prepare("SELECT owner FROM account_controls WHERE owner = ? AND suspended = 1").bind(application.owner).first()) throw new HttpError("أعد تفعيل حساب المالك قبل اعتماد الصيدلية.", 409);
      await db.batch([db.prepare("UPDATE registered_pharmacies SET status = ?, updated = ? WHERE id = ?").bind(input.status, now, input.pharmacy), audit(owner, "pharmacy-status", input.pharmacy, `${application.name}: ${input.status}`), notify(`تحديث طلب الصيدلية: ${input.status}.`, application.owner), ...(input.status === "approved" ? [] : stopPharmacyBookings(input.pharmacy, now))]);
    } else if (input.action === "admin-account") {
      if (!await hasAdminPermission(owner, "accounts", db) || input.owner === owner || isRootAdmin(input.owner) || (await isAdmin(input.owner) && !isRootAdmin(owner))) throw new HttpError("لا يمكنك تغيير هذا الحساب.", 403);
      if (!await db.prepare("SELECT id FROM profiles WHERE id = ?").bind(input.owner).first()) throw new HttpError("الحساب غير موجود.", 404);
      const affectedPharmacy = await db.prepare("SELECT id FROM registered_pharmacies WHERE owner = ?").bind(input.owner).first<{id:string}>();
      await db.batch([
        ...(input.suspended && affectedPharmacy ? [db.prepare("UPDATE registered_pharmacies SET status = 'suspended', updated = ? WHERE id = ?").bind(now, affectedPharmacy.id), ...stopPharmacyBookings(affectedPharmacy.id, now)] : []),
        ...(input.suspended ? [
          db.prepare("DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE owner=?)").bind(input.owner),
          db.prepare("INSERT INTO notifications (id,owner,title,created,read) SELECT lower(hex(randomblob(16))),p.owner,'LQADWA: reservation cancelled after account suspension.',?,0 FROM registered_pharmacies p WHERE p.id IN (SELECT pharmacy FROM reservations WHERE owner=? AND status='active')").bind(now,input.owner),
          db.prepare("UPDATE reservations SET status='cancelled' WHERE owner=? AND status='active'").bind(input.owner),
          db.prepare("INSERT INTO request_controls (request) SELECT id FROM requests WHERE owner=? ON CONFLICT(request) DO NOTHING").bind(input.owner),
          db.prepare("UPDATE responses SET status='no',updated=? WHERE request IN (SELECT id FROM requests WHERE owner=?)").bind(now,input.owner),
        ] : []),
        db.prepare("INSERT INTO account_controls (owner, suspended, reason) VALUES (?, ?, ?) ON CONFLICT(owner) DO UPDATE SET suspended = excluded.suspended, reason = excluded.reason").bind(input.owner, Number(input.suspended), input.reason),
        db.prepare("DELETE FROM mobile_sessions WHERE owner = ?").bind(input.owner),
        audit(owner, input.suspended ? "account-suspend" : "account-reactivate", input.owner, input.reason),
      ]);

    } else if (input.action === "admin-permissions") {
      if (!isRootAdmin(owner) || isRootAdmin(input.owner) || input.owner === owner) throw new HttpError("صلاحية المالك مطلوبة.", 403);
      if (!await db.prepare("SELECT owner FROM admin_members WHERE owner = ?").bind(input.owner).first()) throw new HttpError("المدير غير موجود.", 404);
      await db.batch([db.prepare("UPDATE admin_members SET permissions = ? WHERE owner = ?").bind(JSON.stringify(input.permissions), input.owner), audit(owner, "admin-permissions", input.owner, input.permissions.join(","))]);
    } else if (input.action === "admin-revoke") {
      if (!isRootAdmin(owner) || isRootAdmin(input.owner) || input.owner === owner) throw new HttpError("صلاحية المالك مطلوبة.", 403);
      await db.batch([db.prepare("DELETE FROM admin_members WHERE owner = ?").bind(input.owner), db.prepare("DELETE FROM mobile_sessions WHERE owner = ?").bind(input.owner), audit(owner, "admin-revoke", input.owner, "Access revoked")]);
    } else if (input.action === "admin-invites-revoke") {
      if (!isRootAdmin(owner)) throw new HttpError("صلاحية المالك مطلوبة.", 403);
      await db.batch([db.prepare("UPDATE admin_invites SET expires = ? WHERE used_by IS NULL").bind(now), audit(owner, "invites-revoke", "pending", "Pending invitations invalidated")]);
    } else if (input.action === "admin-pharmacy-edit") {
      if (!await hasAdminPermission(owner, "pharmacies", db)) throw new HttpError("صلاحية إدارة الصيدليات مطلوبة.", 403);
      const result = await db.prepare("UPDATE registered_pharmacies SET name = ?, address = ?, phone = ?, hours = ?, updated = ? WHERE id = ?").bind(input.name, input.address, input.phone, input.hours, now, input.pharmacy).run();
      if (!result.meta.changes) throw new HttpError("الصيدلية غير موجودة.", 404);
      await audit(owner, "pharmacy-edit", input.pharmacy, input.name).run();
    } else if (input.action === "sessions-revoke") {
      await db.prepare("DELETE FROM mobile_sessions WHERE owner = ?").bind(owner).run();
    } else if (input.action === "admin-invite-create") {
      if (!isRootAdmin(owner)) throw new HttpError("دعوات الإدارة متاحة لمالك المنصة فقط.", 403);
      if (input.email === user.email.toLowerCase() || await db.prepare("SELECT owner FROM admin_members WHERE email = ?").bind(input.email).first()) throw new HttpError("الحساب عضو في الإدارة بالفعل. استخدم تعديل الصلاحيات.", 409);
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      await db.batch([db.prepare("INSERT INTO admin_invites (hash, created_by, created, expires, email, permissions) VALUES (?, ?, ?, ?, ?, ?)").bind(await tokenHash(token), owner, now, now + 7 * 24 * 3600_000, input.email, JSON.stringify(input.permissions)), audit(owner, "admin-invite", "pending", `Email-bound, 7 day invitation: ${input.permissions.join(",")}`)]);
      return json({ ...await snapshot(owner, user.fullName || "مرحباً بك", {}, request), invite: token });
    } else if (input.action === "admin-invite-redeem") {
      const hash = await tokenHash(input.token);
      const invitation = await db.prepare("SELECT created_by, permissions, email FROM admin_invites WHERE hash = ? AND used_by IS NULL AND expires > ?").bind(hash, now).first<{created_by:string;permissions:string;email:string}>();
      if (!invitation || !isRootAdmin(invitation.created_by) || !parseAdminPermissions(invitation.permissions).length || isRootAdmin(owner) || await isAdmin(owner, db)) throw new HttpError("رابط الدعوة غير صالح أو استُخدم من قبل.", 409);
      if (!user.email || user.email.toLowerCase() !== invitation.email) throw new HttpError("سجّل الدخول بالبريد الإلكتروني المحدد في الدعوة، من متصفح الويب.", 403);
      const claimed = await db.batch([
        db.prepare("INSERT INTO admin_members (owner, invited_by, created, email, permissions) SELECT ?, created_by, ?, email, permissions FROM admin_invites WHERE hash = ? AND used_by IS NULL AND expires > ? AND email = ?").bind(owner, now, hash, now, user.email.toLowerCase()),
        db.prepare("UPDATE admin_invites SET used_by = ? WHERE hash = ? AND used_by IS NULL AND expires > ? AND email = ?").bind(owner, hash, now, user.email.toLowerCase()),
      ]);
      if (!claimed[0].meta.changes) throw new HttpError("رابط الدعوة غير صالح أو استُخدم من قبل.", 409);
      await audit(owner, "admin-joined", owner, "Email-bound invitation accepted").run();
    } else if (input.action === "share-location") {
      const booking = await db.prepare("SELECT b.id FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE b.id = ? AND b.owner = ? AND b.status = 'active' AND b.expires > ? AND p.status = 'approved'").bind(input.reservation, owner, now).first();
      if (!booking) throw new HttpError("الموقع متاح للحجز الحقيقي النشط فقط.", 403);
      if (input.enabled) {
        if (input.latitude === undefined || input.longitude === undefined) throw new HttpError("موقع غير صالح.");
        await db.prepare("INSERT INTO reservation_locations (reservation, latitude, longitude, updated) VALUES (?, ?, ?, ?) ON CONFLICT(reservation) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude, updated = excluded.updated").bind(input.reservation, Math.round(input.latitude * 1000), Math.round(input.longitude * 1000), now).run();
      } else await db.prepare("DELETE FROM reservation_locations WHERE reservation = ?").bind(input.reservation).run();
    } else if (input.action === "stock-upsert") {
      const permitted = await db.prepare("SELECT id FROM registered_pharmacies WHERE id = ? AND owner = ? AND status = 'approved'").bind(input.pharmacy, owner).first();
      if (!permitted) throw new HttpError("ليس لديك صلاحية تعديل هذا المخزون.", 403);
      await db.prepare("INSERT INTO stock_items (id, pharmacy, name, quantity, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(pharmacy, name) DO UPDATE SET quantity = excluded.quantity, updated = excluded.updated").bind(crypto.randomUUID(), input.pharmacy, input.name, input.quantity, now).run();
    } else if (input.action === "stock-delete") {
      const result = await db.prepare("DELETE FROM stock_items WHERE id = ? AND pharmacy = ? AND pharmacy IN (SELECT id FROM registered_pharmacies WHERE owner = ? AND status = 'approved')").bind(input.item, input.pharmacy, owner).run();
      if (!result.meta.changes) throw new HttpError("العنصر غير موجود أو ليس لديك صلاحية حذفه.", 403);
    } else if (input.action === "read-notifications") {
      await db.prepare("UPDATE notifications SET read = 1 WHERE owner = ? AND read = 0").bind(owner).run();
    }
    return json(await snapshot(owner, user.fullName || "مرحباً بك", {}, request));
  } catch (error) { return errorResponse(error); }
}
