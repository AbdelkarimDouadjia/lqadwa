import type { Pharmacy, Booking, RequestRecord, Reply } from "./domain";
export type ClientFilters={radius:number;query:string;savedOnly:boolean};
export function filterPharmacies(rows:Pharmacy[],filters:ClientFilters,saved:string[]){
 const query=filters.query.trim().toLocaleLowerCase();
 return rows.filter(p=>(!filters.radius||p.distance<=filters.radius*1000)&&(!query||`${p.name} ${p.area}`.toLocaleLowerCase().includes(query))&&(!filters.savedOnly||saved.includes(p.id))).sort((a,b)=>a.distance-b.distance);
}
export function bookingStatus(booking:Booking,now:number):Booking["status"] {return booking.status==="active"&&booking.expires<=now?"expired":booking.status;}
export function requestStatus(request:RequestRecord,replies:Reply[],now:number):"stopped"|"expired"|"available"|"pending"{
 if(request.stopped)return "stopped";
 if(request.created<=now-86400_000)return "expired";
 return replies.some(r=>r.request===request.id&&r.status==="yes"&&r.updated!==null&&r.updated>now-1800000)?"available":"pending";
}
export function csvCell(value:unknown):string {let text=String(value??"");if(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
