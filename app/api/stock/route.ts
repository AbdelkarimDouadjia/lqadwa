import { z } from "zod";
import { database } from "@/db";
import { identity,HttpError } from "@/lib/access";
import { privateHeaders,limitedJson,requireMutationOrigin,rateLimit } from "@/lib/http-security";
export const dynamic="force-dynamic";
const id=z.string().min(1).max(100);
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("create"),name:z.string().trim().min(2).max(100),quantity:z.number().int().min(0).max(9999)}),
 z.object({action:z.literal("edit"),id,updated:z.number().int(),name:z.string().trim().min(2).max(100),quantity:z.number().int().min(0).max(9999)}),
 z.object({action:z.literal("delete"),id,updated:z.number().int()}),
]);
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:privateHeaders});
function failure(e:unknown){if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:"Check the fields / تحقق من البيانات"},400);console.error("Inventory operation failed");return json({error:"Refresh and retry / حدّث وحاول مجدداً"},503);}
async function access(request:Request){const user=await identity(request),db=database();const pharmacy=await db.prepare("SELECT id FROM registered_pharmacies WHERE owner=? AND status='approved'").bind(user.userId).first<{id:string}>();if(!pharmacy)throw new HttpError("Approved pharmacy access required",403);return {user,db,pharmacy:pharmacy.id};}
export async function GET(request:Request){try{
 const {user,db,pharmacy}=await access(request);await rateLimit(user.userId,"stock-read",60);
 const params=new URL(request.url).searchParams,page=z.coerce.number().int().min(0).max(100000).parse(params.get("page")||0),threshold=z.coerce.number().int().min(1).max(100).parse(params.get("threshold")||5),q=z.string().max(100).parse(params.get("q")||"").trim(),filter=z.enum(["all","low","out","in"]).parse(params.get("filter")||"all"),sort=z.enum(["newest","name","quantity"]).parse(params.get("sort")||"newest");
 const condition=filter==="low"?` AND quantity>0 AND quantity<=${threshold}`:filter==="out"?" AND quantity=0":filter==="in"?" AND quantity>0":"",order=({newest:"updated DESC,id",name:"name,id",quantity:"quantity,name,id"} as const)[sort];
 const where=" WHERE pharmacy=? AND instr(lower(name),lower(?))>0"+condition;
 const rows=await db.batch([db.prepare(`SELECT id,pharmacy,name,quantity,updated FROM stock_items${where} ORDER BY ${order} LIMIT 50 OFFSET ?`).bind(pharmacy,q,page*50),db.prepare(`SELECT count(*) AS total FROM stock_items${where}`).bind(pharmacy,q),db.prepare("SELECT count(*) AS total,COALESCE(sum(quantity),0) AS units,COALESCE(sum(quantity=0),0) AS out,COALESCE(sum(quantity>0 AND quantity<=?),0) AS low FROM stock_items WHERE pharmacy=?").bind(threshold,pharmacy)]);
 return json({rows:rows[0].results,total:(rows[1].results[0] as {total:number}).total,page,summary:rows[2].results[0]});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 requireMutationOrigin(request);const {user,db,pharmacy}=await access(request);await rateLimit(user.userId,"stock-write",60);const input=schema.parse(await limitedJson(request));
 const now=Date.now(),target=input.action==="create"?crypto.randomUUID():input.id;
 if(input.action!=="delete"&&await db.prepare("SELECT id FROM stock_items WHERE pharmacy=? AND lower(name)=lower(?) AND id!=?").bind(pharmacy,input.name,target).first())throw new HttpError("Medicine already exists; edit its entry",409);
 const write=input.action==="create"?db.prepare("INSERT INTO stock_items(id,pharmacy,name,quantity,updated) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM registered_pharmacies WHERE id=? AND owner=? AND status='approved')").bind(target,pharmacy,input.name,input.quantity,now,pharmacy,user.userId):input.action==="edit"?db.prepare("UPDATE stock_items SET name=?,quantity=?,updated=? WHERE id=? AND pharmacy=? AND updated=? AND EXISTS(SELECT 1 FROM registered_pharmacies WHERE id=? AND owner=? AND status='approved')").bind(input.name,input.quantity,Math.max(now,input.updated+1),input.id,pharmacy,input.updated,pharmacy,user.userId):db.prepare("DELETE FROM stock_items WHERE id=? AND pharmacy=? AND updated=? AND EXISTS(SELECT 1 FROM registered_pharmacies WHERE id=? AND owner=? AND status='approved')").bind(input.id,pharmacy,input.updated,pharmacy,user.userId);
 const result=await db.batch([write,db.prepare("INSERT INTO audit_log(id,actor,action,target,detail,created) SELECT ?,?,?,?,?,? WHERE changes()>0").bind(crypto.randomUUID(),user.userId,`stock-${input.action}`,target,"Pharmacy inventory update",now)]);
 if(!result[0].meta.changes)throw new HttpError("Inventory changed; refresh before editing",409);
 return json({saved:true});
}catch(e){return failure(e);}}
