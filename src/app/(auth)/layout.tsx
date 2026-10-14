import Link from "next/link";
import { ArrowLeft, BookOpenText, Sparkles } from "lucide-react";
import { Brand, PathwayArtwork } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="app-canvas min-h-screen px-4 py-5 sm:px-8 sm:py-8">
    <header className="mx-auto flex max-w-[1180px] items-center justify-between"><Brand /><ThemeToggle /></header>
    <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-[1180px] items-center gap-10 py-10 lg:grid-cols-[1fr_.88fr] lg:gap-16">
      <section className="mx-auto w-full max-w-[430px] py-4 lg:mx-0">
        <Link href="/" className="mb-9 inline-flex items-center gap-2 text-xs font-medium text-[var(--text-soft)] transition hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" /> กลับหน้าหลัก</Link>
        {children}
        <p className="mt-8 text-center text-[10px] leading-5 text-[var(--text-soft)]">การเรียนรู้เป็นของคุณ เนื้อหาและความก้าวหน้าจะถูกจัดเก็บไว้ในบัญชีของคุณอย่างเป็นส่วนตัว</p>
      </section>
      <aside className="relative hidden lg:block">
        <div className="absolute -left-16 -top-14 size-64 rounded-full bg-[#dcebf3]/70 blur-[85px]" />
        <div className="relative rounded-[32px] border border-white/80 bg-[#f1f6f6] p-5 shadow-[0_30px_90px_rgba(25,59,89,.08)]">
          <div className="mb-5 flex items-center justify-between px-2"><span className="text-[11px] font-semibold tracking-[.11em] text-[var(--text-soft)]">A PLACE TO MAKE SENSE</span><span className="grid size-8 place-items-center rounded-xl bg-white text-[var(--signal)]"><Sparkles className="size-4" /></span></div>
          <PathwayArtwork />
          <div className="mt-4 flex items-center gap-3 rounded-[20px] bg-[var(--ink)] px-5 py-4 text-white">
            <span className="grid size-10 place-items-center rounded-[14px] bg-white/10"><BookOpenText className="size-5" /></span>
            <div><p className="text-xs font-medium text-white/60">ทุกเรื่องที่เรียนมีความหมาย</p><p className="mt-0.5 text-sm font-semibold">เริ่มจากก้าวเล็ก ๆ ของคุณ</p></div>
            <div className="ml-auto flex -space-x-1.5" aria-hidden="true"><span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[#b8afe4]" /><span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[#a7c9b0]" /><span className="size-3 rounded-full border-2 border-[var(--ink)] bg-[#e89c7c]" /></div>
          </div>
        </div>
      </aside>
    </div>
  </main>;
}
