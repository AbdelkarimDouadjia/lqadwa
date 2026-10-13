import type { MetadataRoute } from "next";
import { publicUrl } from "@/lib/public-page";
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { "ar-DZ": publicUrl("ar"), "fr-DZ": publicUrl("fr"), en: publicUrl("en"), kab: publicUrl("kab") };
  return (["ar", "fr", "en", "kab"] as const).map(language => ({ url: publicUrl(language), alternates: { languages } }));
}
