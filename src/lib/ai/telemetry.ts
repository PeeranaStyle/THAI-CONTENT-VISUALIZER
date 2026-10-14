import "server-only";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { jsonError } from "@/lib/api";
import { AiOutputError } from "@/lib/ai/output";

export type AiOperation = "quiz" | "graph";

export type AiRequestTrace = {
  requestId: string;
  operation: AiOperation;
  modelId: string;
  sourceCharacterCount: number | null;
  upstreamHttpStatus: number | null;
  upstreamRequestDurationMs: number | null;
  parsingDurationMs: number | null;
  databaseDurationMs: number;
  errorCategory: string | null;
  sanitizedError: string | null;
  finishReason: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  startedAt: number;
};

export function createAiRequestTrace(request: Request, operation: AiOperation, modelId: string): AiRequestTrace {
  return {
    requestId: request.headers.get("x-vercel-id") || request.headers.get("x-request-id") || randomUUID(),
    operation,
    modelId,
    sourceCharacterCount: null,
    upstreamHttpStatus: null,
    upstreamRequestDurationMs: null,
    parsingDurationMs: null,
    databaseDurationMs: 0,
    errorCategory: null,
    sanitizedError: null,
    finishReason: null,
    inputTokens: null,
    outputTokens: null,
    startedAt: performance.now(),
  };
}

export async function measureAiDatabase<T>(trace: AiRequestTrace, operation: () => PromiseLike<T> | Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    const result = await operation();
    if (typeof result === "object" && result !== null && "error" in result && result.error) {
      trace.errorCategory ??= "database_query_failed";
    }
    return result;
  } catch (error) {
    trace.errorCategory ??= "database_query_failed";
    throw error;
  } finally {
    trace.databaseDurationMs += performance.now() - startedAt;
  }
}

export function categorizeAiError(error: unknown): string {
  if (error instanceof AiOutputError) return error.category;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 408 || error.status === 504) return "timeout";
    return "upstream";
  }
  if (error instanceof Error && /timeout|timed out|abort/i.test(`${error.name} ${error.message}`)) return "timeout";
  return "persistence";
}

export async function withAiRequestTelemetry(
  request: Request,
  operation: AiOperation,
  modelId: string,
  handler: (trace: AiRequestTrace) => Promise<Response>,
): Promise<Response> {
  const trace = createAiRequestTrace(request, operation, modelId);
  let response: Response;
  try {
    response = await handler(trace);
  } catch (error) {
    trace.errorCategory = categorizeAiError(error);
    response = jsonError(
      "AI generation could not be completed. Please retry shortly.",
      trace.errorCategory === "timeout" ? 504 : 502,
      trace.errorCategory === "timeout" ? "AI_UPSTREAM_TIMEOUT" : "AI_GENERATION_FAILED",
    );
  }

  if (trace.errorCategory === "timeout" && response.status === 502) {
    response = jsonError("IntelSphere took too long to respond. Please retry shortly.", 504, "AI_UPSTREAM_TIMEOUT");
  }
  if (!trace.errorCategory && response.status >= 400) {
    trace.errorCategory = response.status === 400 ? "invalid_input"
      : response.status === 401 ? "unauthenticated"
      : response.status === 403 ? "origin_rejected"
      : response.status === 404 ? "resource_not_found"
      : response.status === 409 ? "generation_already_running"
      : response.status === 422 ? "source_rejected"
      : response.status === 503 ? "service_unavailable"
      : "application_error";
  }

  response.headers.set("x-ai-request-id", trace.requestId);
  console.info(JSON.stringify({
    event: "ai_generation",
    requestId: trace.requestId,
    operation: trace.operation,
    modelId: trace.modelId,
    sourceCharacterCount: trace.sourceCharacterCount,
    upstreamHttpStatus: trace.upstreamHttpStatus,
    upstreamRequestDurationMs: trace.upstreamRequestDurationMs === null ? null : Math.round(trace.upstreamRequestDurationMs),
    parsingDurationMs: trace.parsingDurationMs === null ? null : Math.round(trace.parsingDurationMs),
    databaseDurationMs: Math.round(trace.databaseDurationMs),
    totalExecutionDurationMs: Math.round(performance.now() - trace.startedAt),
    errorCategory: trace.errorCategory,
    sanitizedError: trace.sanitizedError,
    finishReason: trace.finishReason,
    inputTokens: trace.inputTokens,
    outputTokens: trace.outputTokens,
    responseStatus: response.status,
  }));
  return response;
}
