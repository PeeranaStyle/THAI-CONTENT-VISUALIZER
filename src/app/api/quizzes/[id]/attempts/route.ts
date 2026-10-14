import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ mode: z.enum(["practice", "exam"]) });

export async function POST(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนเริ่มทำแบบทดสอบ", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("เลือกโหมดการทำแบบทดสอบก่อนเริ่ม", 400, "INVALID_MODE");
  const { id: quizId } = await params;
  const supabase = getSupabaseAdmin();
  const { data: quiz } = await supabase.from("quizzes").select("id,question_count,status").eq("id", quizId).eq("user_id", user.id).maybeSingle();
  if (!quiz) return jsonError("ไม่พบบแบบทดสอบนี้", 404, "QUIZ_NOT_FOUND");
  if (quiz.status !== "ready" || quiz.question_count < 1) return jsonError("แบบทดสอบนี้ยังไม่พร้อมใช้งาน", 409, "QUIZ_NOT_READY");
  const { data: activeAttempt } = await supabase.from("quiz_attempts").select("id,mode,started_at,total_questions")
    .eq("quiz_id", quizId).eq("user_id", user.id).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (activeAttempt) return jsonOk({ attemptId: activeAttempt.id, mode: activeAttempt.mode, resumed: true });
  const { data: attempt, error } = await supabase.from("quiz_attempts").insert({
    quiz_id: quizId, user_id: user.id, total_questions: quiz.question_count, mode: input.data.mode,
  }).select("id,mode,started_at").single();
  if (error || !attempt) return jsonError("เริ่มทำแบบทดสอบไม่สำเร็จ", 503, "ATTEMPT_START_FAILED");
  const { error: activityError } = await supabase.from("learning_activity").insert({ user_id: user.id, activity_type: "quiz_started", reference_id: attempt.id, metadata: { quizId } });
  if (activityError) {
    await supabase.from("quiz_attempts").delete().eq("id", attempt.id).eq("user_id", user.id);
    return jsonError("บันทึกการเริ่มทำแบบทดสอบไม่สำเร็จ", 503, "ATTEMPT_START_FAILED");
  }
  return jsonOk({ attemptId: attempt.id, mode: attempt.mode, resumed: false }, 201);
}
