import { cities, legacySampleIds, type Pharmacy } from "@/lib/domain";
import { discoveryQuery, publicPharmacyColumns } from "./pharmacy-discovery-query.mjs";

export type PublicPharmacyRow = {
  id: string; name: string; address: string; city: string; latitude: number;
  longitude: number; phone: string; duty: number; hours: string;
};
export type DiscoveryOptions = { city: string; night: boolean; limit: number; radiusKm?: number; after?: { score: number; id: string } };
type RankedRow = PublicPharmacyRow & { score: number };

export function pharmacyFromRow(row: PublicPharmacyRow): Pharmacy {
  const center = cities.find(city => city.id === row.city) || cities[0];
  return {
    id: row.id, name: row.name, city: row.city, area: row.address,
    lat: row.latitude / 1e6, lng: row.longitude / 1e6, phone: row.phone,
    pilot: false, duty: Boolean(row.duty), hours: row.hours,
    distance: Math.round(Math.hypot(center.lat - row.latitude / 1e6, (center.lng - row.longitude / 1e6) * Math.cos(center.lat * Math.PI / 180)) * 111_000),
  };
}

export async function discoverPharmacies(db: D1Database, options: DiscoveryOptions): Promise<RankedRow[]> {
  const center = cities.find(city => city.id === options.city);
  if (!center) throw new Error("Unknown discovery city");
  const query = discoveryQuery({ ...options, lat: center.lat, lng: center.lng, excluded: [...legacySampleIds] });
  const result = await db.prepare(query.sql).bind(...query.parameters).all<RankedRow>();
  return result.results;
}

// Older Android builds look up response/reservation details in snapshot.pharmacies.
// Preserve that contract without letting the national preview cap hide recipients.
export async function relatedPharmacies(db: D1Database, ids: string[], present: Set<string>): Promise<Pharmacy[]> {
  const missing = [...new Set(ids)].filter(id => !present.has(id) && !legacySampleIds.has(id)).slice(0, 400);
  const items: Pharmacy[] = [];
  // D1 has a bounded SQL-variable count; never bind the whole snapshot at once.
  for (let offset = 0; offset < missing.length; offset += 90) {
    const chunk = missing.slice(offset, offset + 90);
    const rows = await db.prepare(`SELECT ${publicPharmacyColumns} FROM registered_pharmacies WHERE status='approved' AND id IN (${chunk.map(() => '?').join(',')})`).bind(...chunk).all<PublicPharmacyRow>();
    items.push(...rows.results.map(pharmacyFromRow));
  }
  return items;
}
