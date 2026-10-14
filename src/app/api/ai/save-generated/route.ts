import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { generatedGraphSchema, validateGeneratedGraph } from "@/lib/ai/graph-schema";
import { generatedNotesSchema } from "@/lib/ai/notes-core";
import { generatedQuestionSchema, normalizeText, validateGeneratedQuestions } from "@/lib/ai/quiz-schema";
import { serializeGraphGenerationResponse, serializeQuizGenerationResponse } from "@/lib/ai/generation-contract";

const quizSchema = z.object({
  operation: z.literal("quiz"),
  saveRequestId: z.string().uuid(),
  materialId: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  description: z.string().max(2000),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  quizType: z.enum(["multiple_choice", "true_false", "mixed"]),
  graphNodeId: z.string().uuid().nullable(),
  model: z.string().min(1).max(120),
  inputTokens: z.number().int().nonnegative().nullable(),
  outputTokens: z.number().int().nonnegative().nullable(),
  requestedCount: z.number().int().min(5).max(20),
  questions: z.array(generatedQuestionSchema).min(5).max(20),
});
const graphSchema = z.object({
  operation: z.literal("graph"), saveRequestId: z.string().uuid(), materialId: z.string().uuid(),
  model: z.string().min(1).max(120), inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(),
  graph: generatedGraphSchema,
});
const notesSchema = z.object({
  operation: z.literal("notes"), saveRequestId: z.string().uuid(), materialId: z.string().uuid(),
  model: z.string().min(1).max(120), inputTokens: z.number().int().nonnegative().nullable(), outputTokens: z.number().int().nonnegative().nullable(),
  notes: generatedNotesSchema,
});
const schema = z.discriminatedUnion("operation", [quizSchema, graphSchema, notesSchema]);

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Same-origin request required.", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in before saving generated content.", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("Generated content is invalid or incomplete.", 400, "INVALID_GENERATED_CONTENT");

  const db = getSupabaseAdmin();
  const { data: material, error: materialError } = await db.from("learning_materials")
    .select("id,extracted_text,original_text")
    .eq("id", input.data.materialId).eq("user_id", user.id).maybeSingle();
  if (materialError) return jsonError("Could not verify lesson ownership.", 503, "MATERIAL_UNAVAILABLE");
  if (!material) return jsonError("Lesson not found.", 404, "MATERIAL_NOT_FOUND");
  const sourceText = material.extracted_text || material.original_text;

  if (input.data.operation === "graph") {
    const validation = validateGeneratedGraph(input.data.graph, sourceText);
    if (!validation.graph) return jsonError("Generated graph failed source and integrity validation.", 422, "GRAPH_VALIDATION_FAILED");
  } else if (input.data.operation === "notes") {
    const normalizedSource = normalizeText(sourceText);
    if (input.data.notes.sourceQuotes.some(quote => !normalizedSource.includes(normalizeText(quote)))) {
      return jsonError("Generated notes contain a quote that is not in the lesson.", 422, "NOTES_CITATION_INVALID");
    }
  } else {
    if (input.data.questions.length !== input.data.requestedCount) return jsonError("The quiz is incomplete and cannot be saved.", 422, "QUIZ_INCOMPLETE");
    const expectedType = input.data.quizType === "mixed" ? undefined : input.data.quizType;
    const validation = validateGeneratedQuestions({ questions: input.data.questions }, sourceText, { expectedType });
    if (validation.questions.length !== input.data.questions.length) return jsonError("Quiz questions failed source or duplicate validation.", 422, "QUIZ_VALIDATION_FAILED");
    if (input.data.graphNodeId) {
      const { data: node } = await db.from("graph_nodes").select("graph_id").eq("id", input.data.graphNodeId).maybeSingle();
      if (!node) return jsonError("Graph concept not found.", 404, "GRAPH_NODE_NOT_FOUND");
      const { data: graph } = await db.from("knowledge_graphs").select("id").eq("id", node.graph_id).eq("user_id", user.id).eq("material_id", material.id).maybeSingle();
      if (!graph) return jsonError("Graph concept is not owned by this user.", 404, "GRAPH_NOT_FOUND");
    }
  }

  const operation = input.data.operation;
  const payload = operation === "graph" ? { graph: input.data.graph }
    : operation === "notes" ? { notes: input.data.notes }
      : { questions: input.data.questions };
  const title = operation === "graph" ? input.data.graph.title
    : operation === "notes" ? input.data.notes.title : input.data.title;
  const metadata = operation === "quiz" ? {
    description: input.data.description, difficulty: input.data.difficulty, quizType: input.data.quizType,
    graphNodeId: input.data.graphNodeId, model: input.data.model, inputTokens: input.data.inputTokens,
    outputTokens: input.data.outputTokens, requestedCount: input.data.requestedCount,
  } : { model: input.data.model, inputTokens: input.data.inputTokens, outputTokens: input.data.outputTokens };
  const { data, error } = await db.rpc("save_generated_content", {
    p_operation: operation, p_request_id: input.data.saveRequestId, p_user_id: user.id,
    p_material_id: material.id, p_title: title, p_payload: payload, p_metadata: metadata,
  });
  if (error || !Array.isArray(data) || !data[0]?.resource_id) {
    console.error("[ai.save] persistence failed", { operation, code: error?.code ?? "empty_result" });
    return jsonError("Could not save generated content. Retry saving without generating again.", 503, "SAVE_FAILED");
  }
  const saved = data[0] as { resource_id: string; resource_title: string; item_count: number; resource_created_at: string };
  if (operation === "graph") return jsonOk({
    operation, resourceId: saved.resource_id, title: saved.resource_title, itemCount: saved.item_count,
    ...serializeGraphGenerationResponse({ graph: { id: saved.resource_id, title: saved.resource_title, nodeCount: input.data.graph.nodes.length, edgeCount: input.data.graph.edges.length } }),
  }, 201);
  if (operation === "quiz") return jsonOk({
    operation, resourceId: saved.resource_id, title: saved.resource_title, itemCount: saved.item_count,
    ...serializeQuizGenerationResponse({ quiz: { id: saved.resource_id, title: saved.resource_title, questionCount: saved.item_count }, warning: null }),
  }, 201);
  return jsonOk({ operation, resourceId: saved.resource_id, title: saved.resource_title, itemCount: saved.item_count, note: { id: saved.resource_id, title: saved.resource_title, created_at: saved.resource_created_at } }, 201);
}
