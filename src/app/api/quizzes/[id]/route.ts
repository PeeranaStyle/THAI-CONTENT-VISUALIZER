import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบเพื่อเปิดแบบทดสอบ", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: quiz, error } = await supabase.from("quizzes").select("id,title,description,difficulty,quiz_type,question_count,status,created_at,material_id,graph_node_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return jsonError("โหลดแบบทดสอบไม่สำเร็จ", 503, "QUIZ_UNAVAILABLE");
  if (!quiz) return jsonError("ไม่พบบแบบทดสอบนี้", 404, "QUIZ_NOT_FOUND");
  const { data: questions, error: questionsError } = await supabase.from("quiz_questions").select("id,question_text,question_type,options,difficulty,concept_keys,position").eq("quiz_id", id).order("position", { ascending: true });
  if (questionsError) return jsonError("โหลดคำถามไม่สำเร็จ", 503, "QUESTIONS_UNAVAILABLE");
  return jsonOk({ quiz, questions: questions ?? [] });
}
