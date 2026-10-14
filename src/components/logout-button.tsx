"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return <button type="button" onClick={logout} className={compact ? "grid size-10 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white" : "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white"} aria-label="ออกจากระบบ"><LogOut className="size-4" />{!compact && "ออกจากระบบ"}</button>;
}
