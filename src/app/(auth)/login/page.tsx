import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth/session";
import { hasSupabaseConfig, env } from "@/lib/env";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  const configured = hasSupabaseConfig() && Boolean(env.SESSION_SECRET);
  return <>
    <div className="mb-7"><span className="grid size-12 place-items-center rounded-[16px] bg-[#e8f2f7] text-[var(--ink)]"><LockKeyhole className="size-5" /></span><p className="eyebrow mt-6">WELCOME BACK</p><h1 className="mt-1 text-[30px] font-semibold tracking-[-.045em] text-[var(--ink)]">กลับมาเรียนรู้กันต่อ</h1><p className="mt-2 text-[13px] leading-6 text-[var(--text-soft)]">เข้าสู่ระบบเพื่อกลับไปยังบทเรียนและไอเดียที่คุณเชื่อมไว้</p></div>
    {!configured && <div id="service-setup" className="mb-5 rounded-[16px] border border-[#eadbb6] bg-[#fff9e8] p-4 text-[12px] leading-6 text-[#745e27]"><p className="font-semibold">ระบบกำลังรอการเชื่อมต่อ</p><p>เพิ่มค่า Supabase และ SESSION_SECRET ในไฟล์ <code className="rounded bg-black/5 px-1">.env.local</code> ก่อนเปิดใช้งานบัญชี</p></div>}
    <AuthForm mode="login" configured={configured} />
    <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[var(--text-soft)]"><ShieldCheck className="size-3.5 text-[var(--success)]" />รหัสผ่านถูกจัดเก็บด้วยการแฮชแบบ Argon2id</div>
    <p className="mt-7 text-center text-[10px] leading-5 text-[var(--text-soft)]">ยังไม่มีบัญชี? <Link href="/register" className="font-semibold text-[var(--signal)]">เริ่มเรียนรู้ได้เลย</Link></p>
  </>;
}
