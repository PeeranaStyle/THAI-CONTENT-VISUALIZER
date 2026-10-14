import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getDashboardData(userId: string) {
  const supabase = getSupabaseAdmin();
  const startedAt = performance.now();
  const [materialsResult, quizzesResult, attemptsResult, masteryResult, activitiesResult, summaryResult] = await Promise.all([
    supabase.from("learning_materials").select("id,title,description,source_type,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(4),
    supabase.from("quizzes").select("id,title,difficulty,question_count,status,created_at,material_id").eq("user_id", userId).eq("status", "ready").order("created_at", { ascending: false }).limit(4),
    supabase.from("quiz_attempts").select("id,score,total_questions,accuracy,completed_at,quiz_id").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(50),
    supabase.from("topic_mastery").select("concept_key,mastery_score,correct_count,incorrect_count,material_id").eq("user_id", userId).order("mastery_score", { ascending: true }).limit(5),
    supabase.from("learning_activity").select("id,activity_type,reference_id,created_at,metadata").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
    supabase.rpc("get_user_learning_summary", { p_user_id: userId }).single(),
  ]);
  console.info("[perf] dashboard.data", { durationMs: Math.round(performance.now() - startedAt), parallelQueries: 6 });
  if ([materialsResult, quizzesResult, attemptsResult, masteryResult, activitiesResult, summaryResult].some(result => result.error)) {
    throw new Error("Could not load your learning summary. Check the database migration and service configuration.");
  }
  const summary = summaryResult.data as { material_count: number; completed_quiz_count: number; total_correct: number; total_questions: number; graph_count: number; note_count: number; current_streak: number } | null;
  if (!summary) throw new Error("Could not calculate your learning summary.");
  const activities = activitiesResult.data ?? [];
  const attempts = attemptsResult.data ?? [];
  const activityRows = activities as { id: string; activity_type: string; reference_id: string | null; created_at: string; metadata: Record<string, unknown> }[];
  return {
    materials: materialsResult.data ?? [],
    quizzes: quizzesResult.data ?? [],
    attempts,
    mastery: masteryResult.data ?? [],
    activities: activityRows,
    materialCount: Number(summary.material_count),
    completedQuizCount: Number(summary.completed_quiz_count),
    averageAccuracy: Number(summary.total_questions) ? Math.round((Number(summary.total_correct) / Number(summary.total_questions)) * 10_000) / 100 : null,
    streak: Number(summary.current_streak),
    graphCount: Number(summary.graph_count),
    noteCount: Number(summary.note_count),
  };
}
