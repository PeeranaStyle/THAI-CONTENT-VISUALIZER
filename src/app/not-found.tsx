import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return <main className="app-canvas grid min-h-screen place-items-center px-5"><section className="max-w-md text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--mist)] text-[var(--signal)]"><Compass className="size-6" /></span><p className="eyebrow mt-6">THIS PATH ISN&apos;T ON THE MAP</p><h1 className="mt-2 text-2xl font-semibold text-[var(--ink)]">ยังไม่พบบทเรียนหน้านี้</h1><p className="mt-2 text-sm text-[var(--text-soft)]">ลิงก์อาจเปลี่ยนไปแล้ว ลองกลับไปยังพื้นที่เรียนรู้ของคุณ</p><Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-sm font-semibold text-white"><ArrowLeft className="size-4" />กลับพื้นที่เรียนรู้</Link></section></main>;
}
