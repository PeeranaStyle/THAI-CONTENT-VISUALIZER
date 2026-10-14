import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, FileText, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedMaterial } from "@/lib/materials";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MaterialDetailActions } from "@/components/material-detail-actions";

type Context = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "บทเรียน" };
  const material = await getOwnedMaterial(user.id, id);
  return { title: material?.title ?? "บทเรียน" };
}

export default async function MaterialDetailPage({ params }: Context) {
  const user = await getCurrentUser();
  const { id } = await params;
  if (!user) notFound();
  const material = await getOwnedMaterial(user.id, id);
  if (!material) notFound();
  const { data: file, error } = await getSupabaseAdmin().from("material_files").select("original_filename,file_size,mime_type").eq("material_id", id).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load the material file record.");
  const created = new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(material.created_at));
  return <div className="mx-auto max-w-[1200px]">
    <Link href="/materials" className="inline-flex items-center gap-2 text-[12px] font-medium text-[var(--text-soft)] transition hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />กลับไปยังบทเรียน</Link>
    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1fr_300px]">
      <article className="overflow-hidden rounded-[23px] border border-[var(--line)] bg-[var(--surface)]">
        <header className="border-b border-[var(--line)] bg-[var(--mist)]/55 px-5 py-6 sm:px-7">
          <div className="flex items-center gap-3"><span className={`grid size-11 place-items-center rounded-[15px] ${material.source_type === "pdf" ? "bg-[#f7ede8] text-[#9a6449]" : "bg-[var(--surface)] text-[var(--ink)]"}`}>{material.source_type === "pdf" ? <FileText className="size-5" /> : <BookOpenText className="size-5" />}</span><div><p className="eyebrow">LEARNING MATERIAL</p><p className="text-[10px] text-[var(--text-soft)]">{material.source_type === "pdf" ? "เอกสาร PDF" : "เนื้อหาข้อความ"} · เพิ่มเมื่อ {created}</p></div></div>
          <h2 className="mt-5 break-words text-[clamp(1.45rem,4vw,2.25rem)] font-semibold leading-[1.45] tracking-[-.04em] text-[var(--ink)]">{material.title}</h2>
          {material.description && <p className="mt-2 text-sm text-[var(--text-soft)]">{material.description}</p>}
        </header>
        {file && <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3 sm:px-7"><span className="grid size-8 place-items-center rounded-[11px] bg-[#f6eee8] text-[#9a6449]"><FileText className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-[var(--ink)]">{file.original_filename}</span><span className="text-[9px] text-[var(--text-soft)]">{(Number(file.file_size) / 1024 / 1024).toFixed(1)} MB · {file.mime_type}</span></span></div>}
        <div className="px-5 py-5 sm:px-7 sm:py-7"><div className="flex items-center gap-2"><Sparkles className="size-4 text-[var(--signal)]" /><h3 className="text-[12px] font-semibold text-[var(--ink)]">เนื้อหาที่อ่านได้</h3></div><p className="mt-3 whitespace-pre-wrap break-words text-[13px] leading-[1.95] text-[var(--text)]">{material.extracted_text || material.original_text}</p></div>
      </article>
      <aside className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">ทำอะไรต่อดี?</h3><p className="mt-1 text-[10px] leading-5 text-[var(--text-soft)]">ใช้บทเรียนนี้เป็นฐานสำหรับการทบทวนของคุณ</p>
        <div className="mt-4"><MaterialDetailActions id={id} title={material.title} pdf={Boolean(file)} /></div>
      </aside>
    </div>
  </div>;
}
