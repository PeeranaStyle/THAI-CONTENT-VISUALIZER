import { describe, expect, it } from "vitest";
import { collectDistinctBatches } from "@/lib/ai/batching";
import { AiOutputError } from "@/lib/ai/output";

describe("quiz output batching", () => {
  it("collects the requested number of distinct questions", async () => {
    const calls: number[] = [];
    const result = await collectDistinctBatches<string>({
      count: 5,
      batchSize: 2,
      key: question => question,
      generate: async count => {
        calls.push(count);
        const start = calls.length === 1 ? 0 : calls.slice(0, -1).reduce((sum, size) => sum + size, 0);
        return Array.from({ length: count }, (_, index) => `question-${start + index}`);
      },
    });
    expect(result).toHaveLength(5);
    expect(new Set(result).size).toBe(5);
    expect(calls).toEqual([2, 2, 1]);
  });

  it("splits a truncated batch into smaller, different requests", async () => {
    const calls: number[] = [];
    const result = await collectDistinctBatches<string>({
      count: 2,
      batchSize: 2,
      key: question => question,
      generate: async count => {
        calls.push(count);
        if (calls.length === 1) throw new AiOutputError("truncated", "truncated", "finish_reason_length");
        return Array.from({ length: count }, (_, index) => `question-${calls.length}-${index}`);
      },
    });
    expect(calls).toEqual([2, 1, 1]);
    expect(result).toHaveLength(2);
  });

  it("retries duplicate slots with a fresh prompt context", async () => {
    let calls = 0;
    const result = await collectDistinctBatches<string>({
      count: 2,
      batchSize: 2,
      key: question => question,
      generate: async (_count, previous) => {
        calls += 1;
        if (calls === 1) return ["same", "same"];
        expect(previous).toContain("same");
        return ["different"];
      },
    });
    expect(result).toEqual(["same", "different"]);
  });
});
