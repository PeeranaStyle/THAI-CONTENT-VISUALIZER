"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpenText, CircleHelp, FileText, LoaderCircle, Network, Sparkles, Target } from "lucide-react";
import { quizNavigationHref } from "@/lib/ai/generation-contract";

type MaterialOption = { id: string; title: string; source_type: string; created_at: string };

export function QuizCreateForm({ materials, initialMaterialId, initialNodeId, initialCoverage }: { materials: MaterialOption[]; initialMaterialId?: string; initialNodeId?: string; initialCoverage?: string }) {
  const router = useRouter();
  const [materialId, setMaterialId] = useState(initialMaterialId ?? materials[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionType, setQuestionType] = useState("mixed");
  const [coverage, setCoverage] = useState(initialNodeId ? "selected_node" : initialCoverage === "weak_topics_only" ? "weak_topics_only" : "entire_material");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, title: title.trim() || undefined, questionCount, difficulty, questionType, coverage, graphNodeId: coverage === "selected_node" ? initialNodeId : undefined }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result?.error?.message ?? "สร้างแบบทดสอบไม่สำเร็จ"); return; }
      router.push(quizNavigationHref(result));
      router.refresh();
    } catch { setError("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  if (!materials.length) return <div className="rounded-[23px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-8"><div className="mx-auto max-w-[430px] text-center"><span className="mx-auto grid size-12 place-items-center rounded-[16px] bg-[var(--mist)] text-[var(--ink)]"><BookOpenText className="size-5" /></span><h2 className="mt-4 text-base font-semibold text-[var(--ink)]">เพิ่มบทเรียนก่อนสร้างแบบทดสอบ</h2><p className="mt-2 text-[12px] leading-6 text-[var(--text-soft)]">แบบทดสอบจะสร้างจากเนื้อหาที่คุณเลือก เพื่อให้ทุกคำถามมีที่มาและไม่เติมข้อมูลนอกบทเรียน</p><Link href="/materials/new" className="primary-action mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[11px] font-semibold text-white">เพิ่มบทเรียน <ArrowRight className="size-3.5" /></Link></div></div>;

  return <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[1fr_310px]">
    <div className="rounded-[23px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
      <p className="eyebrow">AI QUIZ GENERATOR</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-[var(--ink)]">ออกแบบการทบทวนของคุณ</h2><p className="mt-1 text-[12px] text-[var(--text-soft)]">คำถามสร้างจากแหล่งเรียนรู้ที่คุณเลือก และตรวจเทียบกับข้อความต้นทาง</p>
      <label className="mt-6 block space-y-1.5"><span className="text-[12px] font-semibold text-[var(--ink)]">บทเรียนต้นทาง</span><span className="relative block"><BookOpenText className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft)]" /><select value={materialId} onChange={event => setMaterialId(event.target.value)} required className="form-input appearance-none pl-10">{materials.map(material => <option key={material.id} value={material.id}>{material.title}{material.source_type === "pdf" ? " · PDF" : ""}</option>)}</select></span></label>
      <label className="mt-4 block space-y-1.5"><span className="text-[12px] font-semibold text-[var(--ink)]">ชื่อแบบทดสอบ <span className="font-normal text-[var(--text-soft)]">(ไม่บังคับ)</span></span><input className="form-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={140} placeholder="เช่น ทบทวนระบบนิเวศ" /></label>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--ink)]">จำนวนข้อ</span><select className="form-input" value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))}>{[5, 10, 15, 20].map(count => <option key={count} value={count}>{count} ข้อ</option>)}</select></label>
        <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--ink)]">ระดับความยาก</span><select className="form-input" value={difficulty} onChange={event => setDifficulty(event.target.value)}><option value="mixed">คละระดับ</option><option value="easy">พื้นฐาน</option><option value="medium">ปานกลาง</option><option value="hard">ท้าทาย</option></select></label>
        <label className="space-y-1.5"><span className="text-[11px] font-semibold text-[var(--ink)]">รูปแบบคำถาม</span><select className="form-input" value={questionType} onChange={event => setQuestionType(event.target.value)}><option value="mixed">คละรูปแบบ</option><option value="multiple_choice">ปรนัย 4 ตัวเลือก</option><option value="true_false">จริงหรือไม่จริง</option></select></label>
      </div>
      <fieldset className="mt-6"><legend className="text-[12px] font-semibold text-[var(--ink)]">ขอบเขตการทบทวน</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">
        <CoverageOption value="entire_material" current={coverage} change={setCoverage} title="ทั้งบทเรียน" body="ครอบคลุมเนื้อหาต้นทาง" icon={FileText} />
        <CoverageOption value="weak_topics_only" current={coverage} change={setCoverage} title="หัวข้อที่ควรทบทวน" body="ใช้ผลแบบทดสอบที่ผ่านมา" icon={Target} />
        <CoverageOption value="selected_node" current={coverage} change={setCoverage} title="แนวคิดที่เลือก" body={initialNodeId ? "สร้างจากแนวคิดในแผนภาพ" : "เริ่มจากแผนภาพความรู้"} icon={Network} disabled={!initialNodeId} />
      </div></fieldset>
      {error && <p role="alert" className="mt-5 rounded-xl border border-[#f0d2cc] bg-[#fff5f2] px-4 py-3 text-[12px] leading-6 text-[#98483d]">{error}</p>}
      <div className="mt-6 flex flex-col-reverse items-start justify-between gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center"><p className="max-w-[370px] text-[10px] leading-5 text-[var(--text-soft)]">การสร้างแบบทดสอบจะส่งเนื้อหาบทเรียนนี้ไปยัง KKU IntelSphere เพื่อวิเคราะห์และสร้างคำถาม</p><button type="submit" disabled={pending || !materialId} className="primary-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[11px] font-semibold text-white transition hover:bg-[var(--signal-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{pending ? <><LoaderCircle className="size-4 animate-spin" />กำลังวิเคราะห์บทเรียน…</> : <><Sparkles className="size-4" />สร้างแบบทดสอบ</>}</button></div>
    </div>
    <aside className="h-fit rounded-[22px] border border-[var(--line)] bg-[#eef4f6] p-5"><span className="grid size-9 place-items-center rounded-[13px] bg-white text-[var(--signal)]"><CircleHelp className="size-4" /></span><h3 className="mt-3 text-[12px] font-semibold text-[var(--ink)]">คำถามที่มีที่มา</h3><p className="mt-1 text-[10px] leading-5 text-[var(--text-soft)]">ระบบจะตรวจโครงสร้างคำตอบ ตรวจตัวเลือกซ้ำ และตรวจว่าข้อความอ้างอิงปรากฏอยู่ในบทเรียน</p><div className="mt-4 space-y-2.5 border-t border-[var(--line)] pt-4 text-[10px] text-[var(--text-soft)]"><p className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--signal)]" />คำตอบถูกเก็บฝั่งเซิร์ฟเวอร์</p><p className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#8b7ab7]" />เลือกโหมดฝึกหรือโหมดสอบก่อนเริ่ม</p><p className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#729276]" />ผลลัพธ์จะคำนวณจากคำตอบจริง</p></div></aside>
  </form>;
}

function CoverageOption({ value, current, change, title, body, icon: Icon, disabled = false }: { value: string; current: string; change: (value: string) => void; title: string; body: string; icon: typeof FileText; disabled?: boolean }) {
  const checked = current === value;
  return <label className={`flex min-h-[92px] cursor-pointer gap-2.5 rounded-[15px] border p-3 transition ${checked ? "border-[var(--signal)] bg-[#f2f5fd]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[#b7c8d5]"} ${disabled ? "cursor-not-allowed opacity-55" : ""}`}><input type="radio" name="coverage" value={value} checked={checked} onChange={() => change(value)} disabled={disabled} className="sr-only" /><span className="grid size-8 shrink-0 place-items-center rounded-[11px] bg-[var(--surface-muted)] text-[var(--signal)]"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-[10px] font-semibold text-[var(--ink)]">{title}</span><span className="mt-0.5 block text-[9px] leading-4 text-[var(--text-soft)]">{body}</span></span><span className={`ml-auto mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${checked ? "border-[var(--signal)]" : "border-[var(--line)]"}`}>{checked && <span className="size-2 rounded-full bg-[var(--signal)]" />}</span></label>;
}
