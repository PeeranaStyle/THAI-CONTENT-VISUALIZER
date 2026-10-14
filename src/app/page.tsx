import Link from "next/link";
import { ArrowRight, BookOpenText, ChevronRight, Compass, Network, Sparkles } from "lucide-react";
import { Brand, PathwayArtwork } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const steps = [
  { number: "A", title: "นำบทเรียนเข้ามา", body: "วางเนื้อหาภาษาไทยหรือเพิ่มไฟล์ PDF ไว้ในพื้นที่เรียนรู้ของคุณ", icon: BookOpenText, color: "#dcebf3" },
  { number: "B", title: "มองเห็นความเชื่อมโยง", body: "ค่อย ๆ เห็นว่าหัวข้อสำคัญต่อกันอย่างไรผ่านแผนภาพความรู้", icon: Network, color: "#ebe7f7" },
  { number: "C", title: "ลองทำความเข้าใจ", body: "ฝึกด้วยคำถามที่สร้างจากเนื้อหาจริง พร้อมคำอธิบายเพื่อทบทวน", icon: Sparkles, color: "#e4f0e7" },
];

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="app-canvas min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Brand />
        <nav aria-label="เมนูหลัก" className="hidden items-center gap-9 text-[13px] font-medium text-[var(--text-soft)] md:flex">
          <a href="#how-it-works" className="transition hover:text-[var(--ink)]">วิธีเรียนรู้</a>
          <a href="#workspace" className="transition hover:text-[var(--ink)]">พื้นที่เรียนรู้</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link href="/login" className="hidden rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] sm:inline-flex">เข้าสู่ระบบ</Link>
          <Link href="/register" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--ink-deep)]">เริ่มเรียนรู้ <ArrowRight className="size-3.5" /></Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-20 pt-8 sm:px-8 md:pb-28 md:pt-14 lg:grid-cols-[1.03fr_.97fr] lg:px-12">
        <div className="pointer-events-none absolute -right-32 top-10 size-[460px] rounded-full bg-[var(--mist)]/70 blur-[90px]" />
        <div className="relative z-10 max-w-[590px] fade-up">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)]/80 px-3.5 py-1.5 text-[11px] font-semibold text-[var(--text-soft)] shadow-sm">
            <span className="grid size-5 place-items-center rounded-full bg-[#eef3ff] text-[var(--signal)]"><Sparkles className="size-3" /></span>
            พื้นที่เรียนรู้ภาษาไทยที่เติบโตไปกับคุณ
          </p>
          <h1 className="text-[clamp(2.7rem,7vw,5.25rem)] font-semibold leading-[1.23] tracking-[-.065em] text-[var(--ink)]">
            เข้าใจบทเรียน<br /><span className="relative inline-block">ในแบบที่เป็นคุณ
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 340 14" fill="none" aria-hidden="true"><path d="M4 10C82 3 228 2 335 8" stroke="#A7C9B0" strokeWidth="6" strokeLinecap="round" opacity=".8" /></svg>
            </span>
          </h1>
          <p className="mt-7 max-w-[450px] text-[15px] leading-[1.95] text-[var(--text-soft)] sm:text-base">
            เปลี่ยนเนื้อหาเรียนให้กลายเป็นภาพความคิดที่เชื่อมโยงกัน แล้วฝึกทบทวนด้วยคำถามที่สร้างจากบทเรียนของคุณ
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/register" className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-[var(--signal)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(60,107,206,.2)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-hover)]">สร้างพื้นที่เรียนรู้ฟรี <ArrowRight className="size-4" /></Link>
            <Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-[14px] px-4 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)]">ฉันมีบัญชีแล้ว</Link>
          </div>
          <div className="mt-10 flex items-center gap-3 border-t border-[var(--line)] pt-5 text-[12px] text-[var(--text-soft)]">
            <span className="flex -space-x-2" aria-hidden="true"><i className="grid size-7 place-items-center rounded-full border-2 border-[var(--chalk)] bg-[#e2edf3] not-italic"><BookOpenText className="size-3.5 text-[var(--ink)]" /></i><i className="grid size-7 place-items-center rounded-full border-2 border-[var(--chalk)] bg-[#eee9f7] not-italic"><Network className="size-3.5 text-[#75659b]" /></i><i className="grid size-7 place-items-center rounded-full border-2 border-[var(--chalk)] bg-[#e5f0e7] not-italic"><Sparkles className="size-3.5 text-[#56795f]" /></i></span>
            <span>อ่าน · เชื่อมโยง · ทบทวน ในที่เดียว</span>
          </div>
        </div>
        <div id="workspace" className="relative z-10 fade-up [animation-delay:100ms]">
          <div className="absolute -left-5 top-12 z-10 hidden rounded-[18px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 shadow-[var(--shadow)] sm:block">
            <p className="text-[10px] font-medium text-[var(--text-soft)]">เส้นทางการเรียน</p>
            <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">บทเรียน → ความเข้าใจ</p>
          </div>
          <div className="rounded-[32px] border border-white/80 bg-[#f2f7f8] p-3 shadow-[0_30px_90px_rgba(25,59,89,.12)] sm:p-5">
            <div className="flex items-center justify-between px-2 pb-3 sm:px-3">
              <div><p className="text-[10px] font-semibold tracking-[.1em] text-[var(--text-soft)]">LEARNING SPACE</p><p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">ความรู้มีทางเดินของมัน</p></div>
              <div className="flex gap-1.5" aria-hidden="true"><span className="size-2 rounded-full bg-[#e6ad95]" /><span className="size-2 rounded-full bg-[#d8c579]" /><span className="size-2 rounded-full bg-[#a8c7ad]" /></div>
            </div>
            <PathwayArtwork />
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div className="flex items-center gap-3 rounded-[17px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#e8f2f7] text-[var(--ink)]"><BookOpenText className="size-4" /></span>
                <span><span className="block text-[10px] text-[var(--text-soft)]">แหล่งเรียนรู้</span><span className="block text-xs font-semibold text-[var(--ink)]">บทเรียนของคุณ</span></span>
              </div>
              <div className="flex items-center gap-3 rounded-[17px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#eef2fc] text-[var(--signal)]"><Compass className="size-4" /></span>
                <span><span className="block text-[10px] text-[var(--text-soft)]">ก้าวถัดไป</span><span className="block text-xs font-semibold text-[var(--ink)]">ลองทำความเข้าใจ</span></span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-7 -right-2 hidden rounded-[16px] border border-[var(--line)] bg-[var(--paper)] px-4 py-3 shadow-[var(--shadow)] sm:block">
            <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#e5f0e7] text-[#56795f]"><Sparkles className="size-3.5" /></span><span><span className="block text-[10px] text-[var(--text-soft)]">ทบทวนจากสิ่งที่เรียนจริง</span><span className="block text-xs font-semibold text-[var(--ink)]">แบบทดสอบเฉพาะคุณ</span></span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[var(--line)] bg-[var(--surface)]/80">
        <div className="mx-auto max-w-[1280px] px-5 py-16 sm:px-8 md:py-20 lg:px-12">
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="eyebrow">A THOUGHTFUL WAY TO LEARN</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-[var(--ink)] sm:text-[30px]">เริ่มจากเนื้อหา ไปถึงความเข้าใจ</h2></div>
            <p className="max-w-[330px] text-sm leading-7 text-[var(--text-soft)]">ค่อย ๆ เรียนทีละก้าว โดยให้ความสัมพันธ์ของแนวคิดช่วยพาคุณไปต่อ</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return <article key={step.number} className="relative flex min-h-[205px] flex-col rounded-[22px] border border-[var(--line)] bg-[var(--paper)] p-5 transition hover:-translate-y-1 hover:shadow-[var(--shadow)] sm:p-6">
                <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-[15px]" style={{ background: step.color }}><Icon className="size-[19px] text-[var(--ink)]" /></span><span className="text-[12px] font-semibold tracking-[.08em] text-[var(--text-soft)]">{step.number}</span></div>
                <h3 className="mt-6 text-base font-semibold text-[var(--ink)]">{step.title}</h3><p className="mt-1.5 max-w-[300px] text-[13px] leading-6 text-[var(--text-soft)]">{step.body}</p>
                {index < steps.length - 1 && <span className="absolute -right-3 top-10 z-10 hidden size-6 place-items-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-[var(--text-soft)] md:grid"><ChevronRight className="size-3.5" /></span>}
              </article>;
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center md:py-20 lg:px-12">
        <div><p className="eyebrow">YOUR NEXT GOOD QUESTION</p><h2 className="mt-2 max-w-[640px] text-2xl font-semibold leading-[1.5] tracking-[-.04em] text-[var(--ink)] sm:text-[32px]">เริ่มจากเรื่องที่คุณกำลังเรียน<br className="hidden sm:block" /> แล้วค่อยต่อยอดจากตรงนั้น</h2></div>
        <Link href="/register" className="group inline-flex min-h-12 items-center gap-3 rounded-[14px] bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--ink-deep)]">เริ่มต้นพื้นที่ของฉัน <span className="grid size-7 place-items-center rounded-full bg-white/10 transition group-hover:translate-x-1"><ArrowRight className="size-4" /></span></Link>
      </section>
      <footer className="border-t border-[var(--line)] px-5 py-6 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-2 text-[11px] text-[var(--text-soft)] sm:flex-row"><span>Learnloom · พื้นที่เรียนรู้ที่เชื่อมโยงทุกไอเดีย</span><span>สำหรับผู้เรียนและผู้สอน</span></div></footer>
      <a href="#how-it-works" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3">ข้ามไปดูวิธีเรียนรู้</a>
    </main>
  );
}
