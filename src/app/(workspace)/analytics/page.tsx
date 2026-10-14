import { BarChart3, BookOpenCheck, Flame, Target, type LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { relationOne } from "@/lib/relations";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const db = getSupabaseAdmin();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
  const [{ data: attempts, error: attemptsError }, { data: mastery, error: masteryError }, { data: activities, error: activityError }] = await Promise.all([
    db.from("quiz_attempts").select("accuracy").eq("user_id", user!.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(50),
    db.from("topic_mastery").select("concept_key,mastery_score,correct_count,incorrect_count,learning_materials(title)").eq("user_id", user!.id).order("mastery_score", { ascending: true }).limit(12),
    db.from("learning_activity").select("created_at").eq("user_id", user!.id).gte("created_at", cutoff.toISOString()),
  ]);
  if (attemptsError || masteryError || activityError) throw new Error("Could not load analytics.");
  const scores = attempts ?? [];
  const average = scores.length ? Math.round(scores.reduce((sum, row) => sum + Number(row.accuracy ?? 0), 0) / scores.length) : 0;
  const metrics: { Icon: LucideIcon; value: string; label: string }[] = [
    { Icon: Target, value: `${average}%`, label: "ความแม่นยำเฉลี่ย" },
    { Icon: BookOpenCheck, value: `${scores.length}`, label: "แบบทดสอบที่เสร็จแล้ว" },
    { Icon: Flame, value: `${activities?.length ?? 0}`, label: "กิจกรรมใน 7 วันที่ผ่านมา" },
  ];
  const days = new Map<string, number>();
  for (let i = 6; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); days.set(date.toISOString().slice(0, 10), 0); }
  for (const activity of activities ?? []) { const day = new Date(activity.created_at).toISOString().slice(0, 10); days.set(day, (days.get(day) ?? 0) + 1); }
  return <div className="mx-auto max-w-[1100px]"><p className="eyebrow">YOUR LEARNING DATA</p><h2 className="page-title mt-1">พัฒนาการของฉัน</h2><p className="mt-2 text-sm text-[var(--text-soft)]">สถิติจากแบบทดสอบและกิจกรรมที่บันทึกในบัญชีของคุณ</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{metrics.map(({ Icon, value, label }) => <div key={label} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><Icon className="size-5 text-[var(--signal)]"/><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-[var(--text-soft)]">{label}</p></div>)}</div>
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><h3 className="font-semibold">กิจกรรมรายวัน · 7 วัน</h3><div className="mt-5 grid grid-cols-7 items-end gap-2">{[...days].map(([day, count]) => <div key={day} className="text-center"><div className="mx-auto flex h-28 w-full max-w-12 items-end rounded-lg bg-[var(--mist)]"><div className="w-full rounded-lg bg-[var(--signal)]" style={{ height: `${count ? Math.min(100, Math.max(12, count * 18)) : 3}%` }} title={`${count} กิจกรรม`}/></div><p className="mt-2 text-[10px] text-[var(--text-soft)]">{new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(new Date(day))}</p></div>)}</div></section>
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><div className="flex items-center gap-2"><BarChart3 className="size-4 text-[var(--signal)]"/><h3 className="font-semibold">หัวข้อที่ควรทบทวน</h3></div>{mastery?.length ? <div className="mt-4 space-y-4">{mastery.map((row) => <div key={row.concept_key}><div className="flex justify-between gap-3 text-xs"><span className="font-medium">{row.concept_key}</span><span>{Math.round(Number(row.mastery_score))}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--mist)]"><div className="h-full rounded-full bg-[var(--leaf)]" style={{ width: `${row.mastery_score}%` }}/></div><p className="mt-1 text-[10px] text-[var(--text-soft)]">{relationOne(row.learning_materials)?.title} · ถูก {row.correct_count} / ทบทวนผิด {row.incorrect_count}</p></div>)}</div> : <p className="mt-3 text-sm text-[var(--text-soft)]">ทำแบบทดสอบเพื่อเริ่มเก็บข้อมูลความเข้าใจรายหัวข้อ</p>}</section>
  </div>;
}
