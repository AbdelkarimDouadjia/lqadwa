import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "دوائي DZ | اعثر على دوائك بالقرب منك",
  description: "منصة جزائرية مجانية للبحث عن توفر الدواء وحجزه للاستلام من الصيدلية.",
  icons: { icon: "/brand/dawa-symbol.png", shortcut: "/brand/dawa-symbol.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body className="antialiased">{children}</body></html>;
}
