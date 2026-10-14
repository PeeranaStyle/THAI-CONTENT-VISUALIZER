import { hash } from "argon2";
import { z } from "zod";
import { env, hasSupabaseConfig } from "@/lib/env";
import { jsonError, jsonOk, readJson } from "@/lib/api";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { hashSessionToken, isSameOrigin, SESSION_DURATION_SECONDS } from "@/lib/auth/security";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  displayName: z.string().trim().min(1).max(80),
  password: z.string().min(12).max(128),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย กรุณาโหลดหน้าเว็บใหม่", 403, "ORIGIN_REJECTED");
  if (!hasSupabaseConfig() || !env.SESSION_SECRET) return jsonError("ระบบยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแลระบบ", 503, "SERVICE_NOT_CONFIGURED");
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("กรุณาตรวจสอบชื่อผู้ใช้ รหัสผ่าน และชื่อที่แสดง", 400, "INVALID_INPUT");

  try {
    if (!(await consumeRateLimit(request, "register", 3, 900))) return jsonError("มีคำขอสมัครบัญชีมากเกินไป กรุณาลองใหม่ภายหลัง", 429, "RATE_LIMITED");
    const username = parsed.data.username.toLowerCase();
    const passwordHash = await hash(parsed.data.password, { type: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
    const { data, error } = await getSupabaseAdmin().rpc("register_user_with_session", {
      p_username: username,
      p_password_hash: passwordHash,
      p_display_name: parsed.data.displayName,
      p_token_hash: hashSessionToken(token),
      p_expires_at: expiresAt,
    });
    if (error?.code === "23505") return jsonError("ไม่สามารถใช้ชื่อผู้ใช้นี้ได้ กรุณาเลือกชื่ออื่น", 409, "USERNAME_UNAVAILABLE");
    if (error || !Array.isArray(data) || !data[0]) throw new Error("Registration transaction failed");
    await setSessionCookie(token);
    return jsonOk({ user: { username: data[0].username, displayName: data[0].display_name } }, 201);
  } catch {
    return jsonError("ไม่สามารถสร้างบัญชีได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง", 503, "REGISTRATION_UNAVAILABLE");
  }
}
