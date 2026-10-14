import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenText, Plus, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { listMaterials } from "@/lib/materials";
import { MaterialLibrary } from "@/components/material-library";

export const metadata: Metadata = { title: "บทเรียนของฉัน" };

export default async function MaterialsPage() {
  const user = await getCurrentUser();
  const materials = user ? await listMaterials(user.id) : [];
  return <div className="mx-auto max-w-[1120px]">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">YOUR LEARNING LIBRARY</p><h2 className="page-title mt-1">บทเรียนของฉัน</h2><p className="mt-1 text-[12px] text-[var(--text-soft)]">บทเรียนทุกเรื่องเริ่มต้นจากสิ่งที่คุณกำลังเรียน</p></div><Link href="/materials/new" className="primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[12px] font-semibold text-white transition hover:bg-[var(--signal-hover)]"><Plus className="size-4" />เพิ่มบทเรียน</Link></div>
    <section className="mt-6 rounded-[22px] border border-[var(--line)] bg-[var(--paper)] p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-[14px] bg-[#e8f2f7] text-[var(--ink)]"><BookOpenText className="size-[18px]" /></span><div><h3 className="text-sm font-semibold text-[var(--ink)]">แหล่งเรียนรู้</h3><p className="text-[10px] text-[var(--text-soft)]">{materials.length ? `${materials.length.toLocaleString("th-TH")} บทเรียนที่บันทึกไว้` : "บทเรียนที่เพิ่มจะอยู่ในพื้นที่ส่วนตัวนี้"}</p></div></div><Link href="/quiz/create" className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--signal)]">สร้างแบบทดสอบ <ArrowRight className="size-3.5" /></Link></div>
      <MaterialLibrary materials={materials} />
    </section>
    <div className="mt-4 flex items-start gap-3 rounded-[17px] bg-[#eff4f8] p-4 text-[11px] leading-6 text-[var(--text-soft)]"><Sparkles className="mt-1 size-4 shrink-0 text-[var(--signal)]" /><p>บทเรียนจะถูกเก็บไว้ในบัญชีของคุณเท่านั้น คุณเป็นคนเลือกว่าจะส่งเนื้อหาไปวิเคราะห์เพื่อสร้างแบบทดสอบหรือแผนภาพเมื่อใด</p></div>
  </div>;
}
