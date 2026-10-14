import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { QuizPlayer } from "@/components/quiz-player";

type Props = { params: Promise<{ id: string; attemptId: string }> };

export default async function QuizAttemptPage({ params }: Props) {
  const user = await getCurrentUser();
  const { id, attemptId } = await params;
  if (!user) notFound();
  const { data: attempt, error } = await getSupabaseAdmin().from("quiz_attempts").select("id,quiz_id,status").eq("id", attemptId).eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Could not load quiz attempt.");
  if (!attempt || attempt.quiz_id !== id) notFound();
  if (attempt.status === "completed") redirect(`/quiz/results/${attemptId}`);
  return <QuizPlayer quizId={id} attemptId={attemptId} />;
}
