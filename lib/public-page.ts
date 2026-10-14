import type { Language } from "@/lib/i18n";

export const publicOrigin = "https://lqadwa.lqadwa-dz.workers.dev";
export function publicLanguage(value: unknown, fallback: Language = "ar"): Language {
  return value === "ar" || value === "fr" || value === "en" || value === "kab" ? value : fallback;
}
export function publicUrl(language: Language) {
  return publicOrigin + (language === "ar" ? "/" : `/?lang=${language}`);
}
