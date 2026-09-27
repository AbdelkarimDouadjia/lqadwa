import { database } from "@/db";
import { HttpError, tokenHash } from "@/lib/access";

export const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
export function requireMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // A native session may omit Origin; browser requests must always match it.
  if (origin) {
    if (origin !== new URL(request.url).origin) throw new HttpError("Invalid request origin", 403);
  } else if (!/^[0-9a-f-]{73}$/.test(request.headers.get("x-lqadwa-session") || "")) {
    throw new HttpError("Sign in and retry / سجّل الدخول وأعد المحاولة", request.headers.has("x-lqadwa-session") ? 401 : 403);
  }
}
export async function limitedJson(request: Request, limit = 4096): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new HttpError("Expected JSON", 415);
  if (Number(request.headers.get("content-length")) > limit) throw new HttpError("Request too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError("Empty request");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError("Request too large", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new HttpError("Invalid JSON", 400); }
}
export async function rateLimit(subject: string, scope: string, limit: number, seconds = 60) {
  const now = Date.now(), bucket = Math.floor(now / (seconds * 1000));
  const key = await tokenHash(`${scope}:${subject}:${bucket}`);
  const row = await database().prepare("INSERT INTO rate_limits (key, count, expires) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count")
    .bind(key, (bucket + 1) * seconds * 1000).first<{ count: number }>();
  if (!row || row.count > limit) throw new HttpError("Too many requests. Retry shortly. / طلبات كثيرة، حاول بعد قليل.", 429);
}

// At most one maintenance pass per 15 minutes across Worker instances; no timers or paid scheduler.
export async function maintainEphemeralData() {
  const db = database(), now = Date.now();
  const lease = await db.prepare("INSERT INTO maintenance (key, last_run) VALUES ('ephemeral', ?) ON CONFLICT(key) DO UPDATE SET last_run = excluded.last_run WHERE last_run < ? RETURNING key").bind(now, now - 900_000).first();
  if (!lease) return;
  await db.batch([
    db.prepare("DELETE FROM rate_limits WHERE expires < ?").bind(now - 3600_000),
    db.prepare("DELETE FROM device_links WHERE expires < ?").bind(now),
    db.prepare("DELETE FROM mobile_sessions WHERE expires < ?").bind(now),
    db.prepare("DELETE FROM admin_invites WHERE expires < ?").bind(now),
    db.prepare("DELETE FROM reservation_locations WHERE updated < ?").bind(now - 300_000),
  ]);
}
