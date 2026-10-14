import { describe, expect, it } from "vitest";
import { generateQuizCore, type CompletionRequest } from "@/lib/ai/quiz-core";
import type { AiRequestTrace } from "@/lib/ai/telemetry";
import type OpenAI from "openai";

const source = "Solar panels convert sunlight into electricity. An inverter changes direct current into alternating current for appliances. A battery stores extra electricity for use at night.";
const quote = "Solar panels convert sunlight into electricity.";

function question(stem: string, overrides: Record<string, unknown> = {}) {
  return {
    type: "multiple_choice",
    question: `Which statement explains ${stem} in the solar energy lesson?`,
    options: [
      { id: "a", text: `Answer about ${stem}` },
      { id: "b", text: `Different detail for ${stem}` },
      { id: "c", text: `Unrelated idea for ${stem}` },
      { id: "d", text: `Another fact about ${stem}` },
    ],
    correctAnswer: "a",
    explanation: `The lesson says this about ${stem} and its role in energy conversion.`,
    difficulty: "medium",
    conceptKeys: ["solar-energy"],
    sourceReferences: [{ quote }],
    ...overrides,
  };
}

function completion(questions: unknown[], finishReason: "stop" | "length" = "stop") {
  return {
    id: "deterministic-test",
    object: "chat.completion",
    created: 0,
    model: "test-model",
    choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content: JSON.stringify({ questions }) } }],
  } as unknown as OpenAI.Chat.Completions.ChatCompletion;
}

function createTrace(): AiRequestTrace {
  return {
    requestId: "deterministic-test", operation: "quiz", modelId: "test-model", sourceCharacterCount: null,
    upstreamHttpStatus: null, upstreamRequestDurationMs: null, parsingDurationMs: null, databaseDurationMs: 0,
    errorCategory: null, sanitizedError: null, finishReason: null, finishReasons: [], inputTokens: null,
    outputTokens: null, totalTokens: null, reasoningTokens: null, reasoningCharacterCounts: [],
    completionMessageFields: [], responseStructure: [], upstreamContentType: null, requestedMaxTokens: null,
    batchCount: 0, modelQuota: null, startedAt: performance.now(),
  };
}

function responder(
  responses: unknown[][],
  requestedCounts: number[],
  requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[],
  finishReasons: Array<"stop" | "length"> = [],
) {
  let index = 0;
  const request: CompletionRequest = async (trace, params) => {
    requests.push(params);
    requestedCounts.push(Number(params.messages[1]?.content?.toString().match(/Generate (\d+) quiz questions/)?.[1]));
    trace.batchCount += 1;
    const data = responses[index++];
    if (!data) throw new Error("Unexpected model request in deterministic test.");
    return completion(data, finishReasons[index - 1] ?? "stop");
  };
  return request;
}

const options = (count: number, questionType: "multiple_choice" | "true_false" | "mixed" = "mixed") => ({
  count, difficulty: "mixed" as const, questionType, materialTitle: "Solar energy", sourceText: source,
});

describe("production quiz generation recovery", () => {
  it("returns a fully validated batch of three questions unchanged", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const result = await generateQuizCore(options(3), createTrace(), "test-model", responder(
      [[question("solar panels"), question("the inverter"), question("the battery")]], requestedCounts, requests,
    ));
    expect(result.questions).toHaveLength(3);
    expect(result.rejectedCount).toBe(0);
    expect(requestedCounts).toEqual([3]);
    expect(requests[0].max_tokens).toBe(4_096);
  });

  it("keeps one valid question and requests replacements only for two rejected questions", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const invalidIds = question("bad duplicate IDs", {
      options: [{ id: "a", text: "Choice one" }, { id: "a", text: "Choice two" }, { id: "c", text: "Choice three" }, { id: "d", text: "Choice four" }],
    });
    const invalidTexts = question("bad duplicate texts", {
      options: [{ id: "a", text: "Solar power" }, { id: "b", text: "solar-power!" }, { id: "c", text: "Wind energy" }, { id: "d", text: "Hydro energy" }],
    });
    const trace = createTrace();
    const result = await generateQuizCore(options(3), trace, "test-model", responder([
      [invalidIds, question("one accepted item"), invalidTexts],
      [question("replacement first"), question("replacement second")],
    ], requestedCounts, requests));

    expect(result.questions.map(item => item.question)).toEqual([
      question("one accepted item").question,
      question("replacement first").question,
      question("replacement second").question,
    ]);
    expect(result.rejectedCount).toBe(2);
    expect(result.replacementRounds).toBe(1);
    expect(requestedCounts).toEqual([3, 2]);
    expect(trace.batchCount).toBe(2);
    expect(requests[1].messages[1]?.content).toContain(question("one accepted item").question);
  });

  it("splits a truncated batch into smaller production requests", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const result = await generateQuizCore(options(3), createTrace(), "test-model", responder([
      [], [question("split first"), question("split second")], [question("split third")],
    ], requestedCounts, requests, ["length", "stop", "stop"]));
    expect(result.questions).toHaveLength(3);
    expect(requestedCounts).toEqual([3, 2, 1]);
    expect(result.replacementRounds).toBe(0);
  });

  it("stops after four replacement rounds and returns a sanitized incomplete diagnostic", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const invalid = question("invalid repeated item", {
      options: [{ id: "a", text: "Same answer" }, { id: "b", text: "same-answer!" }, { id: "c", text: "Other answer" }, { id: "d", text: "Last answer" }],
    });
    const trace = createTrace();
    await expect(generateQuizCore(options(3), trace, "test-model", responder([
      [question("one retained item"), invalid, invalid],
      [invalid, invalid], [invalid, invalid], [invalid, invalid], [invalid, invalid],
    ], requestedCounts, requests))).rejects.toMatchObject({
      category: "validation",
      diagnostic: expect.stringContaining("quiz_incomplete_1_of_3;requests_5;replacement_rounds_4"),
    });
    expect(requestedCounts).toEqual([3, 2, 2, 2, 2]);
    expect(trace.batchCount).toBe(5);
  });

  it("replaces duplicates across batches and retains the requested count", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const duplicate = question("first batch question");
    const result = await generateQuizCore(options(4), createTrace(), "test-model", responder([
      [duplicate, question("second batch question"), question("third batch question")],
      [duplicate],
      [question("replacement after cross batch duplicate")],
    ], requestedCounts, requests));
    expect(result.questions).toHaveLength(4);
    expect(result.questions.map(item => item.question)).toContain(question("replacement after cross batch duplicate").question);
    expect(result.rejectedCount).toBe(1);
    expect(requestedCounts).toEqual([3, 1, 1]);
    expect(requests[1].messages[1]?.content).toContain(duplicate.question);
  });

  it("preserves requested type constraints while replacing mismatched types", async () => {
    const requests: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming[] = [];
    const requestedCounts: number[] = [];
    const trueFalse = question("true false item", { type: "true_false", options: undefined, correctAnswer: true });
    const result = await generateQuizCore(options(3, "multiple_choice"), createTrace(), "test-model", responder([
      [question("first MC"), trueFalse, question("second MC")],
      [question("third MC")],
    ], requestedCounts, requests));
    expect(result.questions).toHaveLength(3);
    expect(result.questions.every(item => item.type === "multiple_choice")).toBe(true);
    expect(result.rejectedCount).toBe(1);
    expect(requestedCounts).toEqual([3, 1]);
  });
});
