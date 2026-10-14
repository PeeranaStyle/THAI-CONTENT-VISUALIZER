import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Learnloom — พื้นที่เรียนรู้ที่เชื่อมโยงทุกไอเดีย", template: "%s · Learnloom" },
  description: "พื้นที่เรียนรู้ภาษาไทย ที่เปลี่ยนเนื้อหาบทเรียนให้เป็นแผนภาพความรู้และแบบทดสอบที่เข้าใจจริง",
  applicationName: "Learnloom",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Learnloom" },
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#faf9f5" }, { media: "(prefers-color-scheme: dark)", color: "#101d29" }],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" suppressHydrationWarning><body>{children}</body></html>;
}
