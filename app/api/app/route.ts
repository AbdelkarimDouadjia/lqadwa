import { env } from "cloudflare:workers";
import { z } from "zod";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database } from "@/db";
import { cities, pharmacies, type AppData, type Booking, type Notice, type Reply, type RequestRecord, type Pharmacy, type PharmacyApplication, type StaffRequest, type StaffBooking, type StockItem } from "@/lib/domain";

export const dynamic = "force-dynamic";
const cityId = z.enum(cities.map((c) => c.id) as [string, ...string[]]);
const id = z.string().min(1).max(100);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("search"), medicine: z.string().trim().min(2).max(100), city: cityId, night: z.boolean(), token: z.string().uuid() }),
  z.object({ action: z.literal("reply"), request: id, pharmacy: id, available: z.boolean() }),
  z.object({ action: z.literal("reserve"), request: id, pharmacy: id, consent: z.literal(true) }),
  z.object({ action: z.literal("cancel"), reservation: id }),
  z.object({ action: z.literal("collect"), reservation: id, pharmacy: id, code: z.string().regex(/^DZ-[A-F0-9]{8}$/), checked: z.literal(true) }),
  z.object({ action: z.literal("duty"), pharmacy: id, enabled: z.boolean() }),
  z.object({ action: z.literal("profile"), name: z.string().trim().min(2).max(60), city: cityId }),
  z.object({ action: z.literal("register-pharmacy"), name: z.string().trim().min(3).max(100), address: z.string().trim().min(8).max(160), city: cityId, latitude: z.number().min(18.9).max(38), longitude: z.number().min(-9).max(12), phone: z.string().regex(/^0\d{8,9}$/), license: z.string().trim().min(5).max(100) }),
  z.object({ action: z.literal("admin-review"), pharmacy: id, status: z.enum(["approved", "rejected", "suspended"]) }),
  z.object({ action: z.literal("stock-upsert"), pharmacy: id, name: z.string().trim().min(2).max(100), quantity: z.number().int().min(0).max(9999) }),
  z.object({ action: z.literal("stock-delete"), pharmacy: id, item: id }),
  z.object({ action: z.literal("read-notifications") }),
]);
class HttpError extends Error { constructor(message: string, public status = 400) { super(message); } }
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
type Registered = PharmacyApplication & { owner: string };
function isAdmin(owner: string) { return (env.APP_ADMIN_IDS?.split(",").map((value) => value.trim()) || []).includes(owner) || (import.meta.env.DEV && owner === "local_seedy"); }
function pilotAllowed(owner: string) { return isAdmin(owner); }
function pharmacyFromRow(row: Registered): Pharmacy {
  const center = cities.find((city) => city.id === row.city) || cities[0];
  return { id: row.id, name: row.name, city: row.city, area: row.address, lat: row.latitude / 1e6, lng: row.longitude / 1e6, phone: row.phone, pilot: false, duty: Boolean(row.duty), hours: row.hours, distance: Math.round(Math.hypot(center.lat - row.latitude / 1e6, (center.lng - row.longitude / 1e6) * Math.cos(center.lat * Math.PI / 180)) * 111_000) };
}

async function identity() {
  const user = await getChatGPTUser();
  if (!user) throw new HttpError("سجّل الدخول لحفظ طلباتك بأمان.", 401);
  return user;
}
function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: "تحقق من البيانات المدخلة ثم أعد المحاولة." }, 400);
  console.error("Application request failed", error instanceof Error ? error.message : "unknown");
  return json({ error: "تعذّر الاتصال بالخدمة. بياناتك الحالية محفوظة؛ حاول مجدداً." }, 503);
}
async function snapshot(owner: string, fallbackName: string): Promise<AppData> {
  const db = database();
  const now = Date.now();
  await db.batch([
    db.prepare("INSERT INTO profiles (id, name, city) VALUES (?, ?, 'algiers') ON CONFLICT(id) DO NOTHING").bind(owner, fallbackName),
    db.prepare("UPDATE reservations SET status = 'expired' WHERE owner = ? AND status = 'active' AND expires <= ?").bind(owner, now),
  ]);
  const results = await db.batch([
    db.prepare("SELECT name, city FROM profiles WHERE id = ?").bind(owner),
    db.prepare("SELECT id, medicine, city, created FROM requests WHERE owner = ? ORDER BY created DESC LIMIT 100").bind(owner),
    db.prepare("SELECT s.request, s.pharmacy, s.status, s.updated FROM responses s JOIN requests r ON r.id = s.request WHERE r.owner = ? ORDER BY r.created DESC LIMIT 300").bind(owner),
    db.prepare("SELECT b.id, b.request, b.pharmacy, b.code, b.created, b.expires, b.status, r.medicine FROM reservations b JOIN requests r ON b.request = r.id WHERE b.owner = ? ORDER BY b.created DESC LIMIT 100").bind(owner),
    db.prepare("SELECT pharmacy, duty FROM pharmacy_settings WHERE owner = ?").bind(owner),
    db.prepare("SELECT id, title, created, read FROM notifications WHERE owner = ? ORDER BY created DESC LIMIT 40").bind(owner),
    db.prepare("SELECT id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated FROM registered_pharmacies WHERE status = 'approved' OR owner = ? ORDER BY name LIMIT 300").bind(owner),
    db.prepare("SELECT id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated FROM registered_pharmacies WHERE owner = ? LIMIT 1").bind(owner),
    db.prepare("SELECT r.id, s.pharmacy, r.medicine, r.created, r.city, s.status FROM responses s JOIN requests r ON r.id = s.request JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE p.owner = ? AND p.status = 'approved' AND r.created > ? AND s.status = 'pending' ORDER BY r.created DESC LIMIT 100").bind(owner, now - 24 * 3600_000),
    db.prepare("SELECT b.id, b.request, b.pharmacy, b.created, b.expires, b.status, r.medicine FROM reservations b JOIN requests r ON r.id = b.request JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE p.owner = ? AND p.status = 'approved' AND b.status = 'active' AND b.expires > ? ORDER BY b.created DESC LIMIT 100").bind(owner, now),
    db.prepare("SELECT s.id, s.pharmacy, s.name, s.quantity, s.updated FROM stock_items s JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE p.owner = ? ORDER BY s.updated DESC LIMIT 200").bind(owner),
  ]);
  const settings = results[4].results as { pharmacy: string; duty: number }[];
  const ownPharmacy = results[7].results[0] as Registered | undefined;
  let admin: AppData["admin"] = null;
  if (isAdmin(owner)) {
    const rows = await db.batch([
      db.prepare("SELECT id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated FROM registered_pharmacies ORDER BY created DESC LIMIT 100"),
      db.prepare("SELECT count(*) AS n FROM profiles"),
      db.prepare("SELECT count(*) AS n FROM requests"),
      db.prepare("SELECT count(*) AS n FROM reservations"),
    ]);
    admin = { applications: rows[0].results as Registered[], users: Number((rows[1].results[0] as { n: number }).n), searches: Number((rows[2].results[0] as { n: number }).n), bookings: Number((rows[3].results[0] as { n: number }).n) };
  }
  return {
    profile: results[0].results[0] as AppData["profile"],
    requests: results[1].results as RequestRecord[], responses: results[2].results as Reply[],
    reservations: results[3].results as Booking[], notifications: results[5].results as Notice[],
    pharmacies: [...(results[6].results as Registered[]).filter((p) => p.status === "approved").map(pharmacyFromRow), ...(pilotAllowed(owner) ? pharmacies.map((p) => { const s = settings.find((s) => s.pharmacy === p.id); return { ...p, duty: s ? Boolean(s.duty) : p.duty }; }) : [])],
    ownPharmacy: ownPharmacy || null,
    staffRequests: results[8].results as StaffRequest[], staffBookings: results[9].results as StaffBooking[], stock: results[10].results as StockItem[],
    role: admin ? "admin" : ownPharmacy ? "pharmacist" : "client", admin,
  };
}
export async function GET() {
  try { const user = await identity(); return json(await snapshot(user.userId, user.fullName || "مرحباً بك")); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) throw new HttpError("مصدر الطلب غير صالح.", 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError("نوع طلب غير صالح.", 415);
    const raw = await request.text();
    if (raw.length > 4096) throw new HttpError("الطلب أكبر من الحجم المسموح.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new HttpError("بيانات الطلب غير صالحة."); }
    const input = actionSchema.parse(parsed);
    const user = await identity();
    const owner = user.userId, db = database(), now = Date.now();
    const notify = (title: string, recipient = owner) => db.prepare("INSERT INTO notifications (id, owner, title, created, read) VALUES (?, ?, ?, ?, 0)").bind(crypto.randomUUID(), recipient, title, now);
    // Private pilot: each authenticated visitor owns an isolated simulated pharmacy network.
    // Real pharmacy membership/verification must replace this sandbox before public launch.
    if ("pharmacy" in input && input.action !== "admin-review" && !(pilotAllowed(owner) && pharmacies.some((p) => p.id === input.pharmacy))) {
      const registered = await db.prepare("SELECT id FROM registered_pharmacies WHERE id = ?").bind(input.pharmacy).first();
      if (!registered) throw new HttpError("الصيدلية غير موجودة.", 404);
    }
    if (input.action === "search") {
      const existing = await db.prepare("SELECT id FROM requests WHERE id = ? AND owner = ?").bind(input.token, owner).first();
      if (!existing) {
        const count = await db.prepare("SELECT count(*) AS n FROM requests WHERE owner = ? AND created > ?").bind(owner, now - 60_000).first<{ n: number }>();
        if ((count?.n || 0) >= 8) throw new HttpError("طلبات كثيرة خلال دقيقة واحدة. انتظر قليلاً ثم حاول.", 429);
        const current = await snapshot(owner, user.fullName || "مرحباً بك");
        const targets = current.pharmacies.filter((p) => p.city === input.city && (!input.night || p.duty));
        if (!targets.length) throw new HttpError("لا توجد صيدليات مناوبة في النطاق المختار. جرّب جميع الصيدليات.");
        await db.batch([
          db.prepare("INSERT INTO requests (id, owner, medicine, city, created) VALUES (?, ?, ?, ?, ?)").bind(input.token, owner, input.medicine, input.city, now),
          ...targets.map((p) => db.prepare("INSERT INTO responses (request, pharmacy, status) VALUES (?, ?, 'pending')").bind(input.token, p.id)),
          notify(`طلب توفر جديد: ${input.medicine}`),
          ...targets.filter((p) => !p.pilot).map((p) => db.prepare("INSERT INTO notifications (id, owner, title, created, read) SELECT ?, owner, ?, ?, 0 FROM registered_pharmacies WHERE id = ? AND status = 'approved'").bind(crypto.randomUUID(), `طلب توفر جديد: ${input.medicine}`, now, p.id)),
        ]);
      }
    } else if (input.action === "reply") {
      const pilot = pharmacies.some((p) => p.id === input.pharmacy);
      const permitted = pilot
        ? await db.prepare("SELECT r.owner AS patient FROM responses s JOIN requests r ON r.id = s.request WHERE s.request = ? AND s.pharmacy = ? AND r.owner = ? AND r.created > ? AND s.status = 'pending'").bind(input.request, input.pharmacy, owner, now - 24 * 3600_000).first<{ patient: string }>()
        : await db.prepare("SELECT r.owner AS patient FROM responses s JOIN requests r ON r.id = s.request JOIN registered_pharmacies p ON p.id = s.pharmacy WHERE s.request = ? AND s.pharmacy = ? AND p.owner = ? AND p.status = 'approved' AND r.created > ? AND s.status = 'pending'").bind(input.request, input.pharmacy, owner, now - 24 * 3600_000).first<{ patient: string }>();
      if (!permitted) throw new HttpError("لا تملك صلاحية الرد على هذا الطلب أو انتهت صلاحيته.", 403);
      const result = await db.prepare("UPDATE responses SET status = ?, updated = ? WHERE request = ? AND pharmacy = ? AND status = 'pending'").bind(input.available ? "yes" : "no", now, input.request, input.pharmacy).run();
      if (!result.meta.changes) throw new HttpError("تم الرد على الطلب من قبل.", 409);
      await notify(input.available ? "وصل تأكيد توفر من الصيدلية؛ يمكنك الحجز الآن." : "وصل رد من الصيدلية: الدواء غير متوفر.", permitted.patient).run();
    } else if (input.action === "reserve") {
      if (!pharmacies.some((p) => p.id === input.pharmacy)) {
        const active = await db.prepare("SELECT id FROM registered_pharmacies WHERE id = ? AND status = 'approved'").bind(input.pharmacy).first();
        if (!active) throw new HttpError("هذه الصيدلية غير متاحة للحجز.", 409);
      }
      const bookingId = crypto.randomUUID(), code = `DZ-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const result = await db.prepare(`INSERT INTO reservations (id, owner, request, pharmacy, code, created, expires, status)
        SELECT ?, ?, r.id, s.pharmacy, ?, ?, ?, 'active' FROM requests r JOIN responses s ON s.request = r.id
        WHERE r.id = ? AND r.owner = ? AND s.pharmacy = ? AND s.status = 'yes' AND s.updated > ?
        AND NOT EXISTS (SELECT 1 FROM reservations b WHERE b.request = r.id)
        ON CONFLICT(request) DO NOTHING`).bind(bookingId, owner, code, now, now + 2 * 3600_000, input.request, owner, input.pharmacy, now - 30 * 60_000).run();
      if (!result.meta.changes) throw new HttpError("الطلب محجوز بالفعل أو انتهى تأكيد التوفر. أرسل طلب بحث جديداً.", 409);
      await notify("تم تأكيد الحجز لمدة ساعتين. رمز الاستلام موجود في حجوزاتي.").run();
    } else if (input.action === "cancel") {
      const result = await db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ? AND owner = ? AND status = 'active' AND expires > ?").bind(input.reservation, owner, now).run();
      if (!result.meta.changes) throw new HttpError("الحجز لم يعد نشطاً.", 409);
      await notify("تم إلغاء الحجز وإبلاغ الصيدلية.").run();
      const pharmacyOwner = await db.prepare("SELECT p.owner FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE b.id = ?").bind(input.reservation).first<{ owner: string }>();
      if (pharmacyOwner) await notify("ألغى المريض حجزاً؛ أصبحت العلبة متاحة.", pharmacyOwner.owner).run();
    } else if (input.action === "collect") {
      const pilot = pharmacies.some((p) => p.id === input.pharmacy);
      const permitted = pilot
        ? await db.prepare("SELECT id FROM reservations WHERE id = ? AND pharmacy = ? AND owner = ?").bind(input.reservation, input.pharmacy, owner).first()
        : await db.prepare("SELECT b.id FROM reservations b JOIN registered_pharmacies p ON p.id = b.pharmacy WHERE b.id = ? AND b.pharmacy = ? AND p.owner = ? AND p.status = 'approved'").bind(input.reservation, input.pharmacy, owner).first();
      if (!permitted) throw new HttpError("ليس لديك صلاحية الاستلام لهذه الصيدلية.", 403);
      const patient = await db.prepare("SELECT owner FROM reservations WHERE id = ?").bind(input.reservation).first<{ owner: string }>();
      const result = await db.prepare("UPDATE reservations SET status = 'collected' WHERE id = ? AND pharmacy = ? AND code = ? AND status = 'active' AND expires > ?").bind(input.reservation, input.pharmacy, input.code, now).run();
      if (!result.meta.changes) throw new HttpError("رمز الاستلام غير صحيح أو الحجز غير نشط.", 409);
      if (patient) await notify("اكتمل الاستلام من الصيدلية. نتمنى لك دوام الصحة.", patient.owner).run();
    } else if (input.action === "duty") {
      if (pharmacies.some((p) => p.id === input.pharmacy)) await db.prepare("INSERT INTO pharmacy_settings (owner, pharmacy, duty) VALUES (?, ?, ?) ON CONFLICT(owner, pharmacy) DO UPDATE SET duty = excluded.duty").bind(owner, input.pharmacy, Number(input.enabled)).run();
      else {
        const result = await db.prepare("UPDATE registered_pharmacies SET duty = ?, updated = ? WHERE id = ? AND owner = ? AND status = 'approved'").bind(Number(input.enabled), now, input.pharmacy, owner).run();
        if (!result.meta.changes) throw new HttpError("لا تملك صلاحية تعديل هذه الصيدلية.", 403);
      }
    } else if (input.action === "profile") {
      await db.prepare("INSERT INTO profiles (id, name, city) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, city = excluded.city").bind(owner, input.name, input.city).run();
    } else if (input.action === "register-pharmacy") {
      const prior = await db.prepare("SELECT id, status FROM registered_pharmacies WHERE owner = ?").bind(owner).first<{ id: string; status: string }>();
      if (prior?.status === "approved" || prior?.status === "suspended") throw new HttpError("تواصل مع الإدارة لتعديل ملف الصيدلية المعتمدة.", 409);
      await db.prepare(`INSERT INTO registered_pharmacies (id, owner, name, address, city, latitude, longitude, phone, license, status, duty, hours, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, '08:00 — 20:00', ?, ?)
        ON CONFLICT(owner) DO UPDATE SET name = excluded.name, address = excluded.address, city = excluded.city, latitude = excluded.latitude, longitude = excluded.longitude, phone = excluded.phone, license = excluded.license, status = 'pending', updated = excluded.updated`)
        .bind(prior?.id || crypto.randomUUID(), owner, input.name, input.address, input.city, Math.round(input.latitude * 1e6), Math.round(input.longitude * 1e6), input.phone, input.license, now, now).run();
      await notify("وصل طلب انضمام صيدليتك؛ ستظهر للمرضى بعد تحقق الإدارة.").run();
    } else if (input.action === "admin-review") {
      if (!isAdmin(owner)) throw new HttpError("هذه العملية متاحة للإدارة فقط.", 403);
      const application = await db.prepare("SELECT owner, name FROM registered_pharmacies WHERE id = ?").bind(input.pharmacy).first<{ owner: string; name: string }>();
      if (!application) throw new HttpError("الطلب غير موجود.", 404);
      await db.prepare("UPDATE registered_pharmacies SET status = ?, updated = ? WHERE id = ?").bind(input.status, now, input.pharmacy).run();
      await notify(`تحديث طلب صيدلية ${application.name}: ${input.status === "approved" ? "تم الاعتماد" : input.status === "rejected" ? "تحتاج البيانات إلى مراجعة" : "تم تعليق الحساب"}.`, application.owner).run();
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
    return json(await snapshot(owner, user.fullName || "مرحباً بك"));
  } catch (error) { return errorResponse(error); }
}
