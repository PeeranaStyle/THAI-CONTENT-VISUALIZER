import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ questionId: z.string().uuid(), selectedAnswer: z.union([z.string().min(1).max(20), z.boolean()]), timeSpentSeconds: z.number().int().min(0).max(86_400).default(0) });

export async function PATCH(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนบันทึกคำตอบ", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("คำตอบไม่ถูกต้อง", 400, "INVALID_ANSWER");
  const { id: attemptId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: attempt } = await supabase.from("quiz_attempts").select("id,quiz_id,mode,status").eq("id", attemptId).eq("user_id", user.id).maybeSingle();
  if (!attempt) return jsonError("ไม่พบการทำแบบทดสอบนี้", 404, "ATTEMPT_NOT_FOUND");
  if (attempt.status !== "in_progress") return jsonError("แบบทดสอบนี้ส่งคำตอบแล้ว", 409, "ATTEMPT_COMPLETED");
  const { data: question } = await supabase.from("quiz_questions").select("id,question_type,options,correct_answer,explanation").eq("id", input.data.questionId).eq("quiz_id", attempt.quiz_id).maybeSingle();
  if (!question) return jsonError("ไม่พบคำถามนี้ในแบบทดสอบ", 404, "QUESTION_NOT_FOUND");
  if (question.question_type === "multiple_choice") {
    const ids = Array.isArray(question.options) ? question.options.map((option: { id?: string }) => option.id) : [];
    if (typeof input.data.selectedAnswer !== "string" || !ids.includes(input.data.selectedAnswer)) return jsonError("เลือกคำตอบจากตัวเลือกที่แสดง", 400, "ANSWER_OUT_OF_RANGE");
  } else if (typeof input.data.selectedAnswer !== "boolean") {
    return jsonError("เลือกว่าข้อความนี้จริงหรือไม่จริง", 400, "ANSWER_TYPE_INVALID");
  }
  const { error } = await supabase.from("quiz_answers").upsert({
    attempt_id: attemptId, question_id: question.id, selected_answer: input.data.selectedAnswer,
    is_correct: attempt.mode === "practice" ? question.correct_answer === input.data.selectedAnswer : null,
    time_spent_seconds: input.data.timeSpentSeconds, answered_at: new Date().toISOString(),
  }, { onConflict: "attempt_id,question_id" });
  if (error) return jsonError("บันทึกคำตอบไม่สำเร็จ", 503, "ANSWER_SAVE_FAILED");
  if (attempt.mode === "practice") return jsonOk({ saved: true, feedback: { isCorrect: question.correct_answer === input.data.selectedAnswer, correctAnswer: question.correct_answer, explanation: question.explanation } });
  return jsonOk({ saved: true });
}
