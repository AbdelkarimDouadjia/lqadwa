import { z } from "zod";
import { database } from "@/db";
import { identity, HttpError, audit, isAdmin } from "@/lib/access";
import { requireMutationOrigin, limitedJson, privateHeaders, rateLimit } from "@/lib/http-security";
import { personalSchema, healthSchema, pharmacyDetailsSchema, parseDetails } from "@/lib/profile-details";

export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("personal"), details: personalSchema.refine(v=>Boolean(v.firstName&&v.lastName),"First and last names are required"), health: healthSchema.optional() }),
  z.object({ action: z.literal("pharmacy"), details: pharmacyDetailsSchema }),
]);
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });
function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) return json({ error: "تحقق من البيانات / Vérifiez les données / Check the fields." }, 400);
  console.error("Profile details failed"); return json({ error: "Service unavailable; retry." }, 503);
}
export async function GET(request: Request) {
  try {
    const user = await identity(request), db = database();
    await rateLimit(user.userId, "profile-details-read", 60);
    const profile = await db.prepare("SELECT details,health FROM profiles WHERE id=?").bind(user.userId).first<{details:string;health:string}>();
    const pharmacy = await db.prepare("SELECT details FROM registered_pharmacies WHERE owner=?").bind(user.userId).first<{details:string}>();
    return json({ details: parseDetails(personalSchema, profile?.details), health: parseDetails(healthSchema, profile?.health), pharmacy: pharmacy ? parseDetails(pharmacyDetailsSchema, pharmacy.details) : null });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const user = await identity(request), db = database(), input = schema.parse(await limitedJson(request,8192));
    await rateLimit(user.userId, "profile-details-write", 30);
    if (input.action === "personal") {
      if (input.health && (await isAdmin(user.userId) || await db.prepare("SELECT id FROM registered_pharmacies WHERE owner=?").bind(user.userId).first())) throw new HttpError("Health notes are available to client profiles",403);
      if (!await db.prepare("SELECT id FROM profiles WHERE id=?").bind(user.userId).first()) throw new HttpError("Open your account first", 409);
      const name = [input.details.firstName, input.details.lastName].filter(Boolean).join(" ");
      const writes = [db.prepare("UPDATE profiles SET details=?,name=CASE WHEN ?!='' THEN ? ELSE name END WHERE id=?").bind(JSON.stringify(input.details),name,name,user.userId)];
      // Legacy/native basic profile saves cannot erase optional health details or grant consent.
      if (input.health) writes.push(db.prepare("UPDATE profiles SET health=? WHERE id=?").bind(JSON.stringify(input.health),user.userId));
      writes.push(audit(user.userId,"profile-details",user.userId,"Profile updated; field values omitted"));
      await db.batch(writes);
    } else {
      const pharmacy = await db.prepare("SELECT id,status FROM registered_pharmacies WHERE owner=?").bind(user.userId).first<{id:string;status:string}>();
      if (!pharmacy) throw new HttpError("Register your pharmacy first",404);
      if (pharmacy.status === "suspended") throw new HttpError("Pharmacy suspended",403);
      await db.batch([db.prepare("UPDATE registered_pharmacies SET details=?,updated=MAX(updated+1,?) WHERE id=? AND owner=?").bind(JSON.stringify(input.details),Date.now(),pharmacy.id,user.userId),audit(user.userId,"pharmacy-details",pharmacy.id,"Contact/access details updated; field values omitted")]);
    }
    return json({ saved: true });
  } catch (error) { return failure(error); }
}
