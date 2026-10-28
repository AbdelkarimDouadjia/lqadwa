import { database } from "@/db";
import { cities } from "@/lib/domain";
import { discoverPharmacies, pharmacyFromRow } from "@/lib/pharmacy-discovery";
import { HttpError, tokenHash } from "@/lib/access";
import { assistantText } from "./assistant-copy";
import { assistantCatalogVersion, getAssistantMedicine, searchAssistantCatalog } from "./assistant-catalog";
import type { AssistantAnswer, AssistantInput } from "./assistant-contract";

export async function readAssistantTool(input:Exclude<AssistantInput,{tool:"help"}>, owner:string):Promise<AssistantAnswer> {
  const db=database(), now=Date.now(), text=(key:Parameters<typeof assistantText>[1])=>assistantText(input.language,key);
  const result:AssistantAnswer={mode:"tool",text:"",asOf:new Date(now).toISOString(),citations:[],records:[]};
  if (input.tool==="catalog" || input.tool==="medicine") {
    const items=input.tool==="catalog"?searchAssistantCatalog(input.query):[getAssistantMedicine(input.medicineId)].filter(item=>!!item);
    if(input.tool==="medicine" && !items.length) throw new HttpError("Medicine not found",404,"not_found");
    result.text=text("catalogNote");
    result.limit=8;
    result.records=items.map(item=>({id:item.id,title:item.name,details:[item.ingredient,item.form,item.registration,assistantCatalogVersion],action:"medicine"}));
    result.citations=[{id:assistantCatalogVersion,title:"MIPH 2026-08 · catalog snapshot",url:"/api/medicines?q="+encodeURIComponent(items[0]?.brand||""),updated:"2026-08",hash:await tokenHash(JSON.stringify(items)),text:assistantCatalogVersion}];
  } else if (input.tool==="pharmacies") {
    const area=cities.find(city=>city.id===input.area);
    if (!area) throw new HttpError("Unknown area",400,"invalid_area");
    const rows=await discoverPharmacies(db,{city:area.id,night:input.night,limit:8});
    result.text=text("directoryNote");
    result.limit=8;
    result.records=rows.map(row=>{const pharmacy=pharmacyFromRow(row);return {id:pharmacy.id,title:pharmacy.name,details:[pharmacy.area,pharmacy.hours,`${pharmacy.distance} m · ${area.latin}`]};});
  } else if (input.tool==="requests") {
    const rows=await db.prepare("SELECT id,medicine,created FROM requests WHERE owner=? ORDER BY created DESC,id DESC LIMIT 10").bind(owner).all<{id:string;medicine:string;created:number}>();
    result.text=text("statusNote");
    result.limit=10;
    result.records=rows.results.map(row=>({id:row.id,title:row.medicine,details:[new Date(row.created).toISOString()],action:"request-status"}));
  } else {
    const row=await db.prepare("SELECT r.id,r.medicine,r.created,COALESCE(c.stopped,0) AS stopped FROM requests r LEFT JOIN request_controls c ON c.request=r.id WHERE r.id=? AND r.owner=?").bind(input.requestId,owner).first<{id:string;medicine:string;created:number;stopped:number}>();
    if (!row) throw new HttpError("Request not found",404,"not_found");
    const replies=await db.prepare("SELECT s.pharmacy,s.status,s.updated,p.name,p.status AS partner_status FROM responses s JOIN requests r ON r.id=s.request JOIN registered_pharmacies p ON p.id=s.pharmacy WHERE s.request=? AND r.owner=? ORDER BY s.pharmacy LIMIT 50").bind(row.id,owner).all<{pharmacy:string;status:string;updated:number|null;name:string;partner_status:string}>();
    const booking=await db.prepare("SELECT b.id,b.status,b.expires FROM reservations b JOIN requests r ON r.id=b.request WHERE b.request=? AND b.owner=? AND r.owner=?").bind(row.id,owner,owner).first<{id:string;status:string;expires:number}>();
    result.text=text("statusNote");
    result.records=[{id:row.id,title:row.medicine,details:[row.stopped?"stopped":now-row.created>=86400_000?"expired":"open"]},...replies.results.map(reply=>({id:reply.pharmacy,title:reply.name,details:[reply.partner_status!=="approved"?"partner-unavailable":row.stopped?"request-stopped":now-row.created>=86400_000?"request-expired":reply.status==="yes"?reply.updated!==null&&now-reply.updated<1800_000&&reply.updated<=now?"confirmed-at-time":"stale-positive":reply.status,reply.updated===null?"":new Date(reply.updated).toISOString()]}))];
    if (booking) result.records.push({id:booking.id,title:"reservation",details:[booking.status==="active"&&booking.expires<=now?"expired":booking.status,new Date(booking.expires).toISOString()]});
    const service=await db.prepare("SELECT requests_paused,pickups_paused FROM service_controls WHERE id=1").first<{requests_paused:number;pickups_paused:number}>();
    if(service?.requests_paused||service?.pickups_paused) result.records.push({id:"service",title:"service-paused",details:[service.requests_paused?"requests-paused":"",service.pickups_paused?"pickups-paused":""].filter(Boolean)});
    result.limit=50;
    // No pickup code, medical notes, other account IDs, prescribing or inferred inventory.
  }
  if (!result.records?.length) result.text+=" "+text("noRecords");
  return result;
}
