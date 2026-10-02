export type PrescriptionCandidate = { name: string; ingredient: string };
// Exact whole-brand matches only. Never guess a strength or select a medicine for the patient.
export function prescriptionMatches(raw: string, catalog: readonly (readonly string[])[]): PrescriptionCandidate[] {
  const words = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const text = ` ${words(raw.slice(0, 15000))} `;
  const unique = new Set<string>();
  const result: PrescriptionCandidate[] = [];
  for (const [brand, dose, ingredient] of catalog) {
    const term = words(brand);
    if (term.length < 4 || !text.includes(` ${term} `)) continue;
    const name = `${brand} ${dose}`.trim();
    if (unique.has(name)) continue;
    unique.add(name); result.push({ name, ingredient });
  }
  return result;
}
