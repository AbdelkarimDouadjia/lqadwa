import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/public-page";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/operations", "/login", "/logout", "/connect", "/account-data", "/*?space=*"] }, sitemap: publicOrigin + "/sitemap.xml" };
}
