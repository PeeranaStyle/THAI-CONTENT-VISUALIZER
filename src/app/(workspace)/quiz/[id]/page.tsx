import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { QuizIntro } from "@/components/quiz-intro";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ partial?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: "แบบทดสอบ" };
  const { data } = await getSupabaseAdmin().from("quizzes").select("title").eq("id", id).eq("user_id", user.id).maybeSingle();
  return { title: data?.title ?? "แบบทดสอบ" };
}

export default async function QuizPage({ params, searchParams }: Props) {
  const [user, route, query] = await Promise.all([getCurrentUser(), params, searchParams]);
  if (!user) notFound();
  const supabase = getSupabaseAdmin();
  const { data: quiz } = await supabase.from("quizzes").select("id,title,description,difficulty,quiz_type,question_count,status").eq("id", route.id).eq("user_id", user.id).maybeSingle();
  if (!quiz) notFound();
  const { data: attempt } = await supabase.from("quiz_attempts").select("id,mode").eq("quiz_id", quiz.id).eq("user_id", user.id).eq("status", "in_progress").order("started_at", { ascending: false }).limit(1).maybeSingle();
  return <QuizIntro quizId={quiz.id} title={quiz.title} description={quiz.description} questionCount={quiz.question_count} difficulty={quiz.difficulty} quizType={quiz.quiz_type} activeAttempt={attempt ?? null} partial={query.partial === "1"} />;
}
