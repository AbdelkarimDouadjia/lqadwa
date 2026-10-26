import { z } from "zod";
import { database } from "@/db";
import { identity, HttpError } from "@/lib/access";
import { limitedJson, privateHeaders, rateLimit, requireMutationOrigin } from "@/lib/http-security";
import { discoverPharmacies, pharmacyFromRow } from "@/lib/pharmacy-discovery";
import { discoveryFilterFields, routingFilters } from "@/lib/discovery-contract";
import { cities } from "@/lib/domain";
export const dynamic = "force-dynamic";
const schema = z.object({ ...discoveryFilterFields, limit:z.number().int().min(1).max(50).default(50), cursor:z.string().max(1500).optional() }).strict();
const cursorSchema = z.object({filters:z.string().max(500),score:z.number().min(0).max(1e16),id:z.string().min(1).max(100)}).strict();
const json = (value: unknown, status = 200) => Response.json(value, {status,headers:privateHeaders});
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const input = schema.parse(await limitedJson(request)), user = await identity(request);
    await rateLimit(user.userId,"authenticated-directory",90);
    const filters = routingFilters(input), key = JSON.stringify(filters);
    let after;
    if (input.cursor) {
      try { const decoded = cursorSchema.parse(JSON.parse(atob(input.cursor))); if(decoded.filters!==key)throw Error(); after={score:decoded.score,id:decoded.id}; }
      catch { throw new HttpError("Filters changed; restart the directory.",400,"INVALID_CURSOR"); }
    }
    const rows = await discoverPharmacies(database(),{...filters,limit:input.limit+1,after}), page=rows.slice(0,input.limit),last=page.at(-1);
    const center = filters.origin || cities.find(c=>c.id===input.city)!;
    return json({ items:page.map(row=>({...pharmacyFromRow(row),distance:Math.round(Math.sqrt(row.score)/1e6*111000)})),
      nextCursor:rows.length>input.limit&&last?btoa(JSON.stringify({filters:key,score:last.score,id:last.id})):null,
      distanceOrigin:{type:filters.origin?"consented-coarse-location":"wilaya-center",approximate:true,lat:center.lat,lng:center.lng},availability:"not-confirmed",recipientLimit:25 });
  } catch(error) {
    if(error instanceof HttpError)return json({error:error.message,code:error.code},error.status);
    if(error instanceof z.ZodError)return json({error:"Invalid discovery filters"},400);
    return json({error:"Directory unavailable. Retry without changing your request."},503);
  }
}
