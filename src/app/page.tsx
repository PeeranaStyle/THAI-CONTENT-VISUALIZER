import Link from "next/link";
import { ArrowRight, BookOpenText, BrainCircuit, Check, CircleHelp, Network, Sparkles, Target } from "lucide-react";
import { Brand, PathwayArtwork } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const workflow = [
  { title: "เพิ่มบทเรียน", body: "วางข้อความหรืออัปโหลดไฟล์ PDF, TXT และ DOCX", icon: BookOpenText },
  { title: "เห็นภาพรวมความรู้", body: "ให้ AI เชื่อมโยงแนวคิดสำคัญเป็นแผนภาพ", icon: Network },
  { title: "ฝึกด้วยคำถาม", body: "สร้างแบบทดสอบจากเนื้อหาที่คุณกำลังเรียน", icon: CircleHelp },
  { title: "ทบทวนจุดที่ยังไม่แม่น", body: "ดูผลรายหัวข้อแล้วเลือกสิ่งที่ควรฝึกต่อ", icon: Target },
];

const features = [
  { title: "แบบทดสอบจากบทเรียน", body: "ฝึกด้วยคำถามที่อ้างอิงเนื้อหาของคุณ พร้อมคำอธิบายคำตอบ", icon: BrainCircuit, tone: "blue" },
  { title: "แผนภาพที่สำรวจได้", body: "เปิดดูความสัมพันธ์ของแนวคิด แล้วเลือกหัวข้อเพื่ออ่านรายละเอียด", icon: Network, tone: "violet" },
  { title: "ติดตามความเข้าใจ", body: "เห็นความแม่นยำและหัวข้อที่ควรกลับไปทบทวน", icon: Target, tone: "green" },
  { title: "ทบทวนต่อได้ทันที", body: "ใช้ผลการฝึกวางแผนเรียนครั้งถัดไปอย่างมีเป้าหมาย", icon: Sparkles, tone: "gold" },
];

export default async function HomePage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <main className="app-canvas min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Brand />
        <nav aria-label="เมนูหลัก" className="hidden items-center gap-7 text-sm font-medium text-[var(--text-soft)] md:flex">
          <a href="#how-it-works" className="hover:text-[var(--ink)]">วิธีใช้งาน</a>
          <a href="#features" className="hover:text-[var(--ink)]">ความสามารถ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="hidden min-h-10 items-center rounded-xl px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--mist)] sm:inline-flex">เข้าสู่ระบบ</Link>
          <Link href="/register" className="primary-action inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--signal)] px-3 text-xs font-semibold transition hover:bg-[var(--signal-hover)] sm:px-4 sm:text-sm">เริ่มเรียนรู้ <ArrowRight className="size-4" /></Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1240px] items-center gap-9 px-5 pb-16 pt-7 sm:px-8 sm:pb-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-14 lg:px-10 lg:pb-24 lg:pt-12">
        <div className="max-w-[540px]">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-soft)]"><span className="size-2 rounded-full bg-[var(--leaf)]" /> พื้นที่เรียนรู้ภาษาไทยที่คิดไปกับคุณ</p>
          <h1 className="text-[clamp(2rem,4.5vw,3.7rem)] font-semibold leading-[1.3] tracking-[-.045em] text-[var(--ink)]">เข้าใจบทเรียน<br className="hidden sm:block" />ด้วยการมองเห็น<br className="hidden sm:block" />ความเชื่อมโยง</h1>
          <p className="mt-5 max-w-[460px] text-[15px] leading-8 text-[var(--text-soft)]">เปลี่ยนเนื้อหาที่คุณเรียนให้เป็นแผนภาพความรู้และแบบทดสอบ แล้วใช้ผลการฝึกเลือกหัวข้อที่ควรทบทวนต่อ</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="primary-action inline-flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-[var(--signal)] px-5 text-sm font-semibold shadow-sm transition hover:bg-[var(--signal-hover)]">เริ่มเรียนรู้ <ArrowRight className="size-4" /></Link>
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]">เข้าสู่ระบบ</Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-[var(--text-soft)]"><Check className="size-4 text-[var(--success)]" /> เนื้อหาของคุณเป็นส่วนตัวและจัดเก็บแยกตามบัญชี</p>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--ink)]"><BookOpenText className="size-4" /></span><div className="min-w-0"><p className="text-xs text-[var(--text-soft)]">ตัวอย่างพื้นที่เรียน</p><p className="truncate text-sm font-semibold text-[var(--ink)]">ระบบนิเวศและความสัมพันธ์</p></div></div>
              <span className="rounded-full bg-[#e8f1eb] px-3 py-1 text-xs font-semibold text-[#38674a] dark:bg-[#29483a] dark:text-[#b4d9c0]">แผนภาพความรู้</span>
            </div>
            <div className="p-3 sm:p-5"><PathwayArtwork /></div>
            <div className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)] sm:grid-cols-4">
              {["บทเรียน", "แนวคิดหลัก", "แบบทดสอบ", "ทบทวน"].map((label, i) => <div key={label} className="bg-[var(--surface)] px-3 py-3 text-center"><span className="block text-xs font-semibold text-[var(--ink)]">{label}</span><span className="mt-0.5 block text-[10px] text-[var(--text-soft)]">{["เพิ่มเนื้อหา", "เชื่อมโยง", "ฝึกทำ", "ดูผล"][i]}</span></div>)}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[var(--text-soft)]">ตัวอย่างการเชื่อมโยงบทเรียนสู่การฝึกทบทวน</p>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
          <div className="max-w-[580px]"><p className="text-xs font-bold text-[var(--signal)]">เริ่มจากสิ่งที่คุณกำลังเรียน</p><h2 className="mt-2 text-2xl font-semibold leading-snug tracking-[-.03em] text-[var(--ink)] sm:text-3xl">จากบทเรียน สู่ความเข้าใจที่นำไปใช้ได้</h2><p className="mt-3 text-sm leading-7 text-[var(--text-soft)]">ทำทีละขั้นในพื้นที่เดียว ตั้งแต่เก็บเนื้อหาจนถึงรู้ว่าควรฝึกอะไรต่อ</p></div>
          <ol className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {workflow.map((item, i) => { const Icon = item.icon; return <li key={item.title} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--chalk)] p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--mist)] text-[var(--signal)]"><Icon className="size-5" /></span><span><span className="block text-xs font-semibold text-[var(--ink)]"><span className="mr-1.5 text-[var(--signal)]">{i + 1}.</span>{item.title}</span><span className="mt-1 block text-xs leading-6 text-[var(--text-soft)]">{item.body}</span></span></li>; })}
          </ol>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8 sm:py-16 lg:px-10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold text-[var(--signal)]">เครื่องมือสำหรับการเรียน</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] text-[var(--ink)] sm:text-3xl">เรียน ทบทวน และเห็นพัฒนาการ</h2></div><p className="max-w-[390px] text-sm leading-7 text-[var(--text-soft)]">ทุกเครื่องมือใช้ข้อมูลจากบทเรียนที่คุณเพิ่ม เพื่อให้การฝึกสัมพันธ์กับสิ่งที่กำลังเรียน</p></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, body, icon: Icon, tone }) => <article key={title} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><span className={`grid size-10 place-items-center rounded-xl ${tone === "blue" ? "bg-[var(--mist)] text-[var(--signal)]" : tone === "violet" ? "bg-[var(--accent-violet-bg)] text-[var(--accent-violet)]" : tone === "green" ? "bg-[var(--accent-green-bg)] text-[var(--accent-green)]" : "bg-[var(--accent-gold-bg)] text-[var(--accent-gold)]"}`}><Icon className="size-5" /></span><h3 className="mt-4 text-sm font-semibold text-[var(--ink)]">{title}</h3><p className="mt-1.5 text-xs leading-6 text-[var(--text-soft)]">{body}</p></article>)}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--ink-deep)] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-col items-start justify-between gap-5 px-5 py-10 sm:flex-row sm:items-center sm:px-8 lg:px-10">
          <div><h2 className="text-xl font-semibold sm:text-2xl">เริ่มจากบทเรียนถัดไปของคุณ</h2><p className="mt-1 text-sm text-white/75">เพิ่มเนื้อหา สร้างแผนภาพ แล้วฝึกทำแบบทดสอบได้ในที่เดียว</p></div>
          <Link href="/register" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[var(--ink-deep)] transition hover:bg-[#e8f0f5]">สร้างบัญชี <ArrowRight className="size-4" /></Link>
        </div>
      </section>
      <footer className="border-t border-[var(--line)] px-5 py-5 sm:px-8 lg:px-10"><div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-2 text-xs text-[var(--text-soft)] sm:flex-row"><span><span translate="no">MindMap AI</span> · เรียนรู้ให้เห็นภาพ</span><span>ออกแบบสำหรับผู้เรียนและผู้สอนภาษาไทย</span></div></footer>
    </main>
  );
}
