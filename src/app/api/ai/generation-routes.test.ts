import type OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "b86284d9-d1cc-4d8a-8a34-2cf13979e887", role: "student" as const },
  material: { id: "f82ea668-e7f5-4b25-8df2-8062e68d45bc", title: "Solar energy", extracted_text: "Solar panels convert sunlight into electricity. An inverter changes direct current into alternating current for appliances. A battery stores extra electricity for use at night. Solar power provides energy for buildings and schools. The lesson also explains how panels provide clean power to homes, classrooms, and communities. Solar energy is useful when sunlight reaches the panels, and stored electricity can support later use.", original_text: "" },
  completion: vi.fn(), dbWrites: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUserReadOnly: vi.fn(async () => state.user) }));
vi.mock("@/lib/auth/security", () => ({ isSameOrigin: vi.fn(() => true) }));
vi.mock("@/lib/env", () => ({ env: { INTELSPHERE_MODEL: "gemini-3.8-flash" }, hasIntelSphereConfig: () => true }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => {
  const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => ({ data: state.material, error: null })),
    insert: (...args: unknown[]) => state.dbWrites("insert", ...args), rpc: (...args: unknown[]) => state.dbWrites("rpc", ...args), update: (...args: unknown[]) => state.dbWrites("update", ...args) };
  return chain;
} }) }));
vi.mock("@/lib/ai/client", () => ({ createTracedCompletion: (trace: unknown, params: unknown, signal?: AbortSignal) => state.completion(trace, params, signal) }));

import { POST as generateGraph } from "@/app/api/ai/generate-graph/route";
import { POST as generateQuiz } from "@/app/api/ai/generate-quiz/route";
import { POST as generateNotes } from "@/app/api/ai/generate-notes/route";

const source = state.material.extracted_text;
const quizMarkdown = `## QUESTION 1\nType: multiple_choice\nDifficulty: medium\nConcepts: solar energy\n\n### Question\nWhich statement describes how solar panels create electricity?\n\n### Options\nA. They convert sunlight to electricity\nB. They store electricity in a battery\nC. They change alternating current\nD. They create sunlight at night\n\n### Answer\nA\n\n### Explanation\nSolar panels convert sunlight into electricity according to the lesson.\n\n### Source\n> Solar panels convert sunlight into electricity.`;
const graph = {
  title: "Solar energy", centralConceptKey: "solar", nodes: [
    { conceptKey: "solar", title: "Solar energy", description: "Solar panels convert sunlight into useful electrical power.", nodeType: "central", sourceReferences: [{ quote: "Solar panels convert sunlight into electricity." }] },
    { conceptKey: "inverter", title: "Inverter", description: "An inverter changes direct current into alternating current.", nodeType: "concept", sourceReferences: [{ quote: "An inverter changes direct current into alternating current" }] },
    { conceptKey: "battery", title: "Battery", description: "A battery stores extra electricity for use at night.", nodeType: "concept", sourceReferences: [{ quote: "A battery stores extra electricity for use at night." }] },
  ], edges: [{ sourceConceptKey: "solar", targetConceptKey: "inverter", relationship: "feeds" }, { sourceConceptKey: "solar", targetConceptKey: "battery", relationship: "charges" }],
};
const notes = { title: "Solar energy", summary: "Solar panels turn sunlight into electricity. Inverters adapt current for appliances, while batteries store extra power for later.", keyPoints: ["Solar panels convert sunlight into electricity", "An inverter changes direct current for appliances", "A battery stores extra electricity for night use"], keyTerms: [{ term: "Inverter", definition: "A device that changes direct current into alternating current." }], sourceQuotes: ["Solar panels convert sunlight into electricity.", "A battery stores extra electricity for use at night."] };
function completion(content: unknown) {
  return { id: "route-test", object: "chat.completion", created: 0, model: "gemini-3.8-flash", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) } }] } as unknown as OpenAI.Chat.Completions.ChatCompletion;
}
function request(path: string, body: unknown) { return new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify(body) }); }

describe("production generation routes do not persist", () => {
  beforeEach(() => {
    state.completion.mockReset(); state.dbWrites.mockReset();
    state.completion.mockImplementation((trace: { operation: string }) => completion(trace.operation === "graph" ? graph : trace.operation === "notes" ? notes : quizMarkdown));
  });

  it("returns a validated Graph response after one AI request and performs no writes", async () => {
    const response = await generateGraph(request("/api/ai/generate-graph", { materialId: state.material.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ graph: { centralConceptKey: "solar" }, model: "gemini-3.8-flash" });
    expect(state.completion).toHaveBeenCalledTimes(1);
    expect(state.dbWrites).not.toHaveBeenCalled();
  });

  it("returns a validated Quiz batch of at most three after one AI request and performs no writes", async () => {
    const response = await generateQuiz(request("/api/ai/generate-quiz", { materialId: state.material.id, questionCount: 1, difficulty: "mixed", questionType: "mixed" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ questions: [{ type: "multiple_choice" }], requestedCount: 1 });
    expect(state.completion).toHaveBeenCalledTimes(1);
    expect(state.dbWrites).not.toHaveBeenCalled();
  });

  it("returns validated Study Notes after one AI request and performs no writes", async () => {
    const response = await generateNotes(request("/api/ai/generate-notes", { materialId: state.material.id }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ notes: { title: "Solar energy" }, model: "gemini-3.8-flash" });
    expect(state.completion).toHaveBeenCalledTimes(1);
    expect(state.dbWrites).not.toHaveBeenCalled();
  });
});
