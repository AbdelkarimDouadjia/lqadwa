import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { publicLanguage } from "@/lib/public-page";
import "./globals.css";
import "./luqya.css";
import "./design-refinement.css";
import "./editorial.css";

export const metadata: Metadata = {
  title: "لقى دوا · LQADWA | دواؤك أقرب إليك",
  description: "منصة جزائرية مجانية للبحث عن توفر الدواء وحجزه للاستلام من الصيدلية.",
  icons: { icon: "/brand/luqya.png", shortcut: "/brand/luqya.png", apple: "/brand/luqya.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LQADWA", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = await cookies(), language = publicLanguage((await headers()).get("x-lqadwa-locale"), publicLanguage(store.get("lqadwa-language")?.value));
  return <html lang={language} dir={language === "ar" ? "rtl" : "ltr"} data-theme={store.get("lqadwa-theme")?.value === "dark" ? "dark" : "light"}><body className="antialiased">{children}</body></html>;
}
