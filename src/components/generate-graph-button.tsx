"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Network, LoaderCircle } from "lucide-react";

export function GenerateGraphButton({ materialId }: { materialId: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  async function generate() {
    setBusy(true); setError("");
    try { const response = await fetch("/api/ai/generate-graph", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ materialId }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "สร้างแผนภาพไม่สำเร็จ"); router.push(`/graphs/${body.data.graph.id}`); }
    catch (e) { setError(e instanceof Error ? e.message : "สร้างแผนภาพไม่สำเร็จ"); setBusy(false); }
  }
  return <div><button type="button" disabled={busy} onClick={generate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--ink)] disabled:opacity-60">{busy ? <LoaderCircle className="size-4 animate-spin"/> : <Network className="size-4"/>}{busy ? "กำลังสร้างแผนภาพ…" : "สร้างแผนภาพความรู้"}</button>{error && <p role="alert" className="mt-2 max-w-64 text-xs text-red-700">{error}</p>}</div>;
}
