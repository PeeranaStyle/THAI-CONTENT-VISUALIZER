import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MindMap AI — เรียนรู้ให้เห็นภาพ", template: "%s · MindMap AI" },
  description: "เปลี่ยนบทเรียนภาษาไทยให้เป็นแผนภาพความรู้ แบบทดสอบ และแนวทางทบทวนที่เหมาะกับคุณ",
  applicationName: "MindMap AI",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MindMap AI" },
  openGraph: {
    title: "MindMap AI — เรียนรู้ให้เห็นภาพ",
    description: "เชื่อมโยงบทเรียนเป็นแผนภาพความรู้ แล้วทบทวนด้วยแบบทดสอบที่สร้างจากเนื้อหาของคุณ",
    siteName: "MindMap AI",
    locale: "th_TH",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f7f8" }, { media: "(prefers-color-scheme: dark)", color: "#101d29" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" suppressHydrationWarning><body>{children}</body></html>;
}
