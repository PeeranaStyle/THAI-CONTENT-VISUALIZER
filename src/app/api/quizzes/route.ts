import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบเพื่อดูแบบทดสอบ", 401, "UNAUTHENTICATED");
  const { data, error } = await getSupabaseAdmin().from("quizzes").select("id,title,description,difficulty,quiz_type,question_count,status,created_at,material_id").eq("user_id", user.id).order("created_at", { ascending: false });
  if (error) return jsonError("โหลดแบบทดสอบไม่สำเร็จ", 503, "QUIZZES_UNAVAILABLE");
  return jsonOk({ quizzes: data ?? [] });
}
