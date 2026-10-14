import { z } from "zod";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ durationSeconds: z.number().int().min(0).max(86_400).default(0) });

export async function POST(request: Request, { params }: Context) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบก่อนส่งแบบทดสอบ", 401, "UNAUTHENTICATED");
  const input = schema.safeParse(await readJson(request));
  if (!input.success) return jsonError("ระยะเวลาการทำแบบทดสอบไม่ถูกต้อง", 400, "INVALID_DURATION");
  const { id } = await params;
  const { data, error } = await getSupabaseAdmin().rpc("submit_quiz_attempt", { p_attempt_id: id, p_user_id: user.id, p_duration_seconds: input.data.durationSeconds });
  if (error) {
    if (error.message.includes("attempt_not_found")) return jsonError("ไม่พบการทำแบบทดสอบนี้", 404, "ATTEMPT_NOT_FOUND");
    if (error.message.includes("attempt_not_active")) return jsonError("แบบทดสอบนี้ส่งคำตอบแล้ว", 409, "ATTEMPT_COMPLETED");
    return jsonError("คำนวณผลแบบทดสอบไม่สำเร็จ", 503, "SCORING_FAILED");
  }
  return jsonOk({ result: data });
}
