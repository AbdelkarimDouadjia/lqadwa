import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PublicInfoSite } from "@/components/public-info-site";
import { publicInfoCopy, type PublicInfoPath } from "@/lib/public-information-copy";
import { publicLanguage, publicOrigin } from "@/lib/public-page";
import type { Language } from "@/lib/i18n";
import { publishedPageContent } from "@/lib/published-content";
import { ContentPage } from "@/components/content-page";

type RouteProps = { searchParams: Promise<{ lang?: string }> };
const localizedPath = (path: PublicInfoPath, language: Language) => `${publicOrigin}/${path}${language === "ar" ? "" : `?lang=${language}`}`;

export function createPublicInfoRoute(path: PublicInfoPath) {
  async function generateMetadata({ searchParams }: RouteProps): Promise<Metadata> {
    const query = await searchParams, store = await cookies();
    const language = publicLanguage(query.lang, publicLanguage(store.get("lqadwa-language")?.value));
    const content = await publishedPageContent(path), defaults = publicInfoCopy(language, path);
    const copy = { title: content.copy[language]?.titleA ?? defaults.title, summary: content.copy[language]?.lead ?? defaults.summary };
    const alternates = { "ar-DZ": localizedPath(path, "ar"), "fr-DZ": localizedPath(path, "fr"), en: localizedPath(path, "en"), kab: localizedPath(path, "kab"), "x-default": localizedPath(path, "ar") };
    return { title: `${copy.title} | LQADWA`, description: copy.summary, alternates: { canonical: localizedPath(path, language), languages: alternates }, robots: { index: true, follow: true } };
  }
  async function Page({ searchParams }: RouteProps) {
    const query = await searchParams, store = await cookies();
    const language = publicLanguage(query.lang, publicLanguage(store.get("lqadwa-language")?.value));
    const dark = store.get("lqadwa-theme")?.value === "dark";
    const content = await publishedPageContent(path);
    return <PublicInfoSite language={language} initialDark={dark}><ContentPage page={path} language={language} content={content} /></PublicInfoSite>;
  }
  return { generateMetadata, Page };
}
