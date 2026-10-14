"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

export type GenerationPhase = "generating" | "receiving" | "saving" | "save_failed" | "completed";

export function GenerationProgressModal({
  phase, batch, totalBatches, errorMessage, onCancel, onRetrySave,
}: {
  phase: GenerationPhase | null;
  batch?: number;
  totalBatches?: number;
  errorMessage?: string | null;
  onCancel: () => void;
  onRetrySave?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const open = Boolean(phase);
  useEffect(() => {
    if (!open) { setElapsed(0); return; }
    const started = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus(), 0);
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", keepFocusInDialog, true);
    return () => { window.clearTimeout(focusTimer); window.removeEventListener("keydown", keepFocusInDialog, true); previousFocus?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [open]);
  if (!phase) return null;

  const label = phase === "generating" ? "กำลังสร้างด้วย AI"
    : phase === "receiving" ? "กำลังรับผลลัพธ์"
      : phase === "saving" ? "กำลังบันทึกลงฐานข้อมูล"
        : phase === "save_failed" ? "บันทึกไม่สำเร็จ"
          : "เสร็จสมบูรณ์";
  const busy = phase === "generating" || phase === "receiving" || phase === "saving";

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4" role="presentation">
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="generation-progress-title" className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-2xl">
      <div className="flex items-center gap-3">
        {busy && <LoaderCircle className="size-5 animate-spin text-[var(--signal)]" />}
        <h2 id="generation-progress-title" className="text-base font-semibold text-[var(--ink)]">{label}</h2>
      </div>
      {typeof batch === "number" && typeof totalBatches === "number" && <p className="mt-3 text-sm text-[var(--text-soft)]">ชุดคำถาม {batch} จาก {totalBatches}</p>}
      <p className="mt-2 text-sm text-[var(--text-soft)]">เวลาที่ใช้ {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</p>
      {errorMessage && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p>}
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950">กรุณาอย่าออกจากหน้านี้จนกว่าการสร้างและบันทึกข้อมูลจะเสร็จสมบูรณ์ หากออกจากหน้านี้ งานที่ยังไม่ได้บันทึกจะถูกยกเลิก</p>
      <p className="mt-3 text-xs leading-5 text-[var(--text-soft)]">การยกเลิกจะหยุดคำขอจากเบราว์เซอร์และลบผลที่ยังไม่ได้บันทึก แต่อาจไม่สามารถหยุดงานที่ส่งถึง AI หรือเซิร์ฟเวอร์ไปแล้วได้</p>
      {phase === "saving" && <p className="mt-2 text-xs leading-5 text-[var(--text-soft)]">หากยกเลิกระหว่างบันทึก เซิร์ฟเวอร์อาจบันทึกเสร็จก่อนรับคำสั่งยกเลิก</p>}
      <div className="mt-5 flex justify-end gap-2">
        {phase === "save_failed" && onRetrySave && <button type="button" onClick={onRetrySave} className="min-h-10 rounded-lg bg-[var(--signal)] px-4 text-sm font-semibold text-white">ลองบันทึกอีกครั้ง</button>}
        {phase !== "completed" && <button type="button" onClick={onCancel} className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-semibold text-[var(--ink)]">ยกเลิก</button>}
      </div>
    </section>
  </div>;
}
