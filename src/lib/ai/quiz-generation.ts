import "server-only";
import { createTracedCompletion } from "@/lib/ai/client";
import { generateQuizCore, type QuizGenerationOptions } from "@/lib/ai/quiz-core";
import { env } from "@/lib/env";
import type { AiRequestTrace } from "@/lib/ai/telemetry";

export type { QuizGenerationOptions } from "@/lib/ai/quiz-core";

export function generateQuiz(options: QuizGenerationOptions, trace: AiRequestTrace) {
  return generateQuizCore(options, trace, env.INTELSPHERE_MODEL, createTracedCompletion);
}
