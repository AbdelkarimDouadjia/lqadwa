import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getAppUser } from "@/lib/auth";
import { identity, isRootAdmin } from "@/lib/access";
import { publicLanguage } from "@/lib/public-page";
import { AdminLandingEditor } from "@/components/admin-landing-editor";
import { recentPrivilegedSession } from "@/lib/privileged-access";
import { contentPageKeys } from "@/lib/landing-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "LQADWA · Page editor", robots: { index: false, follow: false } };

export default async function LandingEditorPage({ searchParams }: { searchParams: Promise<{ lang?: string; page?: string }> }) {
  if (!await getAppUser()) redirect("/operations/login");
  try { if (!isRootAdmin((await identity()).userId)) notFound(); } catch { notFound(); }
  if (!await recentPrivilegedSession((await identity()).userId)) redirect("/operations/security");
  const query = await searchParams;
  const page = contentPageKeys.find(page => page === query.page) ?? "home";
  const language = publicLanguage(query.lang, publicLanguage((await cookies()).get("lqadwa-language")?.value));
  return <><AdminLandingEditor key={page} page={page} language={language} /><Toaster position="bottom-center" toastOptions={{ style: { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" } }} /></>;
}
