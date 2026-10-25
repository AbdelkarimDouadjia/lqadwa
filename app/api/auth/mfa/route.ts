import { z } from "zod";
import { identity, HttpError } from "@/lib/access";
import { authClient } from "@/lib/supabase-server";
import { limitedJson, privateHeaders, rateLimit, requireMutationOrigin } from "@/lib/http-security";
import { requirePrivilegedSession } from "@/lib/privileged-access";

export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enroll") }),
  z.object({ action: z.literal("verify"), factorId: z.string().uuid(), code: z.string().regex(/^\d{6}$/) }),
]);
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: privateHeaders });
function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: "Check the six-digit code." }, 400);
  return json({ error: "Authenticator unavailable. Retry or contact support." }, 503);
}
async function browserUser(request: Request) {
  if (request.headers.has("x-lqadwa-session")) throw new HttpError("Use the private web sign-in for administration.", 403);
  return identity(request);
}
export async function GET(request: Request) {
  try {
    const user = await browserUser(request);
    await rateLimit(user.userId, "mfa-read", 30);
    const client = await authClient(), { data, error } = await client.auth.mfa.listFactors();
    if (error) throw new HttpError("Authenticator unavailable", 503);
    return json({ factors: data.totp.filter(f => f.status === "verified").map(f => ({ id: f.id, name: f.friendly_name || "Authenticator" })) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    requireMutationOrigin(request);
    const input = schema.parse(await limitedJson(request)), user = await browserUser(request);
    await rateLimit(user.userId, "mfa-write", 8, 600);
    const client = await authClient();
    if (input.action === "enroll") {
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) throw new HttpError("Authenticator unavailable", 503);
      if (factors.data.totp.some(f => f.status === "verified")) {
        // Adding another authenticator is privileged; never replace a lost factor.
        await requirePrivilegedSession(user.userId, request);
      }
      const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: `LQADWA ${new Date().toISOString().slice(0, 10)} ${crypto.randomUUID().slice(0,8)}` });
      if (error || !data) throw new HttpError("Unable to enroll. Use an existing factor or contact support.", 409);
      return json({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    }
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId: input.factorId, code: input.code });
    if (error) throw new HttpError("Invalid or expired authenticator code.", 401);
    await requirePrivilegedSession(user.userId, request);
    return json({ verified: true, redirect: "/operations" });
  } catch (error) { return failure(error); }
}
