import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 sm:gap-3 ${light ? "text-white" : "text-[var(--ink)]"}`} aria-label="MindMap AI หน้าหลัก">
      <span className="relative grid size-11 place-items-center rounded-[15px] bg-[var(--signal)] shadow-[0_8px_18px_rgba(60,107,206,.25)]">
        <svg viewBox="0 0 44 44" fill="none" className="size-7" aria-hidden="true">
          <path d="M9 12.5h10.5M19.5 12.5v10M19.5 22.5h11M19.5 22.5v10M30.5 22.5V12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="9" cy="12.5" r="3" fill="#B8AFE4" stroke="white" strokeWidth="1.5" />
          <circle cx="30.5" cy="12.5" r="3" fill="#A7C9B0" stroke="white" strokeWidth="1.5" />
          <circle cx="19.5" cy="22.5" r="4" fill="white" />
          <circle cx="19.5" cy="32.5" r="3" fill="#E89C7C" stroke="white" strokeWidth="1.5" />
          <circle cx="30.5" cy="22.5" r="3.5" fill="#DCEBF3" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block whitespace-nowrap text-[16px] font-bold tracking-[-.04em] sm:text-[18px]" translate="no">MindMap AI</span>
        <span className={`hidden text-[10px] font-medium sm:block ${light ? "text-white/65" : "text-[var(--text-soft)]"}`}>เรียนรู้ผ่านการเชื่อมโยง</span>
      </span>
    </Link>
  );
}

export function PathwayArtwork({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-[26px] border border-[var(--line)] bg-[var(--paper)] ${compact ? "min-h-[190px]" : "min-h-[280px]"}`}>
      <div className="quiet-grid absolute inset-0 opacity-50" />
      <div className="absolute left-5 top-5 z-10 text-[11px] font-semibold text-[var(--text-soft)]">แผนภาพความรู้</div>
      <svg viewBox="0 0 480 250" className="absolute inset-0 h-full w-full" role="img" aria-label="ตัวอย่างเส้นทางเชื่อมโยงจากบทเรียนสู่แนวคิดและแบบทดสอบ">
        <defs>
          <filter id="node-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#193b59" floodOpacity=".10" /></filter>
        </defs>
        <path d="M65 150 C110 150 108 93 158 93 S215 164 259 164 S310 92 359 92 S407 131 437 131" fill="none" stroke="#b7cee5" strokeWidth="3" strokeLinecap="round" className="path-line" />
        <path d="M259 164 C296 164 294 205 336 205" fill="none" stroke="#d3c9ee" strokeWidth="2.5" strokeLinecap="round" />
        <g filter="url(#node-shadow)">
          <rect x="30" y="126" width="72" height="48" rx="15" fill="#e8f2f7" stroke="#d4e3eb" />
          <rect x="122" y="69" width="82" height="48" rx="15" fill="#fff" stroke="#dfe7e9" />
          <rect x="222" y="140" width="82" height="48" rx="15" fill="#3c6bce" />
          <rect x="325" y="68" width="76" height="48" rx="15" fill="#eef2fc" stroke="#dfe5f5" />
          <rect x="403" y="108" width="60" height="46" rx="14" fill="#eef7f0" stroke="#dbe9de" />
          <rect x="303" y="187" width="80" height="42" rx="14" fill="#f5f0fc" stroke="#e2daf2" />
        </g>
        <circle cx="66" cy="150" r="5" fill="#b8afe4" />
        <circle cx="163" cy="93" r="5" fill="#a7c9b0" />
        <circle cx="263" cy="164" r="5" fill="#fff" />
        <circle cx="362" cy="92" r="5" fill="#b8afe4" />
        <circle cx="433" cy="131" r="5" fill="#a7c9b0" />
        <circle cx="343" cy="208" r="4" fill="#c1b5e8" />
        <g fontFamily="Noto Sans Thai Variable, sans-serif" fontSize="10" fontWeight="600" textAnchor="middle">
          <text x="66" y="154" fill="#36526a">บทเรียน</text>
          <text x="163" y="97" fill="#36526a">แนวคิดหลัก</text>
          <text x="263" y="168" fill="white">ความเข้าใจ</text>
          <text x="363" y="97" fill="#36526a">ตัวอย่าง</text>
          <text x="433" y="136" fill="#36526a">แบบทดสอบ</text>
          <text x="343" y="212" fill="#63568d">ทบทวน</text>
        </g>
      </svg>
      <div className="absolute bottom-4 left-5 flex items-center gap-2 text-[11px] text-[var(--text-soft)]">
        <span className="size-2 rounded-full bg-[var(--leaf)]" />
        <span>ทุกบทเรียนมีเส้นทางต่อยอด</span>
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </div>
    </div>
  );
}
