import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: { id: "b86284d9-d1cc-4d8a-8a34-2cf13979e887", role: "student" as const },
  material: { id: "f82ea668-e7f5-4b25-8df2-8062e68d45bc", extracted_text: "Solar panels convert sunlight into electricity. An inverter changes direct current into alternating current for appliances. A battery stores extra electricity for use at night.", original_text: "" } as null | Record<string, unknown>,
  rpc: vi.fn(), from: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn(async () => state.user) }));
vi.mock("@/lib/auth/security", () => ({ isSameOrigin: vi.fn(() => true) }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: state.from, rpc: state.rpc }) }));

import { POST } from "@/app/api/ai/save-generated/route";

const source = String(state.material?.extracted_text);
const noteContent = { title: "Solar energy", summary: "Solar panels convert light into electricity for buildings and schools.", keyPoints: ["Panels convert sunlight to electric power", "An inverter changes current for appliances", "Batteries store extra power for later use"], keyTerms: [], sourceQuotes: ["Solar panels convert sunlight into electricity.", "A battery stores extra electricity for use at night."] };
function req(body: unknown) { return new Request("http://localhost/api/ai/save-generated", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify(body) }); }
function notePayload(saveRequestId = "3eb8fa84-e8e0-474d-9734-8d85227ff26f") {
  return { operation: "notes", saveRequestId, materialId: "f82ea668-e7f5-4b25-8df2-8062e68d45bc", model: "gemini-3.8-flash", inputTokens: 200, outputTokens: 100, notes: structuredClone(noteContent) };
}

describe("Save API authorization and validation", () => {
  beforeEach(() => {
    state.user = { id: "b86284d9-d1cc-4d8a-8a34-2cf13979e887", role: "student" };
    state.material = { id: "f82ea668-e7f5-4b25-8df2-8062e68d45bc", extracted_text: source, original_text: "" };
    state.rpc.mockReset().mockResolvedValue({ data: [{ resource_id: "d59f5293-944e-485d-9a42-191e10e28a64", resource_title: "Solar energy", item_count: 1 }], error: null });
    state.from.mockReset().mockImplementation((table: string) => {
      const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), maybeSingle: vi.fn(async () => ({ data: table === "learning_materials" ? state.material : null, error: null })) };
      return chain;
    });
  });

  it("requires an authenticated user before any persistence call", async () => {
    state.user = null as never;
    const response = await POST(req(notePayload()));
    expect(response.status).toBe(401);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("checks lesson ownership before saving", async () => {
    state.material = null;
    const response = await POST(req(notePayload()));
    expect(response.status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("rejects an ungrounded result before persistence", async () => {
    const payload = notePayload();
    payload.notes.sourceQuotes = ["This quote was invented and is absent from the source.", noteContent.sourceQuotes[1]];
    const response = await POST(req(payload));
    expect(response.status).toBe(422);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("validates the full result and passes the stable idempotency key to atomic persistence", async () => {
    const response = await POST(req(notePayload()));
    expect(response.status).toBe(201);
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.rpc.mock.calls[0][0]).toBe("save_generated_content");
    expect(state.rpc.mock.calls[0][1].p_request_id).toBe("3eb8fa84-e8e0-474d-9734-8d85227ff26f");
    expect(await response.json()).toMatchObject({ operation: "notes", resourceId: "d59f5293-944e-485d-9a42-191e10e28a64" });
  });

  it("returns a retryable error when persistence fails", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "08006" } });
    const response = await POST(req(notePayload()));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "SAVE_FAILED" } });
  });
});
