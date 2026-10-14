import { AiOutputError } from "@/lib/ai/output";

export async function collectDistinctBatches<T>(options: {
  count: number;
  batchSize: number;
  key: (item: T) => string;
  generate: (count: number, previous: readonly T[]) => Promise<readonly T[]>;
  totalBudgetMs?: number;
  reserveRequestMs?: number;
}): Promise<T[]> {
  const { count, batchSize, key, generate, totalBudgetMs, reserveRequestMs = 0 } = options;
  const deadline = totalBudgetMs === undefined ? null : performance.now() + totalBudgetMs;
  const results: T[] = [];
  const pending: number[] = [];
  for (let left = count; left > 0; left -= batchSize) pending.push(Math.min(batchSize, left));
  let calls = 0;
  const maxCalls = count * 4;

  while (results.length < count) {
    if (++calls > maxCalls) throw new AiOutputError("validation", "AI could not generate enough distinct questions.", "batch_attempt_limit");
    if (deadline !== null && performance.now() + reserveRequestMs >= deadline) {
      throw new AiOutputError("timeout", "Quiz generation reached its safe execution budget.", "quiz_generation_budget_exhausted");
    }
    const requested = Math.min(pending.shift() ?? batchSize, count - results.length);
    try {
      const batch = await generate(requested, results);
      if (batch.length !== requested) throw new AiOutputError("validation", "AI returned an incomplete batch.", `batch_count_${batch.length}_of_${requested}`);
      const existing = new Set(results.map(item => key(item)));
      let added = 0;
      for (const item of batch) {
        const itemKey = key(item);
        if (existing.has(itemKey)) continue;
        existing.add(itemKey);
        results.push(item);
        added += 1;
      }
      if (added < requested) pending.unshift(requested - added);
    } catch (error) {
      if (!(error instanceof AiOutputError) || error.category !== "truncated" || requested <= 1) throw error;
      const first = Math.floor(requested / 2);
      pending.unshift(first, requested - first);
    }
  }
  return results;
}
