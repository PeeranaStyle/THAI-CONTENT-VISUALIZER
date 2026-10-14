import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบเพื่อทำแบบทดสอบ", 401, "UNAUTHENTICATED");
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase.from("quiz_attempts").select("id,quiz_id,started_at,total_questions,duration_seconds,mode,status")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (error) return jsonError("โหลดแบบทดสอบไม่สำเร็จ", 503, "ATTEMPT_UNAVAILABLE");
  if (!attempt) return jsonError("ไม่พบการทำแบบทดสอบนี้", 404, "ATTEMPT_NOT_FOUND");
  if (attempt.status !== "in_progress") return jsonError("แบบทดสอบนี้ทำเสร็จแล้ว", 409, "ATTEMPT_COMPLETED");
  const { data: quiz, error: quizError } = await supabase.from("quizzes").select("id,title,description,quiz_type,difficulty")
    .eq("id", attempt.quiz_id).eq("user_id", user.id).maybeSingle();
  if (quizError || !quiz) return jsonError("โหลดรายละเอียดแบบทดสอบไม่สำเร็จ", 503, "QUIZ_UNAVAILABLE");
  const [questionResult, answerResult] = await Promise.all([
    supabase.from("quiz_questions").select("id,question_text,question_type,options,difficulty,concept_keys,position,correct_answer,explanation").eq("quiz_id", attempt.quiz_id).order("position", { ascending: true }),
    supabase.from("quiz_answers").select("question_id,selected_answer,is_correct").eq("attempt_id", id),
  ]);
  if (questionResult.error || answerResult.error) return jsonError("โหลดคำถามไม่สำเร็จ", 503, "QUESTIONS_UNAVAILABLE");
  const saved = new Map((answerResult.data ?? []).map(answer => [answer.question_id, answer]));
  const questions = (questionResult.data ?? []).map(question => {
    const answer = saved.get(question.id);
    return {
      id: question.id, questionText: question.question_text, questionType: question.question_type,
      options: question.options, difficulty: question.difficulty, conceptKeys: question.concept_keys,
      position: question.position,
      selectedAnswer: answer?.selected_answer ?? null,
      ...(attempt.mode === "practice" && answer ? { feedback: { isCorrect: answer.is_correct, correctAnswer: question.correct_answer, explanation: question.explanation } } : {}),
    };
  });
  return jsonOk({ attempt, quiz, questions });
}
