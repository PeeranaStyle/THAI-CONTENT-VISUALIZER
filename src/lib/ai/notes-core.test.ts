import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { generateNotesCore } from "@/lib/ai/notes-core";
import type { AiRequestTrace } from "@/lib/ai/telemetry";
import type { CompletionRequest } from "@/lib/ai/quiz-core";

const source = "Solar panels convert sunlight into electricity. An inverter changes direct current into alternating current for appliances. A battery stores extra electricity for use at night.";
const notes = {
  title: "พลังงานแสงอาทิตย์", summary: "แผงเซลล์แสงอาทิตย์เปลี่ยนพลังงานจากแสงแดดให้เป็นพลังงานไฟฟ้าเพื่อใช้งานในบ้านและโรงเรียน",
  keyPoints: ["แผงโซลาร์เปลี่ยนแสงแดดเป็นพลังงานไฟฟ้า", "อินเวอร์เตอร์เปลี่ยนไฟฟ้ากระแสตรงเป็นกระแสสลับ", "แบตเตอรี่เก็บไฟฟ้าส่วนเกินไว้ใช้ในเวลากลางคืน"],
  keyTerms: [{ term: "อินเวอร์เตอร์", definition: "อุปกรณ์ที่เปลี่ยนไฟฟ้ากระแสตรงเป็นไฟฟ้ากระแสสลับ" }],
  sourceQuotes: ["Solar panels convert sunlight into electricity.", "A battery stores extra electricity for use at night."],
};

function trace(): AiRequestTrace {
  return { requestId: "notes-test", operation: "notes", modelId: "test-model", sourceCharacterCount: null, upstreamHttpStatus: null, upstreamRequestDurationMs: null, parsingDurationMs: null, databaseDurationMs: 0, errorCategory: null, sanitizedError: null, validationDiagnostics: [], finishReason: null, finishReasons: [], inputTokens: null, outputTokens: null, totalTokens: null, reasoningTokens: null, reasoningCharacterCounts: [], completionMessageFields: [], responseStructure: [], upstreamContentType: null, requestedMaxTokens: null, batchCount: 0, modelQuota: null, startedAt: performance.now() };
}
function completion(value: unknown, finishReason = "stop") {
  return { id: "notes-test", object: "chat.completion", created: 0, model: "test-model", choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content: JSON.stringify(value) } }] } as unknown as OpenAI.Chat.Completions.ChatCompletion;
}

describe("single-request notes generation", () => {
  it("returns grounded notes from one AI request", async () => {
    const request = vi.fn<CompletionRequest>(async () => completion(notes));
    const result = await generateNotesCore("Solar energy", source, trace(), "test-model", request);
    expect(result.notes).toEqual(notes);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects fabricated citations without retrying", async () => {
    const badNotes = { ...notes, sourceQuotes: ["This quotation is not present in this original lesson.", notes.sourceQuotes[1]] };
    const request = vi.fn<CompletionRequest>(async () => completion(badNotes));
    await expect(generateNotesCore("Solar energy", source, trace(), "test-model", request)).rejects.toMatchObject({ diagnostic: "notes_citation_not_grounded" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("classifies truncated output", async () => {
    const request: CompletionRequest = async () => completion({}, "length");
    await expect(generateNotesCore("Solar energy", source, trace(), "test-model", request)).rejects.toMatchObject({ category: "truncated" });
  });
});
