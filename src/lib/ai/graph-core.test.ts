import type OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { generateGraphCore } from "@/lib/ai/graph-core";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

const source = "Sunlight provides energy for ecosystems. Plants use sunlight to make food. Herbivores get energy by eating plants.";
const graph = {
  title: "Energy in ecosystems",
  centralConceptKey: "energy",
  nodes: [
    { conceptKey: "energy", title: "Energy", description: "Energy moves through living things in an ecosystem.", nodeType: "central", sourceReferences: [{ quote: "Sunlight provides energy for ecosystems." }] },
    { conceptKey: "plants", title: "Plants", description: "Plants use sunlight to make food.", nodeType: "concept", sourceReferences: [{ quote: "Plants use sunlight to make food." }] },
    { conceptKey: "herbivores", title: "Herbivores", description: "Herbivores get energy by eating plants.", nodeType: "concept", sourceReferences: [{ quote: "Herbivores get energy by eating plants." }] },
  ],
  edges: [
    { sourceConceptKey: "energy", targetConceptKey: "plants", relationship: "supports" },
    { sourceConceptKey: "plants", targetConceptKey: "herbivores", relationship: "feed" },
  ],
};

function completion(content: string) {
  return {
    id: "test", object: "chat.completion", created: 0, model: "gemini-3.8-flash",
    choices: [{ index: 0, message: { role: "assistant", content, refusal: null }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
  } as OpenAI.Chat.Completions.ChatCompletion;
}

function trace(): AiRequestTrace {
  return {
    requestId: "test", operation: "graph", modelId: "gemini-3.8-flash", sourceCharacterCount: null,
    upstreamHttpStatus: null, upstreamRequestDurationMs: null, parsingDurationMs: null, databaseDurationMs: 0,
    errorCategory: null, sanitizedError: null, validationDiagnostics: [], finishReason: null, finishReasons: [], inputTokens: 0,
    outputTokens: 0, totalTokens: 0, reasoningTokens: null, reasoningCharacterCounts: [], completionMessageFields: [],
    responseStructure: [], upstreamContentType: null, requestedMaxTokens: null, batchCount: 0, modelQuota: null, startedAt: performance.now(),
  };
}

describe("graph generation recovery", () => {
  it("re-prompts once when the provider returns an invalid schema", async () => {
    const malformed = structuredClone(graph);
    malformed.nodes[1].nodeType = "process";
    const requests: string[] = [];
    const result = await generateGraphCore("Energy", source, trace(), "gemini-3.8-flash", async (_trace, params) => {
      requests.push(String(params.messages[1]?.content));
      return completion(JSON.stringify(requests.length === 1 ? malformed : graph));
    });

    expect(result.graph.nodes).toHaveLength(3);
    expect(requests).toHaveLength(2);
    expect(requests[1]).toContain("schema_nodes_1_nodeType_invalid_value");
  });
});
