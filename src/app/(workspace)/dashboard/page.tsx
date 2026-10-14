import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, ChartNoAxesColumnIncreasing, CircleHelp, Clock3, FileText, Flame, Network, Plus, Sparkles, Target } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard";
import { EmptyState } from "@/components/empty-state";
import { PathwayArtwork } from "@/components/brand";

export const metadata: Metadata = { title: "ภาพรวมการเรียนรู้" };

const activityNames: Record<string, string> = {
  account_created: "เริ่มต้นพื้นที่เรียนรู้",
  material_created: "เพิ่มบทเรียนใหม่",
  quiz_generated: "สร้างแบบทดสอบ",
  quiz_completed: "ทำแบบทดสอบเสร็จแล้ว",
  graph_generated: "สร้างแผนภาพความรู้",
  note_generated: "สร้างโน้ตสรุป",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const data = await getDashboardData(user.id);
  const latestActivity = data.activities.slice(0, 4);
  const formatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });
  return <div className="mx-auto max-w-[1400px]">
    <section className="relative overflow-hidden rounded-[24px] border border-[var(--mist-strong)] bg-[var(--mist)] px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
      <div className="relative z-10 grid items-center gap-6 lg:grid-cols-[1fr_320px]">
        <div><p className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</p><h2 className="mt-2 text-[clamp(1.55rem,3.8vw,2.45rem)] font-semibold leading-[1.4] tracking-[-.045em] text-[var(--ink)]">สวัสดี {user.displayName}<span className="text-[var(--signal)]">,</span><br />วันนี้อยากเรียนรู้อะไรต่อดี?</h2><p className="mt-2 max-w-[480px] text-[12px] leading-6 text-[var(--text-soft)]">เริ่มจากบทเรียนที่คุณสนใจ แล้วค่อย ๆ เชื่อมแนวคิดให้เห็นภาพของตัวเอง</p>
          <div className="mt-5 flex flex-wrap gap-2.5"><Link href="/materials/new" className="primary-action inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--signal-hover)]"><Plus className="size-4" />เพิ่มบทเรียน</Link><Link href="/quiz/create" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--signal)]"><CircleHelp className="size-4 text-[var(--signal)]" />สร้างแบบทดสอบ</Link><Link href="/graphs" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--signal)]"><Network className="size-4 text-[var(--signal)]" />เปิดแผนภาพ</Link></div>
        </div>
        <div className="hidden lg:block"><PathwayArtwork compact /></div>
      </div>
    </section>

    <section aria-label="ข้อมูลการเรียนรู้จริง" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric icon={BookOpenText} label="บทเรียนที่บันทึก" value={data.materialCount ? data.materialCount.toLocaleString("th-TH") : "—"} note={data.materialCount ? "บทเรียนในพื้นที่ของคุณ" : "เพิ่มบทเรียนแรกของคุณ"} tint="blue" href="/materials" />
      <Metric icon={CircleHelp} label="แบบทดสอบที่ทำเสร็จ" value={data.completedQuizCount ? data.completedQuizCount.toLocaleString("th-TH") : "—"} note={data.completedQuizCount ? "นับจากผลที่บันทึกไว้" : "ผลจะปรากฏหลังทำแบบทดสอบ"} tint="iris" href="/history" />
      <Metric icon={Target} label="ความแม่นยำรวม" value={data.averageAccuracy === null ? "—" : `${data.averageAccuracy.toLocaleString("th-TH")}%`} note={data.averageAccuracy === null ? "ยังไม่มีผลแบบทดสอบ" : "คำนวณจากคำตอบที่ตรวจแล้ว"} tint="leaf" href="/analytics" />
      <Metric icon={Flame} label="วันที่เรียนต่อเนื่อง" value={data.streak ? data.streak.toLocaleString("th-TH") : "—"} note={data.streak ? "วันที่มีกิจกรรมจริง" : "เริ่มบันทึกวันที่เรียนวันนี้"} tint="coral" href="/analytics" />
    </section>

    <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[13px] bg-[var(--mist)] text-[var(--ink)]"><BookOpenText className="size-4" /></span><div><h3 className="text-[13px] font-semibold text-[var(--ink)]">กลับไปยังบทเรียน</h3><p className="text-[10px] text-[var(--text-soft)]">แหล่งความรู้ที่คุณเพิ่มไว้</p></div></div><Link href="/materials" className="text-[10px] font-semibold text-[var(--signal)]">ดูทั้งหมด</Link></div>
        {data.materials.length ? <div className="mt-3 divide-y divide-[var(--line)]">{data.materials.map(material => <Link key={material.id} href={`/materials/${material.id}`} className="flex items-center gap-3 py-3 transition hover:px-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f0f4f5] text-[var(--ink)]"><BookOpenText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-[var(--ink)]">{material.title}</span><span className="block text-[10px] text-[var(--text-soft)]">{material.source_type === "pdf" ? "ไฟล์ PDF" : "ข้อความบทเรียน"}</span></span><span className="text-[10px] text-[var(--text-soft)]">{formatter.format(new Date(material.created_at))}</span><ArrowRight className="size-3.5 text-[var(--text-soft)]" /></Link>)}</div> : <EmptyState icon={BookOpenText} title="เริ่มจากบทเรียนแรก" body="วางเนื้อหาหรือเพิ่มไฟล์ PDF แล้วเราจะเก็บไว้ในพื้นที่เรียนรู้ของคุณ" href="/materials/new" action="เพิ่มบทเรียน" />}
      </section>

      <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[13px] bg-[#eeeafa] text-[#75659b]"><Network className="size-4" /></span><div><h3 className="text-[13px] font-semibold text-[var(--ink)]">แนวคิดที่ควรกลับมาดู</h3><p className="text-[10px] text-[var(--text-soft)]">อ้างอิงจากคำตอบในแบบทดสอบ</p></div></div>
        {data.mastery.length ? <div className="mt-4 space-y-3">{data.mastery.slice(0, 4).map((topic: { concept_key: string; mastery_score: number; correct_count: number; incorrect_count: number }, index: number) => <div key={topic.concept_key} className="flex items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-[11px] text-[10px] font-semibold ${index % 2 ? "bg-[#edf3fc] text-[var(--signal)]" : "bg-[#f4eef8] text-[#7d6a9a]"}`}>{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold text-[var(--ink)]">{topic.concept_key}</span><span className="text-[9px] text-[var(--text-soft)]">ตอบถูก {topic.correct_count} · ทบทวน {topic.incorrect_count}</span></span><span className="text-[11px] font-semibold text-[var(--ink)]">{Number(topic.mastery_score).toLocaleString("th-TH")}%</span></div>)}</div> : <EmptyState icon={Target} title="หัวข้อที่ควรทบทวนจะปรากฏที่นี่" body="เมื่อคุณทำแบบทดสอบ ระบบจะคำนวณจากคำตอบจริงเพื่อช่วยวางแผนการเรียนรู้" href="/quiz/create" action="เริ่มทำแบบทดสอบ" />}
      </section>
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[13px] bg-[#e8f2f7] text-[var(--ink)]"><Sparkles className="size-4" /></span><div><h3 className="text-[13px] font-semibold text-[var(--ink)]">กิจกรรมล่าสุด</h3><p className="text-[10px] text-[var(--text-soft)]">สิ่งที่เกิดขึ้นในพื้นที่ของคุณ</p></div></div>
        {latestActivity.length ? <div className="mt-4 space-y-3">{latestActivity.map(item => <div key={item.id} className="flex items-start gap-3"><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-muted)] text-[var(--signal)]"><Clock3 className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-[var(--ink)]">{activityNames[item.activity_type] ?? "กิจกรรมการเรียนรู้"}</p><p className="text-[9px] text-[var(--text-soft)]">{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</p></div></div>)}</div> : <EmptyState icon={Clock3} title="กิจกรรมจะบันทึกไว้ที่นี่" body="บทเรียน แบบทดสอบ และการทบทวนของคุณจะปรากฏตามลำดับเวลา" />}
      </section>
      <section className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[13px] bg-[#e7f0e8] text-[#52795a]"><ChartNoAxesColumnIncreasing className="size-4" /></span><div><h3 className="text-[13px] font-semibold text-[var(--ink)]">ฝึกต่อจากตรงนี้</h3><p className="text-[10px] text-[var(--text-soft)]">เลือกเส้นทางถัดไปของคุณ</p></div></div><Link href="/analytics" className="text-[10px] font-semibold text-[var(--signal)]">ดูพัฒนาการ</Link></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <NextStep icon={FileText} label="อ่านสรุป" value={`${data.noteCount} โน้ต`} href="/notes" />
          <NextStep icon={Network} label="เชื่อมแนวคิด" value={`${data.graphCount} แผนภาพ`} href="/graphs" />
          <NextStep icon={CircleHelp} label="ฝึกทำโจทย์" value={`${data.quizzes.length} แบบทดสอบใหม่`} href="/quiz/create" />
        </div>
      </section>
    </div>
  </div>;
}

function Metric({ icon: Icon, label, value, note, tint, href }: { icon: typeof BookOpenText; label: string; value: string; note: string; tint: string; href: string }) {
  const colors: Record<string, string> = { blue: "bg-[#e8f2f7] text-[var(--ink)]", iris: "bg-[#eeeafa] text-[#75659b]", leaf: "bg-[#e6f0e8] text-[#56795f]", coral: "bg-[#f8eee9] text-[#9c6249]" };
  return <Link href={href} className="rounded-[19px] border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow)]"><div className="flex items-center justify-between"><span className="text-[10px] font-medium text-[var(--text-soft)]">{label}</span><span className={`grid size-8 place-items-center rounded-xl ${colors[tint]}`}><Icon className="size-4" /></span></div><p className="mt-3 text-2xl font-semibold leading-none tracking-[-.04em] text-[var(--ink)]">{value}</p><p className="mt-2 truncate text-[9px] text-[var(--text-soft)]">{note}</p></Link>;
}

function NextStep({ icon: Icon, label, value, href }: { icon: typeof FileText; label: string; value: string; href: string }) {
  return <Link href={href} className="flex min-h-[82px] items-center gap-3 rounded-[16px] bg-[var(--surface-muted)] p-3 transition hover:bg-[var(--mist)]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--signal)]"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-[10px] text-[var(--text-soft)]">{label}</span><span className="block truncate text-[11px] font-semibold text-[var(--ink)]">{value}</span></span><ArrowRight className="ml-auto size-3.5 shrink-0 text-[var(--text-soft)]" /></Link>;
}
