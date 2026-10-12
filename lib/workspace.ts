import type { AppData } from "./domain";

export type View = "search" | "bookings" | "map" | "account" | "pharmacy" | "admin";
type Role = AppData["role"];

// Navigation is a presentation policy. API authorization remains server-side.
export function workspaceNavigation(role: Role): View[] {
  if (role === "admin") return ["admin", "account"];
  if (role === "pharmacist") return ["pharmacy", "account"];
  return ["search", "bookings", "map", "account"];
}

export function workspaceView(requested: View, role: Role, signedOut: boolean): View {
  if (signedOut) return requested === "pharmacy" ? "pharmacy" : "search";
  // Joining a pharmacy is an explicit secondary journey for a client, not a tab.
  if (role === "client" && requested === "pharmacy") return requested;
  return workspaceNavigation(role).includes(requested) ? requested : workspaceNavigation(role)[0];
}

export function canSubmitPharmacy(status?: string): boolean {
  return status === undefined || status === "rejected";
}
