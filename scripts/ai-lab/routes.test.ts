import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

const root = resolve(process.cwd());

function loadLocalEnv() {
  const source = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    process.env[match[1]] = value;
  }
}

const ids = {
  user: "81e80d56-2602-4f64-95d4-c3d7cc6fac82",
  material: "b86284d9-d1cc-4d8a-8a34-2cf13979e887",
  graph: "712c5f5b-e381-41f3-9bba-146b524dd3ee",
  quiz: "1df63223-9d2b-4c0c-8919-9c460858c6aa",
  job: "e1421e5d-f342-4a18-a148-e1d14d076a6a",
};

const lesson = `Solar energy is renewable energy from sunlight. Solar panels contain photovoltaic cells that convert light into electricity. The inverter changes direct current into alternating current for household use. A battery stores extra electricity for use at night or during cloudy weather. The amount of energy produced depends on sunlight, panel direction, and shade. Regular cleaning helps panels work efficiently. Schools can use solar power to reduce electricity from fossil fuels and learn about sustainable energy.`;

function createMemorySupabase() {
  const state = { jobs: [] as Array<Record<string, unknown>>, persistedGraph: null as Record<string, unknown> | null, persistedQuiz: null as unknown };
  function result(data: unknown) { return Promise.resolve({ data, error: null }); }
  function builder(table: string) {
    let inserted: Record<string, unknown> | null = null;
    const query: Record<string, unknown> = {
      select: () => query,
      eq: () => query,
      maybeSingle: () => result(table === "learning_materials" ? { id: ids.material, title: "Solar Energy", original_text: lesson, extracted_text: "" } : null),
      single: () => {
        if (table !== "ai_generation_jobs" || !inserted) return result(null);
        state.jobs.push({ ...inserted, id: ids.job });
        return result({ id: ids.job });
      },
      insert: (row: Record<string, unknown>) => { inserted = row; return query; },
      update: () => query,
      then: (resolvePromise: (value: unknown) => unknown, rejectPromise: (reason: unknown) => unknown) => result(null).then(resolvePromise, rejectPromise),
    };
    return query;
  }
  return {
    state,
    client: {
      from: (table: string) => builder(table),
      rpc: (name: string, args: Record<string, unknown>) => {
        if (name === "persist_generated_graph") {
          state.persistedGraph = args.p_graph as Record<string, unknown>;
          return result(ids.graph);
        }
        if (name === "persist_generated_quiz") {
          state.persistedQuiz = args.p_questions;
          return result([{ quiz_id: ids.quiz, question_count: Array.isArray(args.p_questions) ? args.p_questions.length : 0 }]);
        }
        return result(null);
      },
    },
  };
}

describe("production AI API route integration (in-memory persistence; real IntelSphere)", () => {
  beforeAll(() => loadLocalEnv());

  it.skipIf(process.env.AI_LAB_OPERATION !== "routes")("authenticates, generates, persists and serializes through the Graph POST handler", async () => {
    const memory = createMemorySupabase();
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({ getCurrentUser: async () => ({ id: ids.user }) }));
    vi.doMock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => memory.client }));
    const { POST } = await import("../../src/app/api/ai/generate-graph/route");
    const response = await POST(new Request("http://localhost/api/ai/generate-graph", {
      method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ materialId: ids.material }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-ai-request-id")).toBeTruthy();
    expect(body.graph.id).toBe(ids.graph);
    expect(body.graph.nodeCount).toBeGreaterThanOrEqual(3);
    expect(body.graph.edgeCount).toBeGreaterThanOrEqual(2);
    expect((memory.state.persistedGraph?.nodes as unknown[]).length).toBe(body.graph.nodeCount);
    expect(memory.state.jobs).toHaveLength(1);
    expect(memory.state.jobs[0]).toMatchObject({ job_type: "graph", status: "processing", user_id: ids.user });
  }, 120_000);

  it.skipIf(process.env.AI_LAB_OPERATION !== "routes")("authenticates, generates, persists and serializes through the Quiz POST handler", async () => {
    const memory = createMemorySupabase();
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({ getCurrentUser: async () => ({ id: ids.user }) }));
    vi.doMock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => memory.client }));
    const { POST } = await import("../../src/app/api/ai/generate-quiz/route");
    const response = await POST(new Request("http://localhost/api/ai/generate-quiz", {
      method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
      body: JSON.stringify({ materialId: ids.material, questionCount: 5, difficulty: "mixed", questionType: "mixed" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(response.headers.get("x-ai-request-id")).toBeTruthy();
    expect(body.quiz.id).toBe(ids.quiz);
    expect(body.quiz.questionCount).toBe(5);
    expect(Array.isArray(memory.state.persistedQuiz)).toBe(true);
    expect(memory.state.persistedQuiz as unknown[]).toHaveLength(5);
    expect(memory.state.jobs).toHaveLength(1);
    expect(memory.state.jobs[0]).toMatchObject({ job_type: "quiz", status: "processing", user_id: ids.user });
  }, 180_000);

  it.skipIf(process.env.AI_LAB_OPERATION !== "routes")("returns shared-contract authentication and input errors without persisting", async () => {
    const memory = createMemorySupabase();
    vi.resetModules();
    vi.doMock("@/lib/auth/session", () => ({ getCurrentUser: async () => null }));
    vi.doMock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => memory.client }));
    const { POST } = await import("../../src/app/api/ai/generate-graph/route");
    const unauthenticated = await POST(requestFrom({ materialId: ids.material }));
    expect(unauthenticated.status).toBe(401);
    expect((await unauthenticated.json()).error.code).toBe("UNAUTHENTICATED");

    vi.doMock("@/lib/auth/session", () => ({ getCurrentUser: async () => ({ id: ids.user }) }));
    vi.resetModules();
    const { POST: authenticatedPost } = await import("../../src/app/api/ai/generate-graph/route");
    const invalid = await authenticatedPost(requestFrom({ materialId: "bad" }));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("INVALID_INPUT");
    expect(memory.state.jobs).toHaveLength(0);
  }, 30_000);
});

function requestFrom(body: unknown) {
  return new Request("http://localhost/api/ai/generate-graph", {
    method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
