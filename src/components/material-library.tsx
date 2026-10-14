"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpenText, FileText, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

type MaterialRow = { id: string; title: string; description: string; source_type: string; processing_status: string; created_at: string };

export function MaterialLibrary({ materials }: { materials: MaterialRow[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const visible = useMemo(() => materials.filter(material => {
    const matchesQuery = `${material.title} ${material.description}`.toLocaleLowerCase("th-TH").includes(query.toLocaleLowerCase("th-TH"));
    const matchesSource = source === "all" || material.source_type === source;
    return matchesQuery && matchesSource;
  }), [materials, query, source]);
  const formatter = useMemo(() => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }), []);

  return <>
    <div className="flex flex-col gap-3 sm:flex-row">
      <label className="relative min-w-0 flex-1"><span className="sr-only">ค้นหาบทเรียน</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-soft)]" /><input className="form-input pl-10" value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อบทเรียน…" /></label>
      <label><span className="sr-only">กรองตามประเภท</span><select className="form-input min-w-[165px]" value={source} onChange={event => setSource(event.target.value)}><option value="all">ทุกประเภท</option><option value="pasted_text">ข้อความที่วาง</option><option value="pdf">ไฟล์ PDF</option></select></label>
    </div>
    {visible.length ? <div className="mt-4 divide-y divide-[var(--line)] rounded-[20px] border border-[var(--line)] bg-[var(--surface)]">
      {visible.map(material => <Link key={material.id} href={`/materials/${material.id}`} className="group flex items-center gap-3.5 px-4 py-4 transition first:rounded-t-[20px] last:rounded-b-[20px] hover:bg-[var(--surface-muted)] sm:px-5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[14px] ${material.source_type === "pdf" ? "bg-[#f6eee8] text-[#9a6449]" : "bg-[var(--mist)] text-[var(--ink)]"}`}>{material.source_type === "pdf" ? <FileText className="size-[17px]" /> : <BookOpenText className="size-[17px]" />}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{material.title}</span><span className="mt-0.5 block truncate text-[10px] text-[var(--text-soft)]">{material.description || (material.source_type === "pdf" ? "เอกสาร PDF · เนื้อหาถูกจัดเก็บส่วนตัว" : "บทเรียนจากข้อความที่คุณเพิ่ม")}</span></span>
        <span className="hidden text-right sm:block"><span className="block text-[10px] text-[var(--text-soft)]">เพิ่มเมื่อ</span><span className="text-[11px] font-medium text-[var(--ink)]">{formatter.format(new Date(material.created_at))}</span></span>
        <ArrowUpRight className="size-4 shrink-0 text-[var(--text-soft)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--signal)]" />
      </Link>)}
    </div> : materials.length ? <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--surface)]"><EmptyState icon={Search} title="ไม่พบบทเรียนที่ตรงกัน" body="ลองเปลี่ยนคำค้นหาหรือประเภทเอกสาร" /></div> : <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--surface)]"><EmptyState icon={BookOpenText} title="พื้นที่นี้ยังว่างอยู่" body="เพิ่มเนื้อหาภาษาไทยหรือ PDF เพื่อเริ่มต่อยอดเป็นแบบทดสอบและแผนภาพความรู้" href="/materials/new" action="เพิ่มบทเรียนแรก" /></div>}
  </>;
}
