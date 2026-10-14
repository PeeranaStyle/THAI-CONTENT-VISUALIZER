import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUserReadOnly } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { env, hasIntelSphereConfig } from "@/lib/env";
import { createTracedCompletion } from "@/lib/ai/client";
import { generateNotesCore } from "@/lib/ai/notes-core";
import { measureAiDatabase, withAiRequestTelemetry, type AiRequestTrace } from "@/lib/ai/telemetry";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

const schema = z.object({ materialId: z.string().uuid() });

export async function POST(request: Request) {
  return withAiRequestTelemetry(request, "notes", env.INTELSPHERE_MODEL, trace => handlePost(request, trace));
}

async function handlePost(request: Request, trace: AiRequestTrace) {
  if (!isSameOrigin(request)) return jsonError("Same-origin request required.", 403, "ORIGIN_REJECTED");
  const user = await measureAiDatabase(trace, () => getCurrentUserReadOnly());
  if (!user) return jsonError("Please sign in before generating notes.", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("Invalid notes generation request.", 400, "INVALID_INPUT");
  if (!hasIntelSphereConfig()) return jsonError("IntelSphere is not configured.", 503, "AI_NOT_CONFIGURED");

  const { data: material, error } = await measureAiDatabase(trace, () => getSupabaseAdmin().from("learning_materials")
    .select("id,title,extracted_text,original_text")
    .eq("id", input.data.materialId).eq("user_id", user.id).maybeSingle());
  if (error) return jsonError("Could not load the lesson.", 503, "MATERIAL_UNAVAILABLE");
  if (!material) return jsonError("Lesson not found.", 404, "MATERIAL_NOT_FOUND");
  const sourceText = material.extracted_text || material.original_text;
  if (sourceText.trim().length < 80) return jsonError("The lesson needs at least 80 characters.", 422, "SOURCE_TOO_SHORT");

  const generated = await generateNotesCore(material.title, sourceText, trace, env.INTELSPHERE_MODEL, createTracedCompletion, request.signal);
  return jsonOk({ materialId: material.id, notes: generated.notes, model: generated.model, inputTokens: generated.inputTokens, outputTokens: generated.outputTokens });
}
