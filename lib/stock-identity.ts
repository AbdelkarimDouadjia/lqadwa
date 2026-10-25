import { HttpError } from "@/lib/access";
import { resolveMedicine } from "@/lib/medicine-catalog";
export type StoredStockIdentity={name:string;medicine_id:string|null;catalog_version:string|null;identity_json:string|null};
export function stockIdentity(input:{name:string;medicineId?:string;catalogVersion?:string},previous?:StoredStockIdentity|null){
  if(!input.medicineId&&!input.catalogVersion&&previous?.name===input.name)return {name:previous.name,medicineId:previous.medicine_id,version:previous.catalog_version,json:previous.identity_json};
  try{const result=resolveMedicine({medicine:input.name,medicineId:input.medicineId,catalogVersion:input.catalogVersion});return {name:result.label,medicineId:result.identity?.id||null,version:result.identity?.catalogVersion||null,json:result.identity?JSON.stringify(result.identity):null};}
  catch{throw new HttpError("Select a current catalog medicine or use an unverified manual entry.",400,"INVALID_MEDICINE_ID");}
}
