"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, CircleHelp, Clock3, LoaderCircle, X } from "lucide-react";

type Option = { id: string; text: string };
type Feedback = { isCorrect: boolean; correctAnswer: string | boolean; explanation: string };
type Question = { id: string; questionText: string; questionType: "multiple_choice" | "true_false"; options: Option[]; difficulty: string; conceptKeys: string[]; position: number; selectedAnswer: string | boolean | null; feedback?: Feedback };
type AttemptData = { attempt: { id: string; quiz_id: string; started_at: string; total_questions: number; mode: "practice" | "exam"; status: string }; quiz: { id: string; title: string; description: string }; questions: Question[] };

export function QuizPlayer({ quizId, attemptId }: { quizId: string; attemptId: string }) {
  const router = useRouter();
  const [data, setData] = useState<AttemptData | null>(null);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const questionStartedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attempts/${attemptId}`).then(async response => {
      const result = await response.json();
      if (response.status === 409) { router.replace(`/quiz/results/${attemptId}`); return; }
      if (!response.ok) throw new Error(result?.error?.message ?? "เนเธซเธฅเธ”เนเธเธเธ—เธ”เธชเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ");
      if (!cancelled) setData(result);
    }).catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : "เนเธซเธฅเธ”เนเธเธเธ—เธ”เธชเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attemptId, router]);

  const question = data?.questions[index];
  const answeredCount = useMemo(() => data?.questions.filter(item => item.selectedAnswer !== null).length ?? 0, [data]);

  const selectAnswer = useCallback(async (selectedAnswer: string | boolean) => {
    if (!data || !question || pending) return;
    setPending(true); setError("");
    const timeSpentSeconds = Math.max(0, Math.floor((Date.now() - questionStartedAt.current) / 1000));
    try {
      const response = await fetch(`/api/attempts/${attemptId}/answers`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, selectedAnswer, timeSpentSeconds }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "เธเธฑเธเธ—เธถเธเธเธณเธ•เธญเธเนเธกเนเธชเธณเน€เธฃเนเธ");
      setData(current => current ? { ...current, questions: current.questions.map(item => item.id === question.id ? { ...item, selectedAnswer, feedback: result.feedback ?? item.feedback } : item) } : current);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เธเธฑเธเธ—เธถเธเธเธณเธ•เธญเธเนเธกเนเธชเธณเน€เธฃเนเธ"); }
    finally { setPending(false); }
  }, [attemptId, data, pending, question]);

  function move(nextIndex: number) {
    if (!data) return;
    setIndex(Math.max(0, Math.min(data.questions.length - 1, nextIndex)));
    questionStartedAt.current = new Date().getTime();
  }

  async function submit() {
    if (!data || pending) return;
    const unanswered = data.questions.length - answeredCount;
    const confirmation = unanswered ? `เธขเธฑเธเนเธกเนเนเธ”เนเธ•เธญเธ ${unanswered} เธเนเธญ เธซเธฒเธเธชเนเธเธ•เธญเธเธเธตเน เธเนเธญเธ—เธตเนเน€เธงเนเธเนเธงเนเธเธฐเธเธฑเธเน€เธเนเธเธเธณเธ•เธญเธเธเธดเธ”` : "เธชเนเธเนเธเธเธ—เธ”เธชเธญเธเนเธฅเธฐเธเธณเธเธงเธ“เธเธฅเธ•เธญเธเธเธตเนเนเธเนเนเธซเธก?";
    if (!window.confirm(confirmation)) return;
    setPending(true); setError("");
    try {
      const durationSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(data.attempt.started_at)) / 1000));
      const response = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ durationSeconds }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error?.message ?? "เธชเนเธเนเธเธเธ—เธ”เธชเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ");
      router.push(`/quiz/results/${attemptId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "เธชเนเธเนเธเธเธ—เธ”เธชเธญเธเนเธกเนเธชเธณเน€เธฃเนเธ"); }
    finally { setPending(false); }
  }

  if (loading) return <div className="mx-auto grid min-h-[50vh] max-w-3xl place-items-center"><p className="inline-flex items-center gap-2 text-sm text-[var(--text-soft)]"><LoaderCircle className="size-4 animate-spin" />เธเธณเธฅเธฑเธเนเธซเธฅเธ”เนเธเธเธ—เธ”เธชเธญเธโ€ฆ</p></div>;
  if (error && !data) return <div className="mx-auto max-w-lg rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-6 text-center"><CircleHelp className="mx-auto size-7 text-[var(--signal)]" /><h2 className="mt-3 text-sm font-semibold text-[var(--ink)]">เน€เธเธดเธ”เนเธเธเธ—เธ”เธชเธญเธเนเธกเนเนเธ”เน</h2><p className="mt-2 text-xs text-[var(--text-soft)]">{error}</p><Link href={`/quiz/${quizId}`} className="mt-4 inline-flex min-h-9 items-center rounded-lg bg-[var(--ink)] px-3 text-xs font-semibold text-white">เธเธฅเธฑเธเนเธเธซเธเนเธฒเธเนเธญเธ</Link></div>;
  if (!data || !question) return null;

  const choiceLabel = (answer: string | boolean | null) => answer === null ? "" : typeof answer === "boolean" ? answer ? "เธเธฃเธดเธ" : "เนเธกเนเธเธฃเธดเธ" : question.options.find(option => option.id === answer)?.text ?? "";
  const progress = Math.round((answeredCount / data.questions.length) * 100);
  const difficultyLabel = question.difficulty === "easy" ? "เธเธทเนเธเธเธฒเธ" : question.difficulty === "hard" ? "เธ—เนเธฒเธ—เธฒเธข" : "เธเธฒเธเธเธฅเธฒเธ";

  return <div className="mx-auto max-w-[950px]">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/quiz/${quizId}`} onClick={event => { if (!window.confirm("เธญเธญเธเนเธเธเนเธญเธ? เธเธณเธ•เธญเธเธ—เธตเนเธเธฑเธเธ—เธถเธเนเธงเนเธเธฐเธขเธฑเธเธญเธขเธนเนเนเธฅเธฐเธเธฅเธฑเธเธกเธฒเธ—เธณเธ•เนเธญเนเธ”เน")) event.preventDefault(); }} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] font-medium text-[var(--text-soft)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />เธญเธญเธเธเธฒเธเนเธเธเธ—เธ”เธชเธญเธ</Link><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-soft)]"><Clock3 className="size-3.5" />เนเธซเธกเธ”{data.attempt.mode === "practice" ? "เธเธถเธ" : "เธชเธญเธ"}</span></div>
    <div className="mt-3 rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div className="min-w-0"><p className="eyebrow">{data.quiz.title}</p><h1 className="mt-1 truncate text-base font-semibold text-[var(--ink)] sm:text-lg">เธเนเธญเธ—เธตเน {index + 1} <span className="font-normal text-[var(--text-soft)]">เธเธฒเธ {data.questions.length}</span></h1></div><div className="text-right"><span className="text-[10px] text-[var(--text-soft)]">เธ•เธญเธเนเธฅเนเธง {answeredCount} เธเนเธญ</span><p className="text-[11px] font-semibold text-[var(--ink)]">{progress}%</p></div></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-muted)]"><div className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
      <div className="mt-6 flex items-center gap-2"><span className="rounded-full bg-[#eef2fc] px-2.5 py-1 text-[9px] font-semibold text-[var(--signal)]">{difficultyLabel}</span><span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[9px] font-medium text-[var(--text-soft)]">{question.questionType === "true_false" ? "เธเธฃเธดเธเธซเธฃเธทเธญเนเธกเนเธเธฃเธดเธ" : "เธเธฃเธเธฑเธข"}</span></div>
      <h2 className="mt-4 max-w-[760px] text-[clamp(1.15rem,3vw,1.6rem)] font-semibold leading-[1.65] tracking-[-.02em] text-[var(--ink)]">{question.questionText}</h2>
      <div role="group" aria-label="เธ•เธฑเธงเน€เธฅเธทเธญเธเธเธณเธ•เธญเธ" className="mt-6 grid gap-2.5">{question.options.map((option, optionIndex) => {
        const selected = question.selectedAnswer === option.id || (question.questionType === "true_false" && question.selectedAnswer === (option.id === "true"));
        const feedback = question.feedback;
        const isCorrect = feedback && feedback.correctAnswer === (question.questionType === "true_false" ? option.id === "true" : option.id);
        const isWrongSelected = feedback && selected && !feedback.isCorrect;
        return <button key={option.id} type="button" disabled={pending || Boolean(feedback)} aria-pressed={selected} onClick={() => selectAnswer(question.questionType === "true_false" ? option.id === "true" : option.id)} className={`group flex min-h-[58px] items-center gap-3 rounded-[16px] border px-3.5 py-3 text-left transition sm:px-4 ${selected ? "border-[var(--signal)] bg-[#f1f4fd]" : "border-[var(--line)] bg-[var(--surface)] hover:border-[#aac0d0] hover:bg-[var(--surface-muted)]"} ${isCorrect ? "border-[#8bb79a] bg-[#f0f7f1]" : ""} ${isWrongSelected ? "border-[#e3a598] bg-[#fff5f2]" : ""}`}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-[11px] text-[10px] font-semibold ${selected ? "bg-[var(--signal)] text-white" : "bg-[var(--surface-muted)] text-[var(--ink)]"} ${isCorrect ? "bg-[var(--success)] text-white" : ""} ${isWrongSelected ? "bg-[var(--danger)] text-white" : ""}`}>{isCorrect ? <Check className="size-4" /> : isWrongSelected ? <X className="size-4" /> : question.questionType === "true_false" ? option.id === "true" ? "เธเธฃเธดเธ" : "เนเธกเนเธเธฃเธดเธ" : String.fromCharCode(65 + optionIndex)}</span>
          <span className="min-w-0 flex-1 text-[12px] leading-[1.8] text-[var(--text)]">{option.text}</span>{pending && selected && <LoaderCircle className="size-4 animate-spin text-[var(--signal)]" />}
        </button>;
      })}</div>
      {question.feedback && <div role="status" className={`mt-4 rounded-[16px] border p-4 ${question.feedback.isCorrect ? "border-[#d6e7da] bg-[#f1f7f2]" : "border-[#efd5ce] bg-[#fff6f3]"}`}><p className={`flex items-center gap-2 text-[12px] font-semibold ${question.feedback.isCorrect ? "text-[var(--success)]" : "text-[var(--danger)]"}`}><CheckCircle2 className="size-4" />{question.feedback.isCorrect ? "เธ•เธญเธเนเธ”เนเธ–เธนเธเธ•เนเธญเธ" : `เธเธณเธ•เธญเธเธ—เธตเนเธ–เธนเธเธเธทเธญ ${choiceLabel(question.feedback.correctAnswer)}`}</p><p className="mt-1 text-[11px] leading-6 text-[var(--text-soft)]">{question.feedback.explanation}</p></div>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-[#f0d2cc] bg-[#fff5f2] p-3 text-[11px] text-[#98483d]">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4"><button type="button" disabled={index === 0 || pending} onClick={() => move(index - 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] px-4 text-[11px] font-semibold text-[var(--ink)] disabled:opacity-40"><ArrowLeft className="size-3.5" />เธเนเธญเธเธซเธเนเธฒ</button><div className="flex flex-1 justify-center gap-1.5">{data.questions.map((item, dotIndex) => <button key={item.id} type="button" onClick={() => move(dotIndex)} aria-label={`เนเธเธเนเธญเธ—เธตเน ${dotIndex + 1}`} aria-current={index === dotIndex ? "step" : undefined} className={`size-2.5 rounded-full transition ${index === dotIndex ? "scale-125 bg-[var(--signal)]" : item.selectedAnswer !== null ? "bg-[var(--leaf)]" : "bg-[var(--line)]"}`} />)}</div>{index < data.questions.length - 1 ? <button type="button" onClick={() => move(index + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ink)] px-4 text-[11px] font-semibold text-white">เธ–เธฑเธ”เนเธ <ArrowRight className="size-3.5" /></button> : <button type="button" disabled={pending} onClick={submit} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--signal)] px-4 text-[11px] font-semibold text-white disabled:opacity-60">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-3.5" />}เธชเนเธเธเธณเธ•เธญเธ</button>}</div>
    </div>
  </div>;
}
