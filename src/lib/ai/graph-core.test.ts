import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { generateGraphCore } from "@/lib/ai/graph-core";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

const source = "Sunlight provides energy for ecosystems. Plants use sunlight to make food. Herbivores get energy by eating plants.";
const graph = {
  title: "Energy in ecosystems", centralConceptKey: "energy",
  nodes: [
    { conceptKey: "energy", title: "Energy", description: "Energy moves through living things in an ecosystem.", nodeType: "central", sourceReferences: [{ quote: "Sunlight provides energy for ecosystems." }] },
    { conceptKey: "plants", title: "Plants", description: "Plants use sunlight to make food.", nodeType: "concept", sourceReferences: [{ quote: "Plants use sunlight to make food." }] },
    { conceptKey: "herbivores", title: "Herbivores", description: "Herbivores get energy by eating plants.", nodeType: "concept", sourceReferences: [{ quote: "Herbivores get energy by eating plants." }] },
  ],
  edges: [{ sourceConceptKey: "energy", targetConceptKey: "plants", relationship: "supports" }, { sourceConceptKey: "plants", targetConceptKey: "herbivores", relationship: "feed" }],
};
function completion(content: string) {
  return { id: "test", object: "chat.completion", created: 0, model: "gemini-3.8-flash", choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] } as unknown as OpenAI.Chat.Completions.ChatCompletion;
}
function trace(): AiRequestTrace {
  return { requestId: "test", operation: "graph", modelId: "gemini-3.8-flash", sourceCharacterCount: null, upstreamHttpStatus: null, upstreamRequestDurationMs: null, parsingDurationMs: null, databaseDurationMs: 0, errorCategory: null, sanitizedError: null, validationDiagnostics: [], finishReason: null, finishReasons: [], inputTokens: null, outputTokens: null, totalTokens: null, reasoningTokens: null, reasoningCharacterCounts: [], completionMessageFields: [], responseStructure: [], upstreamContentType: null, requestedMaxTokens: null, batchCount: 0, modelQuota: null, startedAt: performance.now() };
}

describe("single-request graph generation", () => {
  it("returns the validated graph after one model request", async () => {
    const request = vi.fn(async () => completion(JSON.stringify(graph)));
    const result = await generateGraphCore("Energy", source, trace(), "gemini-3.8-flash", request);
    expect(result.graph.nodes).toHaveLength(3);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("returns a validation error after one invalid response without repair calls", async () => {
    const malformed = structuredClone(graph);
    malformed.nodes[1].nodeType = "process";
    const request = vi.fn(async () => completion(JSON.stringify(malformed)));
    await expect(generateGraphCore("Energy", source, trace(), "gemini-3.8-flash", request)).rejects.toMatchObject({ category: "validation" });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
