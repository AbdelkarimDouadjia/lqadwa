import { database } from "@/db";
import { HttpError, tokenHash } from "@/lib/access";

export async function createDeviceSession(owner: string) {
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`, now = Date.now(), expires = now + 7 * 86400_000;
  const saved = await database().prepare("INSERT INTO mobile_sessions (hash, owner, created, expires) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM closed_accounts WHERE hash = ?) AND NOT EXISTS (SELECT 1 FROM account_controls WHERE owner = ? AND suspended = 1)")
    .bind(await tokenHash(token), owner, now, expires, await tokenHash(owner), owner).run();
  if (!saved.meta.changes) throw new HttpError("Account unavailable", 403);
  return { token, expires };
}
