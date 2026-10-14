"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, BookOpenText, ChevronDown, CircleHelp, Clock3, FileText, GraduationCap, LayoutDashboard, Network, Settings2, UserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { CurrentUser } from "@/lib/auth/session";

const primaryNav = [
  { href: "/dashboard", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/materials", label: "บทเรียนของฉัน", icon: BookOpenText },
  { href: "/quiz/create", label: "สร้างแบบทดสอบ", icon: CircleHelp },
  { href: "/graphs", label: "แผนภาพความรู้", icon: Network },
  { href: "/notes", label: "โน้ตสรุป", icon: FileText },
];
const progressNav = [
  { href: "/analytics", label: "พัฒนาการ", icon: BarChart3 },
  { href: "/history", label: "ประวัติการเรียน", icon: Clock3 },
];
const mobileNav = [
  { href: "/dashboard", label: "หน้าหลัก", icon: LayoutDashboard },
  { href: "/materials", label: "บทเรียน", icon: BookOpenText },
  { href: "/quiz/create", label: "ฝึกทำ", icon: CircleHelp },
  { href: "/graphs", label: "แผนภาพ", icon: Network },
  { href: "/profile", label: "ฉัน", icon: UserRound },
];

const pathLabels: Record<string, string> = {
  "/dashboard": "พื้นที่เรียนรู้ของฉัน", "/materials": "บทเรียนของฉัน", "/materials/new": "เพิ่มบทเรียน",
  "/quiz/create": "สร้างแบบทดสอบ", "/graphs": "แผนภาพความรู้", "/notes": "โน้ตสรุป",
  "/analytics": "พัฒนาการของฉัน", "/history": "ประวัติการเรียน", "/profile": "บัญชีของฉัน", "/settings": "ตั้งค่าพื้นที่เรียนรู้",
};

export function WorkspaceShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const title = pathLabels[pathname] ?? (pathname.startsWith("/materials/") ? "รายละเอียดบทเรียน" : pathname.startsWith("/quiz/results/") ? "ผลการเรียนรู้" : pathname.startsWith("/quiz/") ? "แบบทดสอบ" : pathname.startsWith("/graphs/") ? "แผนภาพความรู้" : pathname.startsWith("/notes/") ? "โน้ตสรุป" : "พื้นที่เรียนรู้");
  const initials = user.displayName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toLocaleUpperCase("th-TH");

  return <div className="app-canvas min-h-screen">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-sidebar px-4 pb-4 pt-5 text-sidebar-foreground lg:flex">
      <div className="px-2"><Brand light /></div>
      <div className="mt-8 rounded-[17px] border border-white/10 bg-white/[.07] p-3.5">
        <p className="text-[10px] font-semibold tracking-[.12em] text-white/45">YOUR LEARNING SPACE</p>
        <div className="mt-2 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#a7c9b0]/20 text-[#c5e1ca]"><GraduationCap className="size-[17px]" /></span><span className="min-w-0"><span className="block truncate text-[13px] font-semibold">พื้นที่ส่วนตัว</span><span className="block text-[10px] text-white/50">เรียนในจังหวะของคุณ</span></span><ChevronDown className="ml-auto size-3.5 text-white/45" /></div>
      </div>
      <nav aria-label="เมนูพื้นที่เรียนรู้" className="sidebar-nav mt-7 min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.13em] text-white/40">เรียนรู้</p>
        <ul className="space-y-1">{primaryNav.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}</ul>
        <p className="mb-2 mt-7 px-3 text-[10px] font-semibold tracking-[.13em] text-white/40">ติดตามความก้าวหน้า</p>
        <ul className="space-y-1">{progressNav.map(item => <NavItem key={item.href} item={item} pathname={pathname} />)}</ul>
      </nav>
      <Link href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-primary ${pathname === "/settings" ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"}`}><Settings2 className="size-4" />ตั้งค่า</Link>
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-[12px] font-bold text-sidebar-accent-foreground">{initials || "M"}</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold">{user.displayName}</span><span className="block truncate text-[10px] text-white/45">@{user.username}</span></span>
        <LogoutButton compact />
      </div>
    </aside>

    <div className="min-h-screen lg:pl-[248px]">
      <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[var(--line)] bg-[var(--chalk)]/90 px-4 backdrop-blur-md sm:px-7 lg:px-10">
        <div><p className="text-[10px] font-medium text-[var(--text-soft)]"><span translate="no">MindMap AI</span> <span className="px-1 text-[var(--line)]">/</span></p><h1 className="text-[13px] font-semibold leading-5 text-[var(--ink)]">{title}</h1></div>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-[11px] text-[var(--text-soft)] sm:inline">ยินดีต้อนรับ, <strong className="font-semibold text-[var(--ink)]">{user.displayName}</strong></span>
          <ThemeToggle persist />
          <button type="button" onClick={() => setMenuOpen(value => !value)} aria-label="เปิดเมนูบัญชี" aria-expanded={menuOpen} className="grid size-10 place-items-center rounded-full bg-[var(--mist)] text-[12px] font-bold text-[var(--ink)] lg:hidden">{initials || "M"}</button>
        </div>
        {menuOpen && <div className="absolute right-4 top-[58px] z-40 min-w-48 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow)] lg:hidden"><Link href="/profile" className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-muted)]">บัญชีของฉัน</Link><Link href="/settings" className="block rounded-xl px-3 py-2 text-sm hover:bg-[var(--surface-muted)]">ตั้งค่า</Link><div className="my-1 border-t border-[var(--line)]" /><LogoutButton /></div>}
      </header>
      <main id="main-content" className="workspace-main mx-auto min-h-[calc(100vh-66px)] max-w-[1600px] px-4 pb-24 pt-6 sm:px-7 sm:pt-8 lg:px-10 lg:pb-12">
        {children}
      </main>
    </div>

    <nav aria-label="เมนูหลักบนมือถือ" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--surface)]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md lg:hidden">
      {mobileNav.map(item => { const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)); const Icon = item.icon; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-medium transition ${active ? "text-[var(--signal)]" : "text-[var(--text-soft)]"}`}><span className={`grid size-7 place-items-center rounded-lg ${active ? "bg-[var(--mist)]" : ""}`}><Icon className="size-[17px]" /></span>{item.label}</Link>; })}
    </nav>
  </div>;
}

function NavItem({ item, pathname }: { item: typeof primaryNav[number] | typeof progressNav[number]; pathname: string }) {
  const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/quiz/create" && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;
  return <li><Link href={item.href} aria-current={active ? "page" : undefined} className={`group flex min-h-10 items-center gap-3 rounded-xl border-l-2 px-3 text-[12px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-primary ${active ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"}`}><Icon aria-hidden="true" className={`size-[17px] ${active ? "text-sidebar-primary" : "text-sidebar-foreground/65 group-hover:text-sidebar-foreground"}`} />{item.label}</Link></li>;
}
