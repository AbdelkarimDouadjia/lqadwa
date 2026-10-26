import entries from "./medicines-2026.json" with { type: "json" };

export const catalogVersion = "miph-2026-08";
export type MedicineIdentity = { id: string; catalogVersion: string; name: string; brand: string; dose: string; ingredient: string; form: string; registration: string };
export function normalizeMedicine(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي")
    .replace(/[٠-٩۰-۹]/g, c => String("٠١٢٣٤٥٦٧٨٩".includes(c)?"٠١٢٣٤٥٦٧٨٩".indexOf(c):"۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .toLowerCase().replace(/µ|μ/g,"u").replace(/(\d),(\d)/g,"$1.$2")
    .replace(/(\d)(?=[a-z])/g,"$1 ").replace(/[^\p{L}\p{N}./]+/gu," ").trim().replace(/\s+/g," ");
}
export const medicineCatalog: readonly MedicineIdentity[] = entries.map(([brand,dose,ingredient,form,registration], index) => ({
  id: `${catalogVersion}:${String(index).padStart(5,"0")}`, catalogVersion,
  name: `${brand} ${dose}`.trim(), brand, dose, ingredient, form, registration,
}));
const byId = new Map(medicineCatalog.map(item=>[item.id,item]));
const indexed = medicineCatalog.map(item=>({ item, text: normalizeMedicine(`${item.name} ${item.ingredient}`), brand:normalizeMedicine(item.brand) }));
export function medicineById(id: string) { return byId.get(id); }
export function searchMedicines(raw: string, limit = 8) {
  const query = normalizeMedicine(raw.slice(0,100));
  if (query.length < 2) return [];
  const terms = query.split(" ");
  return indexed.filter(row => terms.every(term => /\d/.test(term) ? row.text.split(" ").includes(term) : row.text.split(" ").some(word=>word.startsWith(term))))
    .sort((a,b)=>(a.text===query?0:a.brand.startsWith(query)?1:2)-(b.text===query?0:b.brand.startsWith(query)?1:2) || a.item.name.localeCompare(b.item.name) || a.item.id.localeCompare(b.item.id)).slice(0,limit).map(row=>row.item);
}
export type MedicineSelection = { medicine: string; medicineId?: string; catalogVersion?: string; selectionSource?: "manual" | "catalog" | "ocr" };
export function resolveMedicine(input: MedicineSelection) {
  if (input.medicineId) {
    const identity = medicineById(input.medicineId);
    if (!identity || input.catalogVersion !== catalogVersion) throw new Error("INVALID_MEDICINE_ID");
    return { label: `${identity.name} · ${identity.form}`, identity, status: "catalog-identified" as const, source: input.selectionSource === "ocr" ? "ocr" : "catalog" };
  }
  if (input.catalogVersion) throw new Error("INVALID_MEDICINE_ID");
  if(input.medicine.trim().length>100)throw new Error("MANUAL_NAME_TOO_LONG");
  // Legacy Android free text never becomes clinically verified.
  return { label: input.medicine.trim(), identity: null, status: "unverified" as const, source: input.selectionSource === "ocr" ? "ocr" : "manual" };
}
