import { z } from "zod";
import { database } from "@/db";
import { identity, HttpError } from "@/lib/access";
import { limitedJson, requireMutationOrigin, rateLimit, privateHeaders } from "@/lib/http-security";
import { currentReleasePolicy } from "@/lib/release-runtime";
import { assistantToolInput, approvedHelp } from "@/lib/assistant-tools";
import { searchMedicines, catalogVersion } from "@/lib/medicine-catalog";
export const dynamic = "force-dynamic";
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
export async function POST(request:Request){
  try {
    requireMutationOrigin(request);
    const input=assistantToolInput.parse(await limitedJson(request,2048));
    if(!currentReleasePolicy().assistant)throw new HttpError("Assistant disabled. Use manual search and request tracking.",503,"FEATURE_DISABLED");
    const user=await identity(request);
    await rateLimit(user.userId,"assistant-read-only",10,60);
    // Deterministic, zero-token-cost fallback. No model/provider receives data.
    if(input.tool==="help")return json({mode:"structured-help",answer:approvedHelp[input.topic].text,citations:[{title:"LQADWA service information",url:approvedHelp[input.topic].source}],asOf:new Date().toISOString()});
    if(input.tool==="catalog")return json({mode:"catalog-lookup",items:searchMedicines(input.query,5),catalogVersion,availability:"not-confirmed",clinicalVerification:false,citations:[{title:"Versioned catalog lookup",url:`/api/medicines?q=${encodeURIComponent(input.query)}`} ]});
    const db=database();
    const result=await db.prepare("SELECT r.id,r.created,COALESCE(c.stopped,0) AS stopped FROM requests r LEFT JOIN request_controls c ON c.request=r.id WHERE r.id=? AND r.owner=?").bind(input.request,user.userId).first<{id:string;created:number;stopped:number}>();
    if(!result)throw new HttpError("Request not found",404);
    const replies=await db.prepare("SELECT status,count(*) AS count FROM responses WHERE request=? GROUP BY status").bind(result.id).all();
    const reservation=await db.prepare("SELECT status,expires FROM reservations WHERE request=? AND owner=?").bind(result.id,user.userId).first<{status:string;expires:number}>();
    const now=Date.now();
    return json({mode:"live-request-status",request:result.id,stopped:!!result.stopped,expired:result.created<=now-86400_000,replies:replies.results,
      reservation:reservation?{status:reservation.status==="active"&&reservation.expires<=now?"expired":reservation.status,expires:reservation.expires}:null,
      asOf:new Date(now).toISOString(),citations:[{title:"Your authenticated request tracker",url:"/?space=client#bookings"}]});
  }catch(error){
    if(error instanceof HttpError)return json({error:error.message,code:error.code},error.status);
    if(error instanceof z.ZodError)return json({error:"Choose a supported read-only tool. Clinical advice is unavailable."},400);
    return json({error:"Assistant unavailable. Use manual search and request tracking."},503);
  }
}
