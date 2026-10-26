export type PrescriptionCandidate = { id:string;catalogVersion:string;name:string;brand:string;dose:string;ingredient:string;form:string;registration:string };
// Exact whole-brand matches only. Never guess a strength or select a medicine for the patient.
export function prescriptionMatches(raw: string, catalog: readonly (readonly string[])[]): PrescriptionCandidate[] {
  const words = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const text = ` ${words(raw.slice(0, 15000))} `;
  const unique = new Set<string>();
  const result: PrescriptionCandidate[] = [];
  for (const [index, [brand, dose, ingredient, form = "", registration = ""]] of catalog.entries()) {
    const term = words(brand);
    if (term.length < 4 || !text.includes(` ${term} `)) continue;
    const name = `${brand} ${dose}`.trim();
    const key=JSON.stringify([name,ingredient,form,registration]);
    if (unique.has(key)) continue;
    unique.add(key); result.push({ id:`miph-2026-08:${String(index).padStart(5,"0")}`,catalogVersion:"miph-2026-08",name,brand,dose,ingredient,form,registration });
  }
  return result;
}
