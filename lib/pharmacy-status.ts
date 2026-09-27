import { database } from "@/db";
// All effects run in the caller's transaction: no active pickup at a suspended pharmacy.
export function stopPharmacyBookings(pharmacy: string, now: number) {
 const db=database();
 return [
  db.prepare("INSERT INTO notifications (id, owner, title, created, read) SELECT lower(hex(randomblob(16))), owner, 'LQADWA: pharmacy unavailable; your reservation was cancelled. Please search again.', ?, 0 FROM reservations WHERE pharmacy = ? AND status = 'active' AND expires > ?").bind(now,pharmacy,now),
  db.prepare("DELETE FROM reservation_locations WHERE reservation IN (SELECT id FROM reservations WHERE pharmacy = ?)").bind(pharmacy),
  db.prepare("UPDATE reservations SET status = 'cancelled' WHERE pharmacy = ? AND status = 'active'").bind(pharmacy),
  db.prepare("UPDATE responses SET status = 'no', updated = ? WHERE pharmacy = ? AND status IN ('pending','yes')").bind(now,pharmacy),
 ];
}
