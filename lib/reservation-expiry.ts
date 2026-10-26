export async function expireReservations(db:D1Database,owner:string,now:number){
  const scope="b.status='active' AND b.expires<=? AND (b.owner=? OR b.pharmacy IN(SELECT id FROM registered_pharmacies WHERE owner=?))";
  await db.batch([
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read) SELECT 'expired:'||b.id||':patient',b.owner,?,?,0 FROM reservations b WHERE ${scope} ON CONFLICT(id) DO NOTHING`).bind("انتهت مهلة الحجز. يمكنك إرسال طلب توفر جديد.",now,now,owner,owner),
    db.prepare(`INSERT INTO notifications(id,owner,title,created,read) SELECT 'expired:'||b.id||':pharmacy',p.owner,?,?,0 FROM reservations b JOIN registered_pharmacies p ON p.id=b.pharmacy WHERE ${scope} ON CONFLICT(id) DO NOTHING`).bind("انتهت مهلة حجز؛ راجع قائمة الاستلام.",now,now,owner,owner),
    db.prepare("UPDATE reservations SET status='expired' WHERE status='active' AND expires<=? AND (owner=? OR pharmacy IN(SELECT id FROM registered_pharmacies WHERE owner=?))").bind(now,owner,owner),
    db.prepare("DELETE FROM reservation_locations WHERE reservation IN(SELECT id FROM reservations WHERE status='expired' AND (owner=? OR pharmacy IN(SELECT id FROM registered_pharmacies WHERE owner=?)))").bind(owner,owner),
  ]);
}
