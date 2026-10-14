import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { env, hasIntelSphereConfig } from "@/lib/env";
import { generateQuiz } from "@/lib/ai/quiz-generation";
import { categorizeAiError, measureAiDatabase, withAiRequestTelemetry, type AiRequestTrace } from "@/lib/ai/telemetry";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  materialId: z.string().uuid(),
  title: z.string().trim().min(2).max(140).optional(),
  questionCount: z.number().int().min(5).max(20),
  difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  questionType: z.enum(["multiple_choice", "true_false", "mixed"]),
  coverage: z.enum(["entire_material", "selected_node", "weak_topics_only"]).default("entire_material"),
  graphNodeId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  return withAiRequestTelemetry(request, "quiz", env.INTELSPHERE_MODEL, trace => handlePost(request, trace));
}

async function handlePost(request: Request, trace: AiRequestTrace) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await measureAiDatabase(trace, () => getCurrentUser());
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนสร้างแบบทดสอบ", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("ตรวจสอบจำนวนข้อ ระดับ และประเภทคำถามอีกครั้ง", 400, "INVALID_INPUT");
  if (!hasIntelSphereConfig()) return jsonError("ยังไม่ได้ตั้งค่า KKU IntelSphere กรุณาเพิ่ม INTELSPHERE_API_KEY ใน .env.local", 503, "AI_NOT_CONFIGURED");

  const supabase = getSupabaseAdmin();
  const { data: material, error: materialError } = await measureAiDatabase(trace, () => supabase.from("learning_materials").select("id,title,extracted_text,original_text").eq("id", input.data.materialId).eq("user_id", user.id).maybeSingle());
  if (materialError) return jsonError("โหลดบทเรียนไม่สำเร็จ", 503, "MATERIAL_UNAVAILABLE");
  if (!material) return jsonError("ไม่พบบทเรียนนี้ในบัญชีของคุณ", 404, "MATERIAL_NOT_FOUND");
  const sourceText = material.extracted_text || material.original_text;
  if (sourceText.trim().length < 120) return jsonError("บทเรียนนี้มีข้อความไม่พอสำหรับสร้างแบบทดสอบ เพิ่มเนื้อหาอย่างน้อย 120 ตัวอักษร", 422, "SOURCE_TOO_SHORT");

  let graphNodeId: string | null = null;
  let focus: string[] = [];
  if (input.data.coverage === "selected_node") {
    if (!input.data.graphNodeId) return jsonError("เลือกแนวคิดจากแผนภาพก่อนสร้างแบบทดสอบเฉพาะเรื่อง", 400, "GRAPH_NODE_REQUIRED");
    const { data: node } = await measureAiDatabase(trace, () => supabase.from("graph_nodes").select("id,graph_id,title,description").eq("id", input.data.graphNodeId).maybeSingle());
    if (!node) return jsonError("ไม่พบแนวคิดนี้", 404, "GRAPH_NODE_NOT_FOUND");
    const { data: graph } = await measureAiDatabase(trace, () => supabase.from("knowledge_graphs").select("id").eq("id", node.graph_id).eq("user_id", user.id).eq("material_id", material.id).maybeSingle());
    if (!graph) return jsonError("ไม่พบแผนภาพนี้ในบัญชีของคุณ", 404, "GRAPH_NOT_FOUND");
    graphNodeId = node.id;
    focus = [node.title, node.description].filter(Boolean);
  } else if (input.data.coverage === "weak_topics_only") {
    const { data: weakTopics, error } = await measureAiDatabase(trace, () => supabase.from("topic_mastery").select("concept_key").eq("user_id", user.id).eq("material_id", material.id).lt("mastery_score", 70).order("mastery_score", { ascending: true }).limit(8));
    if (error) return jsonError("โหลดหัวข้อที่ควรทบทวนไม่สำเร็จ", 503, "MASTERY_UNAVAILABLE");
    focus = (weakTopics ?? []).map(topic => topic.concept_key);
    if (!focus.length) return jsonError("ยังไม่มีข้อมูลหัวข้อที่ควรทบทวน ลองทำแบบทดสอบจากบทเรียนก่อน", 422, "NO_WEAK_TOPICS");
  }

  const { data: job, error: jobError } = await measureAiDatabase(trace, () => supabase.from("ai_generation_jobs").insert({ user_id: user.id, material_id: material.id, job_type: "quiz", status: "processing", model: env.INTELSPHERE_MODEL }).select("id").single());
  if (jobError || !job) {
    if (jobError?.code === "23505") return jsonError("กำลังสร้างแบบทดสอบจากบทเรียนนี้อยู่ กรุณารอสักครู่", 409, "GENERATION_IN_PROGRESS");
    return jsonError("เริ่มบันทึกสถานะการสร้างแบบทดสอบไม่สำเร็จ", 503, "GENERATION_JOB_FAILED");
  }

  try {
    const generated = await generateQuiz({ count: input.data.questionCount, difficulty: input.data.difficulty, questionType: input.data.questionType, materialTitle: material.title, sourceText, focus }, trace);
    const title = input.data.title || `${material.title} · ทบทวนความเข้าใจ`;
    const description = input.data.coverage === "weak_topics_only" ? "แบบทดสอบเน้นหัวข้อที่ควรทบทวน" : graphNodeId ? `แบบทดสอบเน้นแนวคิด ${focus[0]}` : "แบบทดสอบที่สร้างจากเนื้อหาบทเรียนของคุณ";
    const { data: saved, error: saveError } = await measureAiDatabase(trace, () => supabase.rpc("persist_generated_quiz", {
      p_job_id: job.id, p_user_id: user.id, p_material_id: material.id, p_graph_node_id: graphNodeId,
      p_title: title, p_description: description, p_difficulty: input.data.difficulty,
      p_quiz_type: input.data.questionType, p_model: generated.model, p_questions: generated.questions,
      p_input_tokens: generated.inputTokens, p_output_tokens: generated.outputTokens,
    }));
    if (saveError || !Array.isArray(saved) || !saved[0]) { trace.errorCategory = "persistence"; trace.sanitizedError = "quiz_persist_failed"; throw new Error("Could not save the generated quiz."); }
    const quiz = { id: saved[0].quiz_id, title, questionCount: saved[0].question_count };
    const warning = generated.questions.length < input.data.questionCount
      ? `เนื้อหาต้นทางรองรับ ${generated.questions.length} ข้อจาก ${input.data.questionCount} ข้อที่ขอ ระบบบันทึกเฉพาะคำถามที่ผ่านการตรวจสอบ`
      : generated.rejectedCount ? `ระบบคัดคำถามที่ไม่ผ่านการตรวจสอบออก ${generated.rejectedCount} ข้อ` : null;
    return jsonOk({ quiz, warning }, 201);
  } catch (error) {
    trace.errorCategory ??= categorizeAiError(error);
    await measureAiDatabase(trace, () => supabase.from("ai_generation_jobs").update({ status: "failed", completed_at: new Date().toISOString(), error_category: trace.errorCategory, error_message: trace.sanitizedError ?? trace.errorCategory }).eq("id", job.id).eq("user_id", user.id));
    const message = error instanceof Error ? error.message : "Quiz generation failed.";
    const status = /not configured/i.test(message) ? 503 : trace.errorCategory === "timeout" ? 504 : 502;
    return jsonError(status === 503 ? "ยังไม่ได้ตั้งค่า KKU IntelSphere" : status === 504 ? "IntelSphere ใช้เวลาตอบกลับนานเกินกำหนด โปรดลองอีกครั้ง" : "สร้างแบบทดสอบไม่สำเร็จ ระบบไม่บันทึกคำถามที่ตรวจสอบไม่ผ่าน", status, status === 504 ? "AI_UPSTREAM_TIMEOUT" : "QUIZ_GENERATION_FAILED");
  }
}
