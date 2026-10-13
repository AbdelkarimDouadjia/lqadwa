import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./luqya.css";
import "./design-refinement.css";

export const metadata: Metadata = {
  title: "لقى دوا · LQADWA | دواؤك أقرب إليك",
  description: "منصة جزائرية مجانية للبحث عن توفر الدواء وحجزه للاستلام من الصيدلية.",
  icons: { icon: "/brand/luqya.png", shortcut: "/brand/luqya.png", apple: "/brand/luqya.png" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "LQADWA", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className="antialiased">{children}</body></html>;
}
