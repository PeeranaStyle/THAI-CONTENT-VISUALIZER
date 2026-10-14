"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpenText, Check, FileUp, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";

type Tab = "text" | "pdf";

export function MaterialForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setPending(true);
    try {
      let response: Response;
      if (tab === "text") {
        response = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, text }) });
      } else {
        if (!file) { setMessage("เลือกไฟล์ PDF ที่ต้องการเพิ่มก่อน"); setPending(false); return; }
        const formData = new FormData(); formData.set("title", title); formData.set("file", file);
        response = await fetch("/api/materials/upload", { method: "POST", body: formData });
      }
      const result = await response.json();
      if (!response.ok) { setMessage(result?.error?.message ?? "บันทึกบทเรียนไม่สำเร็จ"); return; }
      router.push(`/materials/${result.material.id}`); router.refresh();
    } catch { setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  return <div className="mx-auto max-w-[900px]">
    <Link href="/materials" className="mb-5 inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-soft)] transition hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />กลับไปยังบทเรียน</Link>
    <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
      <form onSubmit={save} className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] sm:p-7">
        <p className="eyebrow">ADD A LEARNING SOURCE</p><h2 className="mt-1 text-xl font-semibold tracking-[-.035em] text-[var(--ink)]">เพิ่มบทเรียนใหม่</h2><p className="mt-1 text-[12px] text-[var(--text-soft)]">เนื้อหานี้จะเป็นต้นทางสำหรับแบบทดสอบและแผนภาพความรู้</p>
        <div className="mt-6 grid grid-cols-2 rounded-[14px] bg-[var(--surface-muted)] p-1" role="tablist" aria-label="วิธีเพิ่มบทเรียน">
          <button type="button" role="tab" aria-selected={tab === "text"} onClick={() => setTab("text")} className={`flex min-h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-semibold transition ${tab === "text" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--text-soft)]"}`}><BookOpenText className="size-4" />วางข้อความ</button>
          <button type="button" role="tab" aria-selected={tab === "pdf"} onClick={() => setTab("pdf")} className={`flex min-h-10 items-center justify-center gap-2 rounded-[11px] text-[12px] font-semibold transition ${tab === "pdf" ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--text-soft)]"}`}><FileUp className="size-4" />อัปโหลด PDF</button>
        </div>
        <label className="mt-5 block space-y-1.5"><span className="text-[12px] font-semibold text-[var(--ink)]">ชื่อบทเรียน</span><input className="form-input" value={title} onChange={event => setTitle(event.target.value)} maxLength={140} required minLength={2} placeholder="เช่น ระบบนิเวศและความหลากหลายทางชีวภาพ" /></label>
        {tab === "text" ? <label className="mt-4 block space-y-1.5"><span className="flex items-center justify-between text-[12px] font-semibold text-[var(--ink)]"><span>เนื้อหาบทเรียน</span><span className="font-normal text-[var(--text-soft)]">{text.length.toLocaleString("th-TH")} / 150,000</span></span><textarea className="form-input min-h-[250px] resize-y leading-[1.85]" value={text} onChange={event => setText(event.target.value.slice(0, 150_000))} maxLength={150_000} required minLength={40} placeholder="วางเนื้อหาบทเรียนภาษาไทยที่นี่…\n\nยิ่งมีคำอธิบายและตัวอย่างมาก แบบทดสอบก็ยิ่งเชื่อมโยงกับบทเรียนได้ดี" /></label> : <div className="mt-4">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={event => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected && !title) setTitle(selected.name.replace(/\.pdf$/i, "")); }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="flex min-h-[210px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#aac4d4] bg-[var(--mist)]/55 px-5 text-center transition hover:border-[var(--signal)] hover:bg-[var(--mist)]"><span className="grid size-12 place-items-center rounded-[16px] bg-[var(--surface)] text-[var(--signal)] shadow-sm"><UploadCloud className="size-5" /></span><span className="mt-3 text-sm font-semibold text-[var(--ink)]">{file ? file.name : "เลือกไฟล์ PDF ของคุณ"}</span><span className="mt-1 text-[11px] text-[var(--text-soft)]">PDF ไม่เกิน 25 MB · ระบบจะเก็บไฟล์ในพื้นที่ส่วนตัว</span>{file && <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]"><Check className="size-3.5" />{(file.size / 1024 / 1024).toFixed(1)} MB</span>}</button>
          <p className="mt-2 text-[10px] leading-5 text-[var(--text-soft)]">ไฟล์สแกนที่ไม่มีข้อความฝังอยู่ยังไม่รองรับ OCR คุณสามารถคัดลอกข้อความแล้วเพิ่มในแท็บวางข้อความได้</p>
        </div>}
        {message && <p role="alert" className="mt-4 rounded-xl border border-[#f0d2cc] bg-[#fff5f2] px-4 py-3 text-[12px] leading-6 text-[#98483d]">{message}</p>}
        <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[var(--text-soft)]"><ShieldCheck className="size-3.5 text-[var(--success)]" />ข้อมูลนี้มองเห็นได้เฉพาะคุณ</span>
          <button type="submit" disabled={pending || (tab === "text" ? text.trim().length < 40 : !file)} className="primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[12px] font-semibold text-white transition hover:bg-[var(--signal-hover)] disabled:cursor-not-allowed disabled:opacity-50">{pending ? <><LoaderCircle className="size-4 animate-spin" />กำลังบันทึก…</> : <>บันทึกบทเรียน <ArrowRight className="size-3.5" /></>}</button>
        </div>
      </form>
      <aside className="h-fit rounded-[22px] border border-[var(--line)] bg-[#edf4f5] p-5">
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-white text-[var(--signal)]"><BookOpenText className="size-4" /></span><h3 className="text-[12px] font-semibold text-[var(--ink)]">ต่อยอดจากบทเรียนนี้</h3></div>
        <ul className="mt-4 space-y-3 text-[11px] leading-[1.8] text-[var(--text-soft)]"><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--signal)]" />สร้างแบบทดสอบจากเนื้อหาของคุณ</li><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#8f80c0]" />มองเห็นแนวคิดที่เชื่อมโยงกัน</li><li className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#73917a]" />กลับมาทบทวนและดูพัฒนาการได้</li></ul>
        <p className="mt-5 rounded-xl bg-white/75 p-3 text-[10px] leading-[1.8] text-[var(--text-soft)]">เนื้อหาจะถูกส่งไปยัง IntelSphere ก็ต่อเมื่อคุณเริ่มสร้าง AI แบบทดสอบหรือแผนภาพความรู้</p>
      </aside>
    </div>
  </div>;
}
