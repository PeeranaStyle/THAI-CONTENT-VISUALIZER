import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export function EmptyState({ icon: Icon, title, body, href, action }: { icon: LucideIcon; title: string; body: string; href?: string; action?: string }) {
  return <div className="flex min-h-[190px] flex-col items-center justify-center px-5 py-8 text-center">
    <span className="grid size-12 place-items-center rounded-[16px] bg-[var(--mist)] text-[var(--ink)]"><Icon className="size-5" /></span>
    <h3 className="mt-3 text-sm font-semibold text-[var(--ink)]">{title}</h3>
    <p className="mt-1 max-w-[340px] text-[12px] leading-6 text-[var(--text-soft)]">{body}</p>
    {href && <Link href={href} className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 text-[12px] font-semibold text-[var(--signal)] transition hover:bg-[var(--mist)]">{action ?? "เริ่มต้น"}<ArrowRight className="size-3.5" /></Link>}
  </div>;
}
