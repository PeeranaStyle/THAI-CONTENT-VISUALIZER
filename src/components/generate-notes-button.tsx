"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, LoaderCircle } from "lucide-react";
import { GenerationProgressModal, type GenerationPhase } from "@/components/generation-progress-modal";

export function GenerateNotesButton({ materialId }: { materialId: string }) {
  const [phase, setPhase] = useState<GenerationPhase | null>(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pendingSave, setPendingSave] = useState<Record<string, unknown> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const router = useRouter();

  function cancel() {
    controllerRef.current?.abort(); controllerRef.current = null; runningRef.current = false;
    setPhase(null); setPendingSave(null); setSaveError(null);
  }

  async function save(payload: Record<string, unknown>, controller: AbortController) {
    setPhase("saving"); setSaveError(null);
    try {
      const response = await fetch("/api/ai/save-generated", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Could not save the study notes.");
      setPhase("completed"); window.setTimeout(() => router.push(`/notes/${result.note.id}`), 350);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setSaveError(cause instanceof Error ? cause.message : "Could not save the study notes."); setPhase("save_failed");
    }
  }

  async function generate() {
    if (runningRef.current) return;
    runningRef.current = true; setError(""); setPhase("generating");
    const controller = new AbortController(); controllerRef.current = controller;
    try {
      const response = await fetch("/api/ai/generate-notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ materialId }), signal: controller.signal });
      setPhase("receiving");
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "Could not generate the study notes.");
      if (!result.notes || !result.model) throw new Error("AI returned an invalid notes response.");
      const payload: Record<string, unknown> = {
        operation: "notes", saveRequestId: crypto.randomUUID(), materialId, notes: result.notes,
        model: result.model, inputTokens: result.inputTokens ?? null, outputTokens: result.outputTokens ?? null,
      };
      setPendingSave(payload);
      await save(payload, controller);
    } catch (cause) {
      if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Could not generate the study notes."); setPhase(null); }
    } finally {
      if (controllerRef.current === controller && !controller.signal.aborted) runningRef.current = false;
    }
  }

  async function retrySave() {
    if (!pendingSave || runningRef.current) return;
    runningRef.current = true;
    const controller = new AbortController(); controllerRef.current = controller;
    await save(pendingSave, controller);
    if (!controller.signal.aborted) runningRef.current = false;
  }

  return <>
    <GenerationProgressModal phase={phase} errorMessage={saveError} onCancel={cancel} onRetrySave={retrySave} />
    <div><button type="button" disabled={phase !== null} onClick={generate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-3 text-xs font-semibold disabled:opacity-60">{phase ? <LoaderCircle className="size-4 animate-spin"/> : <FileText className="size-4"/>}{phase ? "กำลังสรุป…" : "สร้างสรุปบทเรียน"}</button>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>
  </>;
}
