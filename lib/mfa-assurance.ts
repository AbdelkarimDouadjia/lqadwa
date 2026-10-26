export const stepUpLifetimeSeconds = 600;
export function hasRecentMfa(claims: unknown, subject: string, now = Date.now()) {
  if (!claims || typeof claims !== "object") return false;
  const c = claims as Record<string, unknown>, seconds = now / 1000;
  if (c.sub !== subject || c.aal !== "aal2" || typeof c.session_id !== "string" || !c.session_id
    || typeof c.exp !== "number" || c.exp <= seconds || !Array.isArray(c.amr)) return false;
  return c.amr.some((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const proof = item as Record<string, unknown>;
    return proof.method === "totp" && typeof proof.timestamp === "number"
      && proof.timestamp <= seconds + 30 && proof.timestamp > seconds - stepUpLifetimeSeconds;
  });
}
