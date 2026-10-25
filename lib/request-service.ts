import { HttpError } from "@/lib/access";
import { discoverPharmacies } from "@/lib/pharmacy-discovery";
import { resolveMedicine, type MedicineSelection } from "@/lib/medicine-catalog";
import { routingFilters } from "@/lib/discovery-contract";

type Input = MedicineSelection & { token: string; city: string; night: boolean; radiusKm?: number; origin?: {lat:number;lng:number;consent:true} };
const notice = "طلب توفر جديد. افتح الطلب للاطلاع على التفاصيل.";

export async function createAvailabilityRequest(db: D1Database, owner: string, ownerHash: string, input: Input, profile: { name: string; details: string }) {
  let medicine;
  try { medicine = resolveMedicine(input); } catch { throw new HttpError("Choose a current catalog entry or enter an unverified name manually.", 400, "INVALID_MEDICINE_ID"); }
  const filters = routingFilters(input);
  const payload = JSON.stringify({ medicine: medicine.identity?.id || medicine.label, version:medicine.identity?.catalogVersion || null, source:medicine.source, ...filters });
  const existing = await db.prepare("SELECT r.owner,i.payload_json AS payload FROM requests r LEFT JOIN request_identity i ON i.request=r.id WHERE r.id=?").bind(input.token).first<{owner:string;payload:string|null}>();
  const conflict = () => new HttpError("معرّف الطلب مستخدم لبحث مختلف. / Request ID already used for a different search.", 409);
  if (existing && (existing.owner !== owner || existing.payload !== payload)) throw conflict();
  if (existing && await db.prepare("SELECT 1 FROM responses WHERE request=? LIMIT 1").bind(input.token).first()) return;
  const now = Date.now();
  const targets = await discoverPharmacies(db, { ...filters, limit: 25 });
  if (!targets.length) throw new HttpError("لا توجد صيدليات معتمدة في النطاق المختار. / No approved pharmacies in this area.", 409);
  // One transaction: first recipient set wins; durable notices never contain medicine names.
  await db.batch([
    db.prepare("INSERT INTO profiles(id,name,city,details) SELECT ?,?,'algiers',? WHERE NOT EXISTS(SELECT 1 FROM closed_accounts WHERE hash=?) ON CONFLICT(id) DO NOTHING").bind(owner, profile.name, profile.details, ownerHash),
    db.prepare(`INSERT INTO requests(id,owner,medicine,city,created) SELECT ?,?,?,?,?
      WHERE NOT EXISTS(SELECT 1 FROM closed_accounts WHERE hash=?)
      AND NOT EXISTS(SELECT 1 FROM account_controls WHERE owner=? AND suspended=1)
      AND (EXISTS(SELECT 1 FROM requests WHERE id=? AND owner=?) OR (SELECT count(*) FROM requests WHERE owner=? AND created>?)<8)
      ON CONFLICT(id) DO NOTHING`).bind(input.token, owner, medicine.label, input.city, now, ownerHash, owner, input.token, owner, owner, now - 60_000),
    db.prepare(`INSERT INTO request_identity(request,medicine_id,catalog_version,identity_json,selection_source,verification,payload_json)
      SELECT r.id,?,?,?,?,?,? FROM requests r WHERE r.id=? AND r.owner=? AND r.medicine=? AND r.city=?
      ON CONFLICT(request) DO NOTHING`).bind(medicine.identity?.id || null, medicine.identity?.catalogVersion || null, JSON.stringify(medicine.identity), medicine.source, medicine.status, payload, input.token, owner, medicine.label, input.city),
    db.prepare(`INSERT INTO responses(request,pharmacy,status)
      SELECT r.id,p.id,'pending' FROM requests r CROSS JOIN registered_pharmacies p
      WHERE r.id=? AND r.owner=? AND r.medicine=? AND r.city=? AND EXISTS(SELECT 1 FROM request_identity i WHERE i.request=r.id AND i.payload_json=?)
      AND p.status='approved' AND p.city=r.city AND p.id IN (${targets.map(() => "?").join(",")})
      AND NOT EXISTS(SELECT 1 FROM responses WHERE request=?)
      ON CONFLICT(request,pharmacy) DO NOTHING`).bind(input.token, owner, medicine.label, input.city, payload, ...targets.map(p => p.id), input.token),
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read)
      SELECT ?,?,?,?,0 WHERE EXISTS(SELECT 1 FROM responses s JOIN requests r ON r.id=s.request WHERE r.id=? AND r.owner=?)
      ON CONFLICT(id) DO NOTHING`).bind(`request:${input.token}:patient`, owner, notice, now, input.token, owner),
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read)
      SELECT 'request:'||r.id||':pharmacy:'||p.id,p.owner,?,?,0
      FROM responses s JOIN requests r ON r.id=s.request JOIN registered_pharmacies p ON p.id=s.pharmacy
      WHERE r.id=? AND r.owner=? AND p.status='approved'
      ON CONFLICT(id) DO NOTHING`).bind(notice, now, input.token, owner),
  ]);
  const stored = await db.prepare("SELECT i.payload_json AS payload FROM requests r JOIN request_identity i ON i.request=r.id WHERE r.id=? AND r.owner=?").bind(input.token, owner).first<{payload:string}>();
  if (!stored) throw new HttpError("تعذر إنشاء الطلب. انتظر قليلاً وأعد المحاولة. / Request unavailable; retry shortly.", 429);
  if (stored.payload !== payload) throw conflict();
  if (!await db.prepare("SELECT 1 FROM responses WHERE request=? LIMIT 1").bind(input.token).first()) throw new HttpError("لم تبقَ صيدلية معتمدة لهذا الطلب. أعد البحث. / No approved recipient remains; retry the search.", 409);
}
