import "server-only";
import OpenAI from "openai";
import { env, hasIntelSphereConfig } from "@/lib/env";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

let client: OpenAI | undefined;
export const AI_REQUEST_BUDGET_MS = 45_000;

export function getIntelSphereClient(): OpenAI {
  if (!hasIntelSphereConfig()) throw new Error("KKU IntelSphere is not configured. Set INTELSPHERE_BASE_URL and INTELSPHERE_API_KEY.");
  client ??= new OpenAI({ baseURL: env.INTELSPHERE_BASE_URL, apiKey: env.INTELSPHERE_API_KEY!, timeout: AI_REQUEST_BUDGET_MS, maxRetries: 0 });
  return client;
}

export async function createTracedCompletion(
  trace: AiRequestTrace,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  signal?: AbortSignal,
) {
  const startedAt = performance.now();
  trace.requestedMaxTokens = typeof params.max_tokens === "number" ? params.max_tokens : null;
  trace.batchCount += 1;
  try {
    const result = await getIntelSphereClient().chat.completions.create(params, { timeout: AI_REQUEST_BUDGET_MS, maxRetries: 0, signal }).withResponse();
    const completion = result.data;
    trace.upstreamHttpStatus = result.response.status;
    trace.upstreamContentType = result.response.headers.get("content-type");
    trace.upstreamRequestDurationMs = (trace.upstreamRequestDurationMs ?? 0) + performance.now() - startedAt;
    trace.modelId = String(completion.model || params.model);
    trace.responseStructure = completion && typeof completion === "object" ? Object.keys(completion) : [];
    trace.finishReason = completion.choices[0]?.finish_reason ?? null;
    if (trace.finishReason) trace.finishReasons.push(trace.finishReason);
    const message = completion.choices[0]?.message as (typeof completion.choices)[number]["message"] & { reasoning?: unknown } | undefined;
    trace.completionMessageFields.push(message ? Object.keys(message) : []);
    trace.reasoningCharacterCounts.push(typeof message?.reasoning === "string" ? message.reasoning.length : null);
    if (typeof completion.usage?.prompt_tokens === "number") trace.inputTokens = (trace.inputTokens ?? 0) + completion.usage.prompt_tokens;
    if (typeof completion.usage?.completion_tokens === "number") trace.outputTokens = (trace.outputTokens ?? 0) + completion.usage.completion_tokens;
    if (typeof completion.usage?.total_tokens === "number") trace.totalTokens = (trace.totalTokens ?? 0) + completion.usage.total_tokens;
    const reasoningTokens = completion.usage?.completion_tokens_details?.reasoning_tokens;
    if (typeof reasoningTokens === "number") trace.reasoningTokens = (trace.reasoningTokens ?? 0) + reasoningTokens;
    const quota = (completion as typeof completion & { model_quota?: Record<string, unknown> }).model_quota;
    if (quota) {
      const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
      trace.modelQuota = {
        dailyQuotaTokens: safeNumber(quota.daily_quota_tokens),
        dailyUsageTokens: safeNumber(quota.daily_usage_tokens),
        dailyRemainingTokens: safeNumber(quota.daily_remaining_tokens),
      };
    }
    return completion;
  } catch (error) {
    trace.upstreamHttpStatus = error instanceof OpenAI.APIError ? error.status ?? null : null;
    trace.upstreamRequestDurationMs = (trace.upstreamRequestDurationMs ?? 0) + performance.now() - startedAt;
    trace.sanitizedError = error instanceof OpenAI.APIConnectionTimeoutError
      ? "request_timeout"
      : error instanceof OpenAI.APIConnectionError
        ? "provider_connection_error"
        : error instanceof OpenAI.APIError
          ? `provider_http_${error.status ?? "unknown"}`
      : error instanceof Error && /timeout|abort/i.test(`${error.name} ${error.message}`) ? "request_timeout" : "upstream_connection_error";
    throw error;
  }
}
