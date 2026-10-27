import { cities } from "./wilayas";
import type { AdminAccess, AdminPermission } from "./admin-permissions";
export { cities };

export type Pharmacy = { id: string; name: string; city: string; area: string; distance: number; duty: boolean; hours: string; lat: number; lng: number; pilot: boolean; phone?: string };
// Deny-list for pre-release record IDs only; never a pharmacy directory.
export const legacySampleIds = new Set(["algiers", "oran", "constantine", "setif", "annaba", "blida"].flatMap(city => [1, 2, 3].map(n => `${city}-${n}`)));

export const medicines = [
  { name: "دوليبران 1000 مغ", latin: "Doliprane 1000 mg", ingredient: "باراسيتامول · Paracétamol" },
  { name: "أوغمنتين 1 غ", latin: "Augmentin 1 g", ingredient: "Amoxicilline / acide clavulanique" },
  { name: "فنتولين 100 مكغ", latin: "Ventoline 100 µg", ingredient: "سالبوتامول · Salbutamol" },
  { name: "لانتوس 100 وحدة/مل", latin: "Lantus 100 UI/ml", ingredient: "Insuline glargine" },
  { name: "غلوكوفاج 850 مغ", latin: "Glucophage 850 mg", ingredient: "ميتفورمين · Metformine" },
];
export type RequestRecord = { id: string; medicine: string; city: string; created: number; stopped?: number };
export type Reply = { request: string; pharmacy: string; status: "pending" | "yes" | "no"; updated: number | null };
export type Booking = { id: string; request: string; pharmacy: string; code: string; created: number; expires: number; status: "active" | "expired" | "cancelled" | "collected"; medicine: string };
export type Notice = { id: string; title: string; created: number; read: number };
export type PharmacyApplication = { id: string; name: string; address: string; city: string; latitude: number; longitude: number; phone: string; license: string; status: "pending" | "approved" | "rejected" | "suspended"; duty: number; hours: string; created: number; updated: number };
export type StaffRequest = { id: string; pharmacy: string; medicine: string; created: number; city: string; status: Reply["status"] };
export type StaffBooking = Omit<Booking, "code"> & { approachLat?: number | null; approachLng?: number | null; approachUpdated?: number | null };
export type StockItem = { id: string; pharmacy: string; name: string; quantity: number; updated: number };
export type AppData = {
  adminStepUpRequired?: boolean;
  service?: { requests_paused: number; pickups_paused: number; message: string; updated: number };
  profile: { id?: string; name: string; city: string }; pharmacies: Pharmacy[];
  requests: RequestRecord[]; responses: Reply[]; reservations: Booking[]; notifications: Notice[];
  role: "client" | "pharmacist" | "admin"; ownPharmacy: PharmacyApplication | null;
  staffRequests: StaffRequest[]; staffBookings: StaffBooking[]; stock: StockItem[];
  admin: { applications: (PharmacyApplication & { owner: string })[]; applicationsCount: number; workload?: { pendingPharmacies?: number; accounts?: number; requests?: number; reservations?: number }; users: number; searches: number; bookings: number; canInvite: boolean; access: AdminAccess; owners: { id: string; name: string }[];
    accounts: { id: string; name: string; city: string; suspended: number; reason: string; protected: boolean }[];
    members: { owner: string; name: string; created: number; email: string; permissions: AdminPermission[] }[];
    activity: { id: string; actor: string; action: string; target: string; detail: string; created: number }[];
    inventory: (StockItem & { pharmacyName: string })[];
  } | null;
};
export function normalize(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f\u064B-\u065F]/g, "").replace(/[أإآ]/g, "ا").toLowerCase().trim();
}
export function distanceLabel(meters: number) { return meters < 1000 ? `${meters} م` : `${(meters / 1000).toFixed(1)} كم`; }
export function timeLeft(expires: number, now: number) {
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((n) => String(n).padStart(2, "0")).join(":");
}
export function isFreshReply(reply: Reply | undefined, now: number) {
  return reply?.status === "yes" && reply.updated !== null && now - reply.updated < 30 * 60_000;
}
