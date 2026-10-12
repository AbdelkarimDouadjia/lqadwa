export type ManagementSection = "overview" | "accounts" | "pharmacies" | "inventory" | "requests" | "reservations" | "audit" | "service";
export type ManagementRow = Record<string, string | number | boolean | null>;
export type ServiceControls = { requests_paused: number; pickups_paused: number; message: string; updated: number };
export type ManagementData = {
  rows: ManagementRow[]; total: number; page: number;
  metrics?: Record<string, number>;
  daily?: { day: string; searches: number; bookings: number }[];
  service?: ServiceControls;
};
