import { jsonError, jsonOk } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("กรุณาเข้าสู่ระบบเพื่อใช้งาน", 401, "UNAUTHENTICATED");
  return jsonOk({ user });
}
