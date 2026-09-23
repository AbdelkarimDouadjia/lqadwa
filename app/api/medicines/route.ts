import { normalize } from "@/lib/domain";
import nomenclature from "@/lib/medicines-2026.json";

export const dynamic = "force-dynamic";
type Entry = [string, string, string, string, string];
const entries = nomenclature as Entry[];

export async function GET(request: Request) {
  const query = normalize(new URL(request.url).searchParams.get("q") || "").slice(0, 80);
  if (query.length < 2) return Response.json({ items: [], source: "MIPH 2026-08" });
  const tokens = query.split(/\s+/).filter(Boolean);
  const items = entries.map(([brand, dose, ingredient, form, registration]) => {
    const name = `${brand} ${dose}`.trim();
    const normalizedName = normalize(name);
    const haystack = `${normalizedName} ${normalize(ingredient)}`;
    const match = tokens.every((token) => haystack.includes(token));
    const score = normalizedName === query ? 0 : normalizedName.startsWith(query) ? 1 : normalize(brand).startsWith(tokens[0]) ? 2 : 3;
    return match ? { name, brand, dose, ingredient, form, registration, score } : null;
  }).filter((item) => item !== null).sort((a, b) => a.score - b.score || a.name.localeCompare(b.name)).slice(0, 8)
    .map(({ name, brand, dose, ingredient, form, registration }) => ({ name, brand, dose, ingredient, form, registration }));
  return Response.json({ items, source: "MIPH 2026-08" }, { headers: { "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
}
