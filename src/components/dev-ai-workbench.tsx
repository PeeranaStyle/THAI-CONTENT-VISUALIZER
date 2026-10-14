"use client";

import { useState, type FormEvent } from "react";

type Operation = "quiz" | "graph";
type RunResponse = {
  success: boolean;
  operation: Operation;
  model?: string;
  result?: unknown;
  error?: { category: string; diagnostic: string };
  rawCalls: Array<{
    callNumber: number;
    model: string;
    httpStatus: number | null;
    durationMs: number;
    finishReason: string | null;
    usage: unknown;
    request: { temperature: unknown; maxTokens: unknown; messages: unknown };
    responseContent: unknown;
  }>;
  trace: Record<string, unknown>;
};

const defaultLesson = `พลังงานแสงอาทิตย์เป็นพลังงานหมุนเวียนที่ได้จากแสงของดวงอาทิตย์ เซลล์แสงอาทิตย์ในแผงรับพลังงานแสงและเปลี่ยนเป็นพลังงานไฟฟ้ากระแสตรง อินเวอร์เตอร์เปลี่ยนไฟฟ้ากระแสตรงให้เป็นไฟฟ้ากระแสสลับเพื่อให้อุปกรณ์ในบ้านใช้งานได้ แบตเตอรี่เก็บไฟฟ้าส่วนเกินที่ผลิตได้ในเวลากลางวันไว้ใช้ในเวลากลางคืน ปริมาณไฟฟ้าที่ผลิตขึ้นอยู่กับความเข้มของแสง ทิศทางของแผง และเงาที่บังแผง การทำความสะอาดแผงช่วยลดฝุ่นและรักษาประสิทธิภาพ โรงเรียนอาจติดตั้งแผงบนหลังคาเพื่อลดการใช้ไฟฟ้าจากเชื้อเพลิงฟอสซิล การประเมินระบบควรพิจารณาพลังงานที่ผลิตได้ ค่าใช้จ่ายติดตั้ง และการดูแลรักษาตลอดอายุการใช้งาน`;

function pretty(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2) ?? "(ไม่มีเนื้อหา)";
}

export function DevAiWorkbench() {
  const [operation, setOperation] = useState<Operation>("graph");
  const [title, setTitle] = useState("พลังงานแสงอาทิตย์");
  const [sourceText, setSourceText] = useState(defaultLesson);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState("mixed");
  const [questionType, setQuestionType] = useState("mixed");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<RunResponse | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResponse(null);
    setRequestError(null);
    try {
      const body = operation === "graph"
        ? { operation, title, sourceText }
        : { operation, title, sourceText, questionCount, difficulty, questionType };
      const result = await fetch("/api/dev/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await result.json();
      if (!payload || typeof payload !== "object" || !("rawCalls" in payload)) {
        setRequestError(payload?.error?.message ?? `Request failed (${result.status})`);
      } else {
        setResponse(payload as RunResponse);
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-[#172b3b] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#55738a]">Local development tool</p>
            <h1 className="mt-2 text-3xl font-bold">AI Pipeline Workbench</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#536776]">ส่งบทเรียนผ่าน prompt, model, validator และ recovery ชุดเดียวกับ production แสดง raw prompt และ raw response แยกตาม model call โดยไม่บันทึกลงฐานข้อมูล</p>
          </div>
          <span className="rounded-full border border-[#bdd4c9] bg-[#eaf5ef] px-3 py-1.5 text-xs font-semibold text-[#286548]">Disabled in production</span>
        </div>

        <form onSubmit={run} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="rounded-2xl border border-[#d9e1e7] bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">Operation
                <select value={operation} onChange={event => setOperation(event.target.value as Operation)} className="h-10 rounded-lg border border-[#ccd6de] bg-white px-3 font-normal">
                  <option value="graph">Knowledge Graph</option>
                  <option value="quiz">Quiz</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Lesson title
                <input value={title} onChange={event => setTitle(event.target.value)} maxLength={140} required className="h-10 rounded-lg border border-[#ccd6de] px-3 font-normal" />
              </label>
            </div>
            {operation === "quiz" && <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold">Question count
                <select value={questionCount} onChange={event => setQuestionCount(Number(event.target.value))} className="h-10 rounded-lg border border-[#ccd6de] bg-white px-3 font-normal">
                  {[5, 10, 15, 20].map(count => <option key={count} value={count}>{count}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Difficulty
                <select value={difficulty} onChange={event => setDifficulty(event.target.value)} className="h-10 rounded-lg border border-[#ccd6de] bg-white px-3 font-normal">
                  {["mixed", "easy", "medium", "hard"].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Question type
                <select value={questionType} onChange={event => setQuestionType(event.target.value)} className="h-10 rounded-lg border border-[#ccd6de] bg-white px-3 font-normal">
                  {["mixed", "multiple_choice", "true_false"].map(value => <option key={value}>{value}</option>)}
                </select>
              </label>
            </div>}
            <label className="mt-4 grid gap-1.5 text-sm font-semibold">Lesson text <span className="font-normal text-[#6c7d88]">{sourceText.length.toLocaleString()} / 120,000 characters</span>
              <textarea value={sourceText} onChange={event => setSourceText(event.target.value)} maxLength={120_000} required rows={16} className="resize-y rounded-lg border border-[#ccd6de] p-3 font-mono text-sm leading-6" />
            </label>
            <button disabled={busy} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#156b62] px-5 text-sm font-semibold text-white hover:bg-[#10564f] disabled:cursor-wait disabled:opacity-60">
              {busy ? "รอผลจากโมเดล…" : `Run ${operation === "graph" ? "Graph" : "Quiz"} pipeline`}
            </button>
            {requestError && <p role="alert" className="mt-3 rounded-lg bg-[#fff1ef] p-3 text-sm text-[#9c3028]">{requestError}</p>}
          </section>

          <section className="min-w-0 rounded-2xl border border-[#d9e1e7] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Run result</h2>
            {!response && !busy && <p className="mt-3 text-sm leading-6 text-[#6c7d88]">ผลตรวจสอบและ raw response จะแสดงที่นี่หลังเรียกโมเดล</p>}
            {busy && <p role="status" className="mt-3 text-sm text-[#536776]">กำลังเรียก IntelSphere ผ่าน client และ generation pipeline จริง…</p>}
            {response && <>
              <div className={`mt-3 rounded-lg p-3 text-sm ${response.success ? "bg-[#eaf5ef] text-[#286548]" : "bg-[#fff1ef] text-[#9c3028]"}`}>
                {response.success ? `Validated successfully · ${response.model}` : `Pipeline failed · ${response.error?.category}: ${response.error?.diagnostic}`}
              </div>
              <h3 className="mt-5 text-sm font-bold">Pipeline telemetry</h3>
              <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-[#172b3b] p-3 text-xs leading-5 text-[#dce8ee]">{pretty(response.trace)}</pre>
              {response.result !== undefined && <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold">Validated result</summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-[#172b3b] p-3 text-xs leading-5 text-[#dce8ee]">{pretty(response.result)}</pre>
              </details>}
              <h3 className="mt-5 text-sm font-bold">Actual model calls ({response.rawCalls.length})</h3>
              {response.rawCalls.length === 0 && <p className="mt-2 text-sm text-[#6c7d88]">No completion response received. Check timeout/upstream diagnostics above.</p>}
              <div className="mt-2 space-y-3">
                {response.rawCalls.map(call => <details key={call.callNumber} open={response.rawCalls.length === 1} className="rounded-lg border border-[#d9e1e7] p-3">
                  <summary className="cursor-pointer text-sm font-semibold">Call {call.callNumber} · HTTP {call.httpStatus ?? "none"} · {call.durationMs} ms · {call.finishReason ?? "no finish reason"}</summary>
                  <p className="mt-2 text-xs text-[#536776]">Model: {call.model} · Usage: {pretty(call.usage)}</p>
                  <h4 className="mt-3 text-xs font-bold uppercase tracking-wide">Exact request messages</h4>
                  <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-[#f2f5f7] p-3 text-xs leading-5">{pretty(call.request.messages)}</pre>
                  <h4 className="mt-3 text-xs font-bold uppercase tracking-wide">Raw AI response</h4>
                  <pre className="mt-1 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded bg-[#172b3b] p-3 text-xs leading-5 text-[#dce8ee]">{pretty(call.responseContent)}</pre>
                </details>)}
              </div>
            </>}
          </section>
        </form>
      </div>
    </main>
  );
}
