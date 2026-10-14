"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Download, LoaderCircle, Pencil, Save, Trash2, X } from "lucide-react";
import { GenerateGraphButton } from "@/components/generate-graph-button";
import { GenerateNotesButton } from "@/components/generate-notes-button";

export function MaterialDetailActions({ id, title, pdf }: { id: string; title: string; pdf: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/materials/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: value }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result?.error?.message ?? "แก้ไขชื่อบทเรียนไม่สำเร็จ"); return; }
      setEditing(false); router.refresh();
    } catch { setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  async function download() {
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/materials/${id}/download`);
      const result = await response.json();
      if (!response.ok || !result.url) { setMessage(result?.error?.message ?? "ดาวน์โหลดไฟล์ไม่สำเร็จ"); return; }
      window.location.assign(result.url);
    } catch { setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!window.confirm("ลบบทเรียนนี้พร้อมไฟล์ที่แนบไว้ใช่ไหม? แบบทดสอบและผลที่เกี่ยวข้องจะถูกลบด้วย")) return;
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) { setMessage(result?.error?.message ?? "ลบบทเรียนไม่สำเร็จ"); return; }
      router.replace("/materials"); router.refresh();
    } catch { setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองอีกครั้ง"); }
    finally { setPending(false); }
  }

  return <div className="flex flex-col gap-3">
    {editing ? <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">ชื่อบทเรียนใหม่</span><input className="form-input" value={value} maxLength={140} minLength={2} onChange={event => setValue(event.target.value)} /></label><button type="button" onClick={save} disabled={pending} className="primary-action grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--signal)] text-white disabled:opacity-50" aria-label="บันทึกชื่อ"><Save className="size-4" /></button><button type="button" onClick={() => { setEditing(false); setValue(title); }} className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--line)] text-[var(--text-soft)]" aria-label="ยกเลิก"><X className="size-4" /></button></div> : <button type="button" onClick={() => setEditing(true)} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"><Pencil className="size-3.5" />เปลี่ยนชื่อ</button>}
    {pdf && <button type="button" onClick={download} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-muted)]"><Download className="size-3.5" />ดาวน์โหลด PDF</button>}
    <Link href={`/quiz/create?materialId=${id}`} className="primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[11px] font-semibold text-white transition hover:bg-[var(--signal-hover)]">สร้างแบบทดสอบจากบทเรียนนี้ <ArrowRight className="size-3.5" /></Link>
    <GenerateGraphButton materialId={id} />
    <GenerateNotesButton materialId={id} />
    <button type="button" onClick={remove} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[11px] font-semibold text-[var(--danger)] transition hover:bg-[#fff2ef]"><Trash2 className="size-3.5" />ลบบทเรียน</button>
    {pending && <p role="status" className="inline-flex items-center gap-2 text-[10px] text-[var(--text-soft)]"><LoaderCircle className="size-3.5 animate-spin" />กำลังบันทึก…</p>}
    {message && <p role="alert" className="rounded-xl border border-[#f0d2cc] bg-[#fff5f2] p-3 text-[11px] leading-5 text-[#98483d]">{message}</p>}
  </div>;
}
