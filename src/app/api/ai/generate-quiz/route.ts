import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUserReadOnly } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { env, hasIntelSphereConfig } from "@/lib/env";
import { createTracedCompletion } from "@/lib/ai/client";
import { generateQuizCore } from "@/lib/ai/quiz-core";
import { measureAiDatabase, withAiRequestTelemetry } from "@/lib/ai/telemetry";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

const schema = z.object({
  materialId: z.string().uuid(),
  title: z.string().trim().min(2).max(140).optional(),
  questionCount: z.number().int().min(1).max(3),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  questionType: z.enum(["multiple_choice", "true_false", "mixed"]),
  coverage: z.enum(["entire_material", "selected_node", "weak_topics_only"]).default("entire_material"),
  graphNodeId: z.string().uuid().optional(),
  existingQuestionTexts: z.array(z.string().min(12).max(700)).max(20).default([]),
});

export async function POST(request: Request) {
  return withAiRequestTelemetry(request, "quiz", env.INTELSPHERE_MODEL, trace => handlePost(request, trace));
}

async function handlePost(request: Request, trace: Parameters<Parameters<typeof withAiRequestTelemetry>[3]>[0]) {
  if (!isSameOrigin(request)) return jsonError("Same-origin request required.", 403, "ORIGIN_REJECTED");
  const user = await measureAiDatabase(trace, () => getCurrentUserReadOnly());
  if (!user) return jsonError("Please sign in before generating a quiz.", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("Invalid quiz generation request. Each request supports 1 to 3 questions.", 400, "INVALID_INPUT");
  if (!hasIntelSphereConfig()) return jsonError("IntelSphere is not configured.", 503, "AI_NOT_CONFIGURED");

  const supabase = getSupabaseAdmin();
  const { data: material, error } = await measureAiDatabase(trace, () => supabase.from("learning_materials")
    .select("id,title,extracted_text,original_text")
    .eq("id", input.data.materialId).eq("user_id", user.id).maybeSingle());
  if (error) return jsonError("Could not load the lesson.", 503, "MATERIAL_UNAVAILABLE");
  if (!material) return jsonError("Lesson not found.", 404, "MATERIAL_NOT_FOUND");
  const sourceText = material.extracted_text || material.original_text;
  if (sourceText.trim().length < 120) return jsonError("The lesson needs at least 120 characters.", 422, "SOURCE_TOO_SHORT");

  let graphNodeId: string | null = null;
  let focus: string[] = [];
  if (input.data.coverage === "selected_node") {
    if (!input.data.graphNodeId) return jsonError("Choose a graph concept first.", 400, "GRAPH_NODE_REQUIRED");
    const { data: node } = await measureAiDatabase(trace, () => supabase.from("graph_nodes").select("id,graph_id,title,description").eq("id", input.data.graphNodeId!).maybeSingle());
    if (!node) return jsonError("Graph concept not found.", 404, "GRAPH_NODE_NOT_FOUND");
    const { data: graph } = await measureAiDatabase(trace, () => supabase.from("knowledge_graphs").select("id").eq("id", node.graph_id).eq("user_id", user.id).eq("material_id", material.id).maybeSingle());
    if (!graph) return jsonError("Graph not found for this lesson.", 404, "GRAPH_NOT_FOUND");
    graphNodeId = node.id;
    focus = [node.title, node.description].filter(Boolean);
  } else if (input.data.coverage === "weak_topics_only") {
    const { data: topics, error: topicError } = await measureAiDatabase(trace, () => supabase.from("topic_mastery").select("concept_key").eq("user_id", user.id).eq("material_id", material.id).lt("mastery_score", 70).order("mastery_score", { ascending: true }).limit(8));
    if (topicError) return jsonError("Could not load review topics.", 503, "MASTERY_UNAVAILABLE");
    focus = (topics ?? []).map(topic => topic.concept_key);
    if (!focus.length) return jsonError("No weak topics are available for this lesson yet.", 422, "NO_WEAK_TOPICS");
  }

  const generated = await generateQuizCore({
    count: input.data.questionCount,
    difficulty: input.data.difficulty,
    questionType: input.data.questionType,
    materialTitle: material.title,
    sourceText,
    focus,
    existingQuestionTexts: input.data.existingQuestionTexts,
  }, trace, env.INTELSPHERE_MODEL, createTracedCompletion, request.signal);

  return jsonOk({
    materialId: material.id,
    title: input.data.title || `${material.title} · Review quiz`,
    description: input.data.coverage === "weak_topics_only" ? "Quiz focused on topics to review" : graphNodeId ? `Quiz focused on ${focus[0]}` : "Quiz generated from your lesson",
    difficulty: input.data.difficulty,
    quizType: input.data.questionType,
    graphNodeId,
    questions: generated.questions,
    requestedCount: generated.requestedCount,
    rejectedCount: generated.rejectedCount,
    model: generated.model,
    inputTokens: generated.inputTokens,
    outputTokens: generated.outputTokens,
  });
}
