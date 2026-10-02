export type MapPoint = { lat: number; lng: number; accuracy?: number };
export function googleMapsDirections(destination: MapPoint, mode: "driving" | "walking" | "transit", origin?: MapPoint | null) {
  const query = new URLSearchParams({ api: "1", destination: `${destination.lat},${destination.lng}`, travelmode: mode });
  if (origin) query.set("origin", `${origin.lat},${origin.lng}`);
  if (mode !== "transit") query.set("dir_action", "navigate");
  return `https://www.google.com/maps/dir/?${query}`;
}
