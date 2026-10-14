import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowUpRight, UserRoundPlus } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSupabaseConfig, env } from "@/lib/env";

export const metadata: Metadata = { title: "สร้างบัญชี" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const configured = hasSupabaseConfig() && Boolean(env.SESSION_SECRET);
  return <>
    <div className="mb-7"><span className="grid size-12 place-items-center rounded-[16px] bg-[#e5f0e7] text-[#496d52]"><UserRoundPlus className="size-5" /></span><p className="eyebrow mt-6">A NEW WAY TO LEARN</p><h1 className="mt-1 text-[30px] font-semibold tracking-[-.045em] text-[var(--ink)]">สร้างพื้นที่เรียนรู้ของคุณ</h1><p className="mt-2 text-[13px] leading-6 text-[var(--text-soft)]">บันทึกบทเรียน แบบทดสอบ และเส้นทางความคิดไว้ในที่เดียว</p></div>
    {!configured && <div className="mb-5 rounded-[16px] border border-[#eadbb6] bg-[#fff9e8] p-4 text-[12px] leading-6 text-[#745e27]"><p className="font-semibold">ระบบกำลังรอการเชื่อมต่อ</p><p>เพิ่ม Supabase URL, service role key และ SESSION_SECRET ใน <code className="rounded bg-black/5 px-1">.env.local</code> ก่อนเปิดรับบัญชี</p></div>}
    <AuthForm mode="register" configured={configured} />
    <div className="mt-5 flex items-start gap-2 rounded-[14px] bg-[var(--surface-muted)] px-4 py-3 text-[11px] leading-5 text-[var(--text-soft)]"><ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-[var(--signal)]" /><p>บัญชี MindMap AI ใช้ชื่อผู้ใช้และรหัสผ่านของคุณ ระบบจัดเก็บรหัสผ่านในรูปแบบที่ปลอดภัย</p></div>
  </>;
}
