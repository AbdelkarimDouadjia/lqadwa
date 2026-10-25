import { env } from "cloudflare:workers";
import { HttpError } from "@/lib/access";
import { releasePolicy, requiresCore } from "@/lib/release-policy";

export function currentReleasePolicy() { return releasePolicy(env); }
export function requireCoreAction(action: string) {
  if (requiresCore(action) && currentReleasePolicy().mode !== "CORE") {
    throw new HttpError("الخدمة متاحة للمعلومات فقط حالياً. / Service disponible à titre informatif. / Information service only. / Talɣut kan.", 503, "INFORMATION_ONLY");
  }
}
