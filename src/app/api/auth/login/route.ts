import { verify } from "argon2";
import { z } from "zod";
import { env, hasSupabaseConfig } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { establishSession } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(1).max(128) });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย กรุณาโหลดหน้าเว็บใหม่", 403, "ORIGIN_REJECTED");
  if (!hasSupabaseConfig() || !env.SESSION_SECRET) return jsonError("ระบบยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ", 503, "SERVICE_NOT_CONFIGURED");
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401, "INVALID_CREDENTIALS");
  try {
    if (!(await consumeRateLimit(request, "login", 8, 900))) return jsonError("เข้าสู่ระบบไม่สำเร็จหลายครั้ง กรุณารอสักครู่แล้วลองใหม่", 429, "RATE_LIMITED");
    const { data: user } = await getSupabaseAdmin().from("users")
      .select("id,username,display_name,password_hash")
      .eq("username", parsed.data.username.toLowerCase())
      .maybeSingle();
    const valid = user ? await verify(user.password_hash, parsed.data.password).catch(() => false) : false;
    if (!user || !valid) return jsonError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401, "INVALID_CREDENTIALS");
    await establishSession(user.id);
    return jsonOk({ user: { username: user.username, displayName: user.display_name } });
  } catch {
    return jsonError("ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง", 503, "LOGIN_UNAVAILABLE");
  }
}
