"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export function AuthForm({ mode, configured }: { mode: "login" | "register"; configured: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const isRegister = mode === "register";

  async function submit(formData: FormData) {
    setPending(true); setMessage(""); setSuccess(false);
    const password = String(formData.get("password") ?? "");
    const body: Record<string, string> = {
      username: String(formData.get("username") ?? "").trim(),
      password,
    };
    if (isRegister) {
      body.displayName = String(formData.get("displayName") ?? "").trim();
      const confirmation = String(formData.get("confirmPassword") ?? "");
      if (password !== confirmation) { setMessage("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); setPending(false); return; }
      if (password.length < 12) { setMessage("ตั้งรหัสผ่านอย่างน้อย 12 ตัวอักษร"); setPending(false); return; }
    }
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result?.error?.message ?? "ดำเนินการไม่สำเร็จ กรุณาลองอีกครั้ง"); return; }
      setSuccess(true);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบเครือข่ายแล้วลองอีกครั้ง");
    } finally { setPending(false); }
  }

  return (
    <form action={submit} className="space-y-4" aria-describedby={!configured ? "service-setup" : undefined}>
      {isRegister && <label className="block space-y-1.5"><span className="text-[13px] font-semibold text-[var(--ink)]">ชื่อที่อยากให้เราเรียก</span><input name="displayName" autoComplete="name" required maxLength={80} className="form-input" placeholder="เช่น มะลิ" /></label>}
      <label className="block space-y-1.5"><span className="text-[13px] font-semibold text-[var(--ink)]">ชื่อผู้ใช้</span><input name="username" autoComplete={isRegister ? "username" : "username"} required minLength={isRegister ? 3 : undefined} maxLength={32} pattern={isRegister ? "[A-Za-z0-9_.-]+" : undefined} className="form-input" placeholder="ชื่อผู้ใช้ของคุณ" /></label>
      <label className="block space-y-1.5"><span className="text-[13px] font-semibold text-[var(--ink)]">รหัสผ่าน</span><span className="relative block"><input name="password" type={showPassword ? "text" : "password"} autoComplete={isRegister ? "new-password" : "current-password"} required minLength={isRegister ? 12 : 1} maxLength={128} className="form-input pr-12" placeholder={isRegister ? "อย่างน้อย 12 ตัวอักษร" : "กรอกรหัสผ่าน"} /><button type="button" className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-soft)] hover:bg-[var(--surface-muted)]" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></span></label>
      {isRegister && <label className="block space-y-1.5"><span className="text-[13px] font-semibold text-[var(--ink)]">ยืนยันรหัสผ่าน</span><input name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={128} className="form-input" placeholder="พิมพ์รหัสผ่านอีกครั้ง" /></label>}
      {message && <p role="alert" className="rounded-xl border border-[#f0d2cc] bg-[#fff5f2] px-4 py-3 text-[13px] leading-6 text-[#98483d]">{message}</p>}
      {success && <p role="status" className="text-sm text-[var(--success)]">สำเร็จ กำลังพาคุณไปยังพื้นที่เรียนรู้…</p>}
      <button type="submit" disabled={pending || !configured} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--signal)] px-5 text-sm font-bold text-white shadow-[0_9px_18px_rgba(60,107,206,.18)] transition hover:bg-[var(--signal-hover)] disabled:cursor-not-allowed disabled:opacity-60">
        {pending && <LoaderCircle className="size-4 animate-spin" />}{pending ? "กำลังตรวจสอบ…" : isRegister ? "สร้างพื้นที่เรียนรู้" : "เข้าสู่พื้นที่ของฉัน"}
      </button>
      <p className="pt-1 text-center text-[13px] text-[var(--text-soft)]">
        {isRegister ? "มีบัญชีอยู่แล้ว? " : "เพิ่งมาเรียนรู้กับเรา? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-[var(--signal)] underline decoration-[var(--signal)]/30 underline-offset-4 hover:decoration-current">{isRegister ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}</Link>
      </p>
    </form>
  );
}
