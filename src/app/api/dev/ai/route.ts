import { z } from "zod";
import OpenAI from "openai";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { createTracedCompletion } from "@/lib/ai/client";
import { generateGraphCore } from "@/lib/ai/graph-core";
import { AiOutputError } from "@/lib/ai/output";
import { generateQuizCore } from "@/lib/ai/quiz-core";
import { generateNotesCore } from "@/lib/ai/notes-core";
import { categorizeAiError, createAiRequestTrace } from "@/lib/ai/telemetry";
import { env, hasIntelSphereConfig } from "@/lib/env";
import { isSameOrigin } from "@/lib/auth/security";
import { getCurrentUser } from "@/lib/auth/session";
import type { CompletionRequest } from "@/lib/ai/quiz-core";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("graph"),
    title: z.string().trim().min(2).max(140),
    sourceText: z.string().trim().min(240).max(120_000),
  }),
  z.object({
    operation: z.literal("quiz"),
    title: z.string().trim().min(2).max(140),
    sourceText: z.string().trim().min(120).max(120_000),
    questionCount: z.number().int().min(1).max(3),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    questionType: z.enum(["multiple_choice", "true_false", "mixed"]),
  }),
  z.object({ operation: z.literal("notes"), title: z.string().trim().min(2).max(140), sourceText: z.string().trim().min(80).max(120_000) }),
]);

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && (await getCurrentUser())?.role !== "admin") return jsonError("Not found.", 404, "NOT_FOUND");
  if (!isSameOrigin(request)) return jsonError("Same-origin request required.", 403, "ORIGIN_REJECTED");
  if (!hasIntelSphereConfig()) return jsonError("IntelSphere is not configured.", 503, "AI_NOT_CONFIGURED");

  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("Check the operation settings and lesson text.", 400, "INVALID_INPUT");

  const trace = createAiRequestTrace(request, input.data.operation, env.INTELSPHERE_MODEL);
  const rawCalls: Array<Record<string, unknown>> = [];
  const requestCompletion: CompletionRequest = async (activeTrace, params, signal) => {
    const requestStartedAt = performance.now();
    const completion = await createTracedCompletion(activeTrace, params, signal);
    const choice = completion.choices[0];
    rawCalls.push({
      callNumber: rawCalls.length + 1,
      model: completion.model || params.model,
      httpStatus: activeTrace.upstreamHttpStatus,
      durationMs: Math.round(performance.now() - requestStartedAt),
      finishReason: choice?.finish_reason ?? null,
      usage: completion.usage ?? null,
      request: {
        temperature: params.temperature ?? null,
        maxTokens: params.max_tokens ?? null,
        messages: params.messages,
      },
      responseContent: choice?.message?.content ?? null,
    });
    return completion;
  };

  try {
    const result = input.data.operation === "graph"
      ? await generateGraphCore(input.data.title, input.data.sourceText, trace, env.INTELSPHERE_MODEL, requestCompletion, request.signal)
      : input.data.operation === "quiz"
        ? await generateQuizCore({
        count: input.data.questionCount,
        difficulty: input.data.difficulty,
        questionType: input.data.questionType,
        materialTitle: input.data.title,
        sourceText: input.data.sourceText,
        }, trace, env.INTELSPHERE_MODEL, requestCompletion, request.signal)
        : await generateNotesCore(input.data.title, input.data.sourceText, trace, env.INTELSPHERE_MODEL, requestCompletion, request.signal);

    return jsonOk({ success: true, operation: input.data.operation, model: result.model, result, rawCalls, trace: safeTrace(trace) });
  } catch (error) {
    trace.errorCategory ??= categorizeAiError(error);
    if (error instanceof AiOutputError) trace.sanitizedError ??= error.diagnostic ?? error.category;
    else if (!trace.sanitizedError) trace.sanitizedError = error instanceof OpenAI.APIError
      ? `provider_http_${error.status ?? "unknown"}`
      : error instanceof Error && /timeout|abort/i.test(`${error.name} ${error.message}`)
        ? "request_timeout"
        : "generation_failed";
    return jsonOk({
      success: false,
      operation: input.data.operation,
      model: trace.modelId,
      error: { category: trace.errorCategory, diagnostic: trace.sanitizedError },
      rawCalls,
      trace: safeTrace(trace),
    }, 502);
  }
}

function safeTrace(trace: ReturnType<typeof createAiRequestTrace>) {
  return {
    requestId: trace.requestId,
    modelId: trace.modelId,
    upstreamHttpStatus: trace.upstreamHttpStatus,
    upstreamRequestDurationMs: trace.upstreamRequestDurationMs === null ? null : Math.round(trace.upstreamRequestDurationMs),
    parsingDurationMs: trace.parsingDurationMs === null ? null : Math.round(trace.parsingDurationMs),
    errorCategory: trace.errorCategory,
    sanitizedError: trace.sanitizedError,
    validationDiagnostics: trace.validationDiagnostics,
    finishReasons: trace.finishReasons,
    inputTokens: trace.inputTokens,
    outputTokens: trace.outputTokens,
    totalTokens: trace.totalTokens,
    batchCount: trace.batchCount,
    modelQuota: trace.modelQuota,
    totalExecutionDurationMs: Math.round(performance.now() - trace.startedAt),
  };
}
