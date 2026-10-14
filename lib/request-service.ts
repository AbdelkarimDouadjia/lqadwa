import { HttpError } from "@/lib/access";
import { discoverPharmacies } from "@/lib/pharmacy-discovery";

type Input = { token: string; medicine: string; city: string; night: boolean };
const notice = "طلب توفر جديد. افتح الطلب للاطلاع على التفاصيل.";

export async function createAvailabilityRequest(db: D1Database, owner: string, ownerHash: string, input: Input, profile: { name: string; details: string }) {
  const existing = await db.prepare("SELECT medicine,city FROM requests WHERE id=? AND owner=?").bind(input.token, owner).first<{ medicine: string; city: string }>();
  if (existing && (existing.medicine !== input.medicine || existing.city !== input.city)) throw new HttpError("معرّف الطلب مستخدم لبحث مختلف. / Request ID already used for a different search.", 409);
  if (existing && await db.prepare("SELECT 1 FROM responses WHERE request=? LIMIT 1").bind(input.token).first()) return;
  const now = Date.now();
  const targets = await discoverPharmacies(db, { city: input.city, night: input.night, limit: 25 });
  if (!targets.length) throw new HttpError("لا توجد صيدليات معتمدة في النطاق المختار. / No approved pharmacies in this area.", 409);
  // One transaction: first recipient set wins; durable notices never contain medicine names.
  await db.batch([
    db.prepare("INSERT INTO profiles(id,name,city,details) SELECT ?,?,'algiers',? WHERE NOT EXISTS(SELECT 1 FROM closed_accounts WHERE hash=?) ON CONFLICT(id) DO NOTHING").bind(owner, profile.name, profile.details, ownerHash),
    db.prepare(`INSERT INTO requests(id,owner,medicine,city,created) SELECT ?,?,?,?,?
      WHERE NOT EXISTS(SELECT 1 FROM closed_accounts WHERE hash=?)
      AND NOT EXISTS(SELECT 1 FROM account_controls WHERE owner=? AND suspended=1)
      AND (EXISTS(SELECT 1 FROM requests WHERE id=? AND owner=?) OR (SELECT count(*) FROM requests WHERE owner=? AND created>?)<8)
      ON CONFLICT(id) DO NOTHING`).bind(input.token, owner, input.medicine, input.city, now, ownerHash, owner, input.token, owner, owner, now - 60_000),
    db.prepare(`INSERT INTO responses(request,pharmacy,status)
      SELECT r.id,p.id,'pending' FROM requests r CROSS JOIN registered_pharmacies p
      WHERE r.id=? AND r.owner=? AND r.medicine=? AND r.city=?
      AND p.status='approved' AND p.city=r.city AND p.id IN (${targets.map(() => "?").join(",")})
      AND NOT EXISTS(SELECT 1 FROM responses WHERE request=?)
      ON CONFLICT(request,pharmacy) DO NOTHING`).bind(input.token, owner, input.medicine, input.city, ...targets.map(p => p.id), input.token),
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read)
      SELECT ?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM responses s JOIN requests r ON r.id=s.request WHERE r.id=? AND r.owner=?)
      ON CONFLICT(id) DO NOTHING`).bind(`request:${input.token}:patient`, owner, notice, now, input.token, owner),
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read)
      SELECT 'request:'||r.id||':pharmacy:'||p.id,p.owner,?,?,0
      FROM responses s JOIN requests r ON r.id=s.request JOIN registered_pharmacies p ON p.id=s.pharmacy
      WHERE r.id=? AND r.owner=? AND p.status='approved'
      ON CONFLICT(id) DO NOTHING`).bind(notice, now, input.token, owner),
  ]);
  const stored = await db.prepare("SELECT medicine,city FROM requests WHERE id=? AND owner=?").bind(input.token, owner).first<{ medicine: string; city: string }>();
  if (!stored) throw new HttpError("تعذر إنشاء الطلب. انتظر قليلاً وأعد المحاولة. / Request unavailable; retry shortly.", 429);
  if (stored.medicine !== input.medicine || stored.city !== input.city) throw new HttpError("معرّف الطلب مستخدم لبحث مختلف. / Request ID already used for a different search.", 409);
  if (!await db.prepare("SELECT 1 FROM responses WHERE request=? LIMIT 1").bind(input.token).first()) throw new HttpError("لم تبقَ صيدلية معتمدة لهذا الطلب. أعد البحث. / No approved recipient remains; retry the search.", 409);
}
