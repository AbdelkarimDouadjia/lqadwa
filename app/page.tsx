import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAppUser } from "@/lib/auth";
import { ex } from "@/lib/experience-copy";
import { publicLanguage, publicUrl } from "@/lib/public-page";
import LqadwaApp from "@/components/lqadwa-app";
import { PublicLanding } from "@/components/public-landing";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ lang?: string; space?: string }> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams, store = await cookies();
  const language = publicLanguage(query.lang, publicLanguage(store.get("lqadwa-language")?.value));
  const privatePage = !!query.space || store.getAll().some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
  const languages = { "ar-DZ": publicUrl("ar"), "fr-DZ": publicUrl("fr"), en: publicUrl("en"), kab: publicUrl("kab"), "x-default": publicUrl("ar") };
  return {
    title: `${ex(language, "intro")} | LQADWA`, description: ex(language, "lead"),
    alternates: { canonical: publicUrl(language), languages },
    robots: privatePage ? { index: false, follow: false } : { index: true, follow: true },
  };
}
export default async function Page({ searchParams }: Props) {
  const query = await searchParams, store = await cookies();
  const hasSession = store.getAll().some(cookie => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name));
  // Avoid contacting Auth at all for the public landing; cookies are never authorization.
  if (query.space || (hasSession && await getAppUser())) return <LqadwaApp />;
  return <PublicLanding initialLanguage={publicLanguage(query.lang, publicLanguage(store.get("lqadwa-language")?.value))} initialDark={store.get("lqadwa-theme")?.value === "dark"} />;
}
