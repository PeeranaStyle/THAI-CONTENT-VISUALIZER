import { z } from "zod";

export const graphGenerationResponseSchema = z.object({
  graph: z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    nodeCount: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
  }),
});

export const quizGenerationResponseSchema = z.object({
  quiz: z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    questionCount: z.number().int().positive(),
  }),
  warning: z.string().nullable(),
});

export type GraphGenerationResponse = z.infer<typeof graphGenerationResponseSchema>;
export type QuizGenerationResponse = z.infer<typeof quizGenerationResponseSchema>;

export function serializeGraphGenerationResponse(response: GraphGenerationResponse): GraphGenerationResponse {
  return graphGenerationResponseSchema.parse(response);
}

export function serializeQuizGenerationResponse(response: QuizGenerationResponse): QuizGenerationResponse {
  return quizGenerationResponseSchema.parse(response);
}

export function graphNavigationHref(response: unknown): string {
  const parsed = graphGenerationResponseSchema.parse(response);
  return `/graphs/${parsed.graph.id}`;
}

export function quizNavigationHref(response: unknown): string {
  const parsed = quizGenerationResponseSchema.parse(response);
  return `/quiz/${parsed.quiz.id}${parsed.warning ? "?partial=1" : ""}`;
}
