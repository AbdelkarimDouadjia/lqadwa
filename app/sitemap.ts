import type { MetadataRoute } from "next";
import { publicInfoPages } from "@/lib/public-information-copy";
import { publicOrigin, publicUrl } from "@/lib/public-page";
export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["ar", "fr", "en", "kab"] as const;
  const paths = ["/", ...publicInfoPages.map(page => `/${page}`)];
  return paths.flatMap(path => {
    const languages = Object.fromEntries(locales.map(language => [
      language === "ar" ? "ar-DZ" : language === "fr" ? "fr-DZ" : language,
      path === "/" ? publicUrl(language) : `${publicOrigin}${path}${language === "ar" ? "" : `?lang=${language}`}`,
    ]));
    return locales.map(language => ({
      url: path === "/" ? publicUrl(language) : `${publicOrigin}${path}${language === "ar" ? "" : `?lang=${language}`}`,
      alternates: { languages: { ...languages, "x-default": path === "/" ? publicUrl("ar") : `${publicOrigin}${path}` } },
    }));
  });
}
