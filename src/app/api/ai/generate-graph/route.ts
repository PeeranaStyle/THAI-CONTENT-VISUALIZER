import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { env, hasIntelSphereConfig } from "@/lib/env";
import { generateGraph } from "@/lib/ai/graph-generation";
import { categorizeAiError, measureAiDatabase, withAiRequestTelemetry, type AiRequestTrace } from "@/lib/ai/telemetry";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ materialId: z.string().uuid(), title: z.string().trim().min(2).max(140).optional() });

export async function POST(request: Request) {
  return withAiRequestTelemetry(request, "graph", env.INTELSPHERE_MODEL, trace => handlePost(request, trace));
}

async function handlePost(request: Request, trace: AiRequestTrace) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await measureAiDatabase(trace, () => getCurrentUser());
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนสร้างแผนภาพ", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("เลือกบทเรียนที่ต้องการสร้างแผนภาพ", 400, "INVALID_INPUT");
  if (!hasIntelSphereConfig()) return jsonError("ยังไม่ได้ตั้งค่า KKU IntelSphere กรุณาเพิ่ม INTELSPHERE_API_KEY ใน .env.local", 503, "AI_NOT_CONFIGURED");
  const supabase = getSupabaseAdmin();
  const { data: material } = await measureAiDatabase(trace, () => supabase.from("learning_materials").select("id,title,extracted_text,original_text").eq("id", input.data.materialId).eq("user_id", user.id).maybeSingle());
  if (!material) return jsonError("ไม่พบบทเรียนนี้ในบัญชีของคุณ", 404, "MATERIAL_NOT_FOUND");
  const sourceText = material.extracted_text || material.original_text;
  if (sourceText.trim().length < 240) return jsonError("บทเรียนนี้มีข้อความไม่พอสำหรับแผนภาพ เพิ่มเนื้อหาอย่างน้อย 240 ตัวอักษร", 422, "SOURCE_TOO_SHORT");
  const { data: job, error: jobError } = await measureAiDatabase(trace, () => supabase.from("ai_generation_jobs").insert({ user_id: user.id, material_id: material.id, job_type: "graph", status: "processing", model: env.INTELSPHERE_MODEL }).select("id").single());
  if (jobError || !job) {
    if (jobError?.code === "23505") return jsonError("กำลังสร้างแผนภาพจากบทเรียนนี้อยู่ กรุณารอสักครู่", 409, "GENERATION_IN_PROGRESS");
    return jsonError("เริ่มบันทึกสถานะงานไม่สำเร็จ", 503, "GENERATION_JOB_FAILED");
  }
  try {
    const generated = await generateGraph(material.title, sourceText, trace);
    const graphTitle = input.data.title || generated.graph.title;
    const { data: graphId, error } = await measureAiDatabase(trace, () => supabase.rpc("persist_generated_graph", { p_job_id: job.id, p_user_id: user.id, p_material_id: material.id, p_title: graphTitle, p_model: generated.model, p_graph: generated.graph }));
    if (error || !graphId) { trace.errorCategory = "persistence"; trace.sanitizedError = "graph_persist_failed"; throw new Error("Could not save the generated graph."); }
    await measureAiDatabase(trace, () => supabase.from("ai_generation_jobs").update({ input_tokens: generated.inputTokens, output_tokens: generated.outputTokens }).eq("id", job.id).eq("user_id", user.id));
    return jsonOk({ graph: { id: graphId, title: graphTitle, nodeCount: generated.graph.nodes.length, edgeCount: generated.graph.edges.length } }, 201);
  } catch (error) {
    trace.errorCategory ??= categorizeAiError(error);
    await measureAiDatabase(trace, () => supabase.from("ai_generation_jobs").update({ status: "failed", completed_at: new Date().toISOString(), error_category: trace.errorCategory, error_message: trace.sanitizedError ?? trace.errorCategory }).eq("id", job.id).eq("user_id", user.id));
    return jsonError(trace.errorCategory === "truncated" ? "ผลลัพธ์แผนภาพถูกตัดก่อนเสร็จ กรุณาย่อบทเรียนแล้วลองอีกครั้ง" : "สร้างแผนภาพไม่สำเร็จ ระบบไม่บันทึกข้อมูลที่ตรวจสอบไม่ผ่าน", 502, trace.errorCategory === "truncated" ? "AI_OUTPUT_TRUNCATED" : "GRAPH_GENERATION_FAILED");
  }
}
