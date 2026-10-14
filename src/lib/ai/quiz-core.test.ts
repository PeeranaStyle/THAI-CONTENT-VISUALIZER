import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { generateQuizCore, type CompletionRequest } from "@/lib/ai/quiz-core";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

const source = "Solar panels convert sunlight into electricity. An inverter changes direct current into alternating current for appliances. A battery stores extra electricity for use at night.";
const quote = "Solar panels convert sunlight into electricity.";

function question(stem: string, overrides: Record<string, unknown> = {}) {
  return {
    type: "multiple_choice", question: `Which statement explains ${stem} in the solar energy lesson?`,
    options: [
      { id: "a", text: `Answer about ${stem}` }, { id: "b", text: `Different detail for ${stem}` },
      { id: "c", text: `Unrelated idea for ${stem}` }, { id: "d", text: `Another fact about ${stem}` },
    ], correctAnswer: "a", explanation: `The lesson says this about ${stem} and its role in energy conversion.`,
    difficulty: "medium", conceptKeys: ["solar-energy"], sourceReferences: [{ quote }], ...overrides,
  };
}

function markdown(questions: ReturnType<typeof question>[]) {
  return questions.map((item, index) => `## QUESTION ${index + 1}\nType: ${item.type}\nDifficulty: ${item.difficulty}\nConcepts: ${(item.conceptKeys as string[]).join(", ")}\n\n### Question\n${item.question}\n\n### Options\n${(item.options as Array<{ id: string; text: string }>).map(option => `${option.id.toUpperCase()}. ${option.text}`).join("\n")}\n\n### Answer\n${item.correctAnswer}\n\n### Explanation\n${item.explanation}\n\n### Source\n> ${quote}`).join("\n\n");
}

function completion(content: string, finishReason = "stop") {
  return { id: "test", object: "chat.completion", created: 0, model: "test-model", choices: [{ index: 0, finish_reason: finishReason, message: { role: "assistant", content } }] } as unknown as OpenAI.Chat.Completions.ChatCompletion;
}

function trace(): AiRequestTrace {
  return { requestId: "test", operation: "quiz", modelId: "test-model", sourceCharacterCount: null, upstreamHttpStatus: null, upstreamRequestDurationMs: null, parsingDurationMs: null, databaseDurationMs: 0, errorCategory: null, sanitizedError: null, validationDiagnostics: [], finishReason: null, finishReasons: [], inputTokens: null, outputTokens: null, totalTokens: null, reasoningTokens: null, reasoningCharacterCounts: [], completionMessageFields: [], responseStructure: [], upstreamContentType: null, requestedMaxTokens: null, batchCount: 0, modelQuota: null, startedAt: performance.now() };
}

const options = (count: number) => ({ count, difficulty: "mixed" as const, questionType: "multiple_choice" as const, materialTitle: "Solar energy", sourceText: source });

describe("single-request quiz generation batches", () => {
  it("returns a validated batch using exactly one model request", async () => {
    const request = vi.fn<CompletionRequest>(async () => completion(markdown([question("solar panels"), question("the inverter"), question("the battery")])));
    const result = await generateQuizCore(options(3), trace(), "test-model", request);
    expect(result.questions).toHaveLength(3);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].max_tokens).toBe(4_096);
  });

  it("rejects any server request larger than three questions without calling the model", async () => {
    const request = vi.fn<CompletionRequest>();
    await expect(generateQuizCore(options(4), trace(), "test-model", request)).rejects.toMatchObject({ diagnostic: "quiz_batch_size_must_be_1_to_3" });
    expect(request).not.toHaveBeenCalled();
  });

  it("returns only valid questions and identifies rejected entries for frontend batching", async () => {
    const invalid = question("invalid repeated options", { options: [{ id: "a", text: "same" }, { id: "b", text: "SAME" }, { id: "c", text: "other" }, { id: "d", text: "last" }] });
    const request: CompletionRequest = async () => completion(markdown([question("first accepted"), invalid, question("third accepted")]));
    const result = await generateQuizCore(options(3), trace(), "test-model", request);
    expect(result.questions).toHaveLength(2);
    expect(result.rejectedCount).toBe(1);
  });

  it("filters duplicate stems from previously saved in-memory batches", async () => {
    const duplicate = question("previous question");
    const request: CompletionRequest = async () => completion(markdown([duplicate, question("new question")]));
    const result = await generateQuizCore({ ...options(2), existingQuestionTexts: [duplicate.question] }, trace(), "test-model", request);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].question).toContain("new question");
    expect(result.rejectedCount).toBe(1);
  });

  it("returns categorized truncation and validation errors without retrying", async () => {
    const request = vi.fn<CompletionRequest>(async () => completion("", "length"));
    await expect(generateQuizCore(options(1), trace(), "test-model", request)).rejects.toMatchObject({ category: "truncated" });
    expect(request).toHaveBeenCalledTimes(1);
    await expect(generateQuizCore(options(1), trace(), "test-model", async () => completion("not a quiz"))).rejects.toMatchObject({ category: "validation" });
  });
});
