// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type React from "react";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));

import { GenerateGraphButton } from "@/components/generate-graph-button";
import { GenerateNotesButton } from "@/components/generate-notes-button";
import { QuizCreateForm } from "@/components/quiz-create-form";
import { GenerationProgressModal } from "@/components/generation-progress-modal";

const materialId = "b86284d9-d1cc-4d8a-8a34-2cf13979e887";
const graphId = "712c5f5b-e381-41f3-9bba-146b524dd3ee";
const quizId = "1df63223-9d2b-4c0c-8919-9c460858c6aa";
const notesId = "d59f5293-944e-485d-9a42-191e10e28a64";
function apiResponse(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }); }
function question(index: number) {
  return { type: "multiple_choice", question: `Question ${index} about solar panel electricity conversion?`, options: [{ id: "a", text: `Correct option ${index}` }, { id: "b", text: `Different option ${index}` }, { id: "c", text: `Another option ${index}` }, { id: "d", text: `Last option ${index}` }], correctAnswer: "a", explanation: `This explanation describes why answer ${index} is correct.`, difficulty: "medium", conceptKeys: ["solar"], sourceReferences: [{ quote: "Solar panels convert sunlight into electricity." }] };
}
const materials = [{ id: materialId, title: "Energy", source_type: "pasted_text", created_at: "2026-01-01" }];

describe("generation and save workflow UI", () => {
  beforeEach(() => { cleanup(); router.push.mockReset(); router.refresh.mockReset(); vi.restoreAllMocks(); });
  afterEach(() => cleanup());

  it("generates a graph, saves it separately, then navigates to its saved id", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ graph: { title: "Energy", centralConceptKey: "energy", nodes: [], edges: [] }, model: "gemini-3.8-flash" })).mockResolvedValueOnce(apiResponse({ resourceId: graphId, title: "Energy", itemCount: 8, graph: { id: graphId, title: "Energy", nodeCount: 8, edgeCount: 9 } }, 201));
    render(<GenerateGraphButton materialId={materialId} />);
    fireEvent.click(screen.getByRole("button", { name: /สร้างแผนภาพ/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/graphs/${graphId}`));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toBe("/api/ai/generate-graph");
    expect(fetch.mock.calls[1][0]).toBe("/api/ai/save-generated");
  });

  it("generates Quiz sequentially in batches no larger than three, then saves the complete result", async () => {
    const fetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(apiResponse({ title: "Energy", description: "Review", graphNodeId: null, model: "gemini-3.8-flash", questions: [question(1), question(2), question(3)] }))
      .mockResolvedValueOnce(apiResponse({ title: "Energy", description: "Review", graphNodeId: null, model: "gemini-3.8-flash", questions: [question(4), question(5), question(6)] }))
      .mockResolvedValueOnce(apiResponse({ title: "Energy", description: "Review", graphNodeId: null, model: "gemini-3.8-flash", questions: [question(7), question(8), question(9)] }))
      .mockResolvedValueOnce(apiResponse({ title: "Energy", description: "Review", graphNodeId: null, model: "gemini-3.8-flash", questions: [question(10)] }))
      .mockResolvedValueOnce(apiResponse({ resourceId: quizId, title: "Energy", itemCount: 10, quiz: { id: quizId, title: "Energy", questionCount: 10 }, warning: null }, 201));
    render(<QuizCreateForm materials={materials} />);
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/quiz/${quizId}`));
    const generationCalls = fetch.mock.calls.slice(0, 4);
    expect(generationCalls).toHaveLength(4);
    expect(generationCalls.every(call => call[0] === "/api/ai/generate-quiz")).toBe(true);
    for (const [, init] of generationCalls) expect(JSON.parse(String(init?.body)).questionCount).toBeLessThanOrEqual(3);
    const saveBody = JSON.parse(String(fetch.mock.calls[4][1]?.body));
    expect(saveBody.questions).toHaveLength(10);
    expect(saveBody.requestedCount).toBe(10);
  });

  it("generates Study Notes and saves them before navigation", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ notes: { title: "Notes", summary: "Generated notes summary", keyPoints: [], keyTerms: [], sourceQuotes: [] }, model: "gemini-3.8-flash" })).mockResolvedValueOnce(apiResponse({ resourceId: notesId, note: { id: notesId, title: "Notes" } }, 201));
    render(<GenerateNotesButton materialId={materialId} />);
    fireEvent.click(screen.getByRole("button", { name: /สร้างสรุป/ }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/notes/${notesId}`));
    expect(fetch.mock.calls.map(call => call[0])).toEqual(["/api/ai/generate-notes", "/api/ai/save-generated"]);
  });

  it("aborts an active AI request when the user cancels", async () => {
    let requestSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => { requestSignal = init?.signal as AbortSignal; return new Promise(() => {}); });
    render(<GenerateGraphButton materialId={materialId} />);
    fireEvent.click(screen.getByRole("button", { name: /สร้างแผนภาพ/ }));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(requestSignal?.aborted).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("aborts between Quiz batches and does not call Save", async () => {
    let secondSignal: AbortSignal | undefined;
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ title: "Energy", description: "Review", model: "gemini-3.8-flash", questions: [question(1)] })).mockImplementationOnce((_input, init) => { secondSignal = init?.signal as AbortSignal; return new Promise(() => {}); });
    render(<QuizCreateForm materials={materials} />);
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
    expect(secondSignal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("warns before refresh and prevents Escape from closing the blocking modal", () => {
    render(<GenerationProgressModal phase="generating" onCancel={() => undefined} />);
    expect(screen.getByText("กรุณาอย่าออกจากหน้านี้จนกว่าการสร้างและบันทึกข้อมูลจะเสร็จสมบูรณ์ หากออกจากหน้านี้ งานที่ยังไม่ได้บันทึกจะถูกยกเลิก")).toBeInTheDocument();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps generated output and retries only Save after a persistence failure", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ graph: { title: "Energy", nodes: [], edges: [] }, model: "gemini-3.8-flash" })).mockResolvedValueOnce(apiResponse({ error: { message: "Database unavailable" } }, 503)).mockResolvedValueOnce(apiResponse({ resourceId: graphId, graph: { id: graphId, title: "Energy", nodeCount: 8, edgeCount: 9 } }, 201));
    render(<GenerateGraphButton materialId={materialId} />);
    fireEvent.click(screen.getByRole("button", { name: /สร้างแผนภาพ/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Database unavailable");
    const originalSave = JSON.parse(String(fetch.mock.calls[1][1]?.body));
    fireEvent.click(screen.getByRole("button", { name: "ลองบันทึกอีกครั้ง" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/graphs/${graphId}`));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][0]).toBe("/api/ai/save-generated");
    expect(JSON.parse(String(fetch.mock.calls[2][1]?.body)).saveRequestId).toBe(originalSave.saveRequestId);
  });

  it("does not save an invalid AI response or permit duplicate generation clicks", async () => {
    let resolveGeneration!: (response: Response) => void;
    const fetch = vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(resolve => { resolveGeneration = resolve; }));
    render(<GenerateNotesButton materialId={materialId} />);
    const button = screen.getByRole("button", { name: /สร้างสรุป/ });
    fireEvent.click(button); fireEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolveGeneration(apiResponse({ notes: null, model: "gemini-3.8-flash" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid notes response");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows provider timeout errors and does not attempt Save", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ error: { code: "AI_UPSTREAM_TIMEOUT", message: "IntelSphere timed out" } }, 504));
    render(<GenerateGraphButton materialId={materialId} />);
    fireEvent.click(screen.getByRole("button", { name: /สร้างแผนภาพ/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("IntelSphere timed out");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
