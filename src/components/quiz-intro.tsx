"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenText, CircleHelp, Clock3, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function QuizIntro({ quizId, title, description, questionCount, difficulty, quizType, activeAttempt, partial }: {
  quizId: string; title: string; description: string; questionCount: number; difficulty: string; quizType: string;
  activeAttempt: { id: string; mode: string } | null; partial: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const summaryItems: { icon: LucideIcon; value: string }[] = [
    { icon: CircleHelp, value: `${questionCount} ข้อ` },
    { icon: Sparkles, value: difficulty === "mixed" ? "คละระดับ" : difficulty === "easy" ? "พื้นฐาน" : difficulty === "medium" ? "ปานกลาง" : "ท้าทาย" },
    { icon: BookOpenText, value: quizType === "mixed" ? "คละรูปแบบ" : quizType === "true_false" ? "จริง/ไม่จริง" : "ปรนัย" },
  ];
  async function start(mode: "practice" | "exam") {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/quizzes/${quizId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result?.error?.message ?? "เริ่มทำแบบทดสอบไม่สำเร็จ"); return; }
      router.push(`/quiz/${quizId}/attempt/${result.attemptId}`);
    } catch { setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-[940px]">
    <Link href="/history" className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-soft)] transition hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />กลับไปยังประวัติการเรียน</Link>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_290px]">
      <section className="relative overflow-hidden rounded-[25px] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-14 size-48 rounded-full bg-[var(--mist)] blur-[50px]" />
        <div className="relative"><span className="grid size-12 place-items-center rounded-[16px] bg-[#e8f2f7] text-[var(--ink)]"><CircleHelp className="size-5" /></span><p className="eyebrow mt-5">YOUR QUIZ IS READY</p><h2 className="mt-1 text-[clamp(1.45rem,3vw,2rem)] font-semibold leading-[1.4] tracking-[-.04em] text-[var(--ink)]">{title}</h2><p className="mt-2 max-w-[500px] text-[12px] leading-6 text-[var(--text-soft)]">{description}</p>
          {partial && <p role="status" className="mt-4 rounded-xl border border-[#eadbb6] bg-[#fff9e8] px-4 py-3 text-[11px] leading-5 text-[#745e27]">เนื้อหาต้นทางรองรับจำนวนคำถามได้บางส่วน ระบบบันทึกเฉพาะคำถามที่ผ่านการตรวจสอบแล้ว</p>}
          <div className="mt-5 grid grid-cols-3 gap-2">{summaryItems.map(({ icon: Icon, value }) => <div key={value} className="rounded-[14px] bg-[var(--surface-muted)] p-3"><Icon className="size-4 text-[var(--signal)]" /><p className="mt-1 text-[10px] font-semibold text-[var(--ink)]">{value}</p></div>)}</div>
          {activeAttempt ? <div className="mt-6 rounded-[18px] border border-[#d6e7da] bg-[#f1f7f2] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-white text-[var(--success)]"><Clock3 className="size-4" /></span><div><p className="text-[12px] font-semibold text-[var(--ink)]">มีแบบทดสอบที่ยังทำไม่เสร็จ</p><p className="text-[10px] text-[var(--text-soft)]">กลับไปทำต่อในโหมด{activeAttempt.mode === "practice" ? "ฝึก" : "สอบ"}ได้ทุกเมื่อ</p></div></div><button type="button" onClick={() => router.push(`/quiz/${quizId}/attempt/${activeAttempt.id}`)} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--success)] px-4 text-[11px] font-semibold text-white">ทำต่อ <ArrowRight className="size-3.5" /></button></div> : <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={pending} onClick={() => start("practice")} className="flex min-h-[86px] items-center gap-3 rounded-[17px] border border-[var(--line)] p-4 text-left transition hover:border-[var(--signal)] hover:bg-[var(--mist)] disabled:opacity-60"><span className="grid size-10 place-items-center rounded-[13px] bg-[#e7f0e8] text-[#55785d]">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}</span><span><span className="block text-[12px] font-semibold text-[var(--ink)]">โหมดฝึก</span><span className="block text-[10px] leading-5 text-[var(--text-soft)]">ดูคำอธิบายได้ทันทีหลังตอบ</span></span></button><button type="button" disabled={pending} onClick={() => start("exam")} className="flex min-h-[86px] items-center gap-3 rounded-[17px] border border-[var(--line)] p-4 text-left transition hover:border-[var(--signal)] hover:bg-[var(--mist)] disabled:opacity-60"><span className="grid size-10 place-items-center rounded-[13px] bg-[#eeeafa] text-[#75659b]">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <CircleHelp className="size-4" />}</span><span><span className="block text-[12px] font-semibold text-[var(--ink)]">โหมดสอบ</span><span className="block text-[10px] leading-5 text-[var(--text-soft)]">ดูผลและเฉลยหลังส่งคำตอบ</span></span></button></div>}
          {message && <p role="alert" className="mt-4 rounded-xl border border-[#f0d2cc] bg-[#fff5f2] px-4 py-3 text-[11px] text-[#98483d]">{message}</p>}
        </div>
      </section>
      <aside className="h-fit rounded-[22px] border border-[var(--line)] bg-[#eff4f5] p-5"><p className="eyebrow">BEFORE YOU BEGIN</p><h3 className="mt-1 text-[13px] font-semibold text-[var(--ink)]">เตรียมพื้นที่ให้พร้อม</h3><ul className="mt-4 space-y-3 text-[10px] leading-[1.8] text-[var(--text-soft)]"><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--signal)]" />มี {questionCount} คำถามที่อ้างอิงจากบทเรียน</li><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#8b7ab7]" />คำตอบจะถูกบันทึกเพื่อกลับมาทำต่อ</li><li className="flex gap-2"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-[#729276]" />ผลลัพธ์จะคำนวณเมื่อคุณส่งแบบทดสอบ</li></ul></aside>
    </div>
  </div>;
}
