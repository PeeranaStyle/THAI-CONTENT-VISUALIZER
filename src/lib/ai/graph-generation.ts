import "server-only";
import { createTracedCompletion } from "@/lib/ai/client";
import { generateGraphCore } from "@/lib/ai/graph-core";
import { env } from "@/lib/env";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

export function generateGraph(title: string, sourceText: string, trace: AiRequestTrace, signal?: AbortSignal) {
  return generateGraphCore(title, sourceText, trace, env.INTELSPHERE_MODEL, createTracedCompletion, signal);
}
