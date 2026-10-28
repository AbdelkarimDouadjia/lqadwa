import entries from "./medicines-2026.json" with { type: "json" };
export const assistantCatalogVersion = "miph-2026-08";
export const assistantCatalog = entries.map(([brand,dose,ingredient,form,registration], index) => ({
  id:`${assistantCatalogVersion}:${String(index).padStart(5,"0")}`, catalogVersion:assistantCatalogVersion,
  name:`${brand} ${dose}`.trim(), brand, dose, ingredient, form, registration,
}));
export function normalizeCatalog(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي")
    .replace(/[٠-٩۰-۹]/g,c=>String("٠١٢٣٤٥٦٧٨٩".includes(c)?"٠١٢٣٤٥٦٧٨٩".indexOf(c):"۰۱۲۳۴۵۶۷۸۹".indexOf(c)))
    .toLowerCase().replace(/µ|μ/g,"u").replace(/(\d),(\d)/g,"$1.$2").replace(/(\d)(?=[a-z])/g,"$1 ")
    .replace(/[^\p{L}\p{N}./]+/gu," ").trim().replace(/\s+/g," ");
}
const indexed=assistantCatalog.map(item=>({item,words:normalizeCatalog(`${item.name} ${item.ingredient} ${item.form}`).split(" ")}));
const byId=new Map(assistantCatalog.map(item=>[item.id,item]));
export const getAssistantMedicine=(id:string)=>byId.get(id);
export function searchAssistantCatalog(query:string) {
  const terms=normalizeCatalog(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  // Numbers are whole tokens: 10 never matches 100; strength and form remain distinct records.
  return indexed.filter(row=>terms.every(term=>row.words.some(word=>/\d/.test(term)?word===term:word.startsWith(term))))
    .slice(0,8).map(row=>row.item);
}
