"use client";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <section className="mx-auto max-w-lg rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-7 text-center"><h2 className="text-lg font-semibold">โหลดข้อมูลไม่สำเร็จ</h2><p className="mt-2 text-sm leading-6 text-[var(--text-soft)]">ลองตรวจการเชื่อมต่อแล้วโหลดหน้านี้อีกครั้ง</p><button onClick={() => reset()} className="primary-action mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-sm font-semibold text-white"><RefreshCw className="size-4"/>ลองอีกครั้ง</button></section>;
}
