import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { QuizResults } from "@/components/quiz-results";

type Props = { params: Promise<{ attemptId: string }> };

export const metadata: Metadata = { title: "Assessment Results" };

export default async function QuizResultsPage({ params }: Props) {
  const user = await getCurrentUser();
  const { attemptId } = await params;
  if (!user) notFound();
  const supabase = getSupabaseAdmin();
  const { data: attempt, error } = await supabase.from("quiz_attempts").select("id,quiz_id,score,total_questions,accuracy,duration_seconds,completed_at,status").eq("id", attemptId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load quiz results.");
  if (!attempt) notFound();
  if (attempt.status !== "completed") redirect(`/quiz/${attempt.quiz_id}/attempt/${attempt.id}`);
  const [quizResult, questionResult, answerResult] = await Promise.all([
    supabase.from("quizzes").select("id,title,material_id,graph_node_id").eq("id", attempt.quiz_id).eq("user_id", user.id).maybeSingle(),
    supabase.from("quiz_questions").select("id,question_text,question_type,options,correct_answer,explanation,difficulty,concept_keys,source_references,position").eq("quiz_id", attempt.quiz_id).order("position", { ascending: true }),
    supabase.from("quiz_answers").select("question_id,selected_answer,is_correct,time_spent_seconds").eq("attempt_id", attemptId),
  ]);
  if (quizResult.error || questionResult.error || answerResult.error || !quizResult.data) throw new Error("Could not load quiz review.");
  const answers = new Map((answerResult.data ?? []).map(answer => [answer.question_id, answer]));
  const questions = (questionResult.data ?? []).map(question => ({ ...question, answer: answers.get(question.id) ?? null }));
  const { data: mastery, error: masteryError } = await supabase.from("topic_mastery").select("concept_key,mastery_score,correct_count,incorrect_count").eq("user_id", user.id).eq("material_id", quizResult.data.material_id);
  if (masteryError) throw new Error("Could not load topic mastery.");
  const relatedMastery = (mastery ?? []).filter((row: { concept_key: string }) => questions.some(question => (question.concept_keys as string[]).includes(row.concept_key)));
  return <QuizResults attempt={attempt} quiz={quizResult.data} questions={questions} mastery={relatedMastery} />;
}
