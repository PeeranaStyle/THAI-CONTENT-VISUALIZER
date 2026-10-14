import { jsonOk } from "@/lib/api";
import { isSameOrigin } from "@/lib/auth/security";
import { revokeCurrentSession } from "@/lib/auth/session";
import { jsonError } from "@/lib/api";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("คำขอนี้ไม่ปลอดภัย", 403, "ORIGIN_REJECTED");
  await revokeCurrentSession();
  return jsonOk({ success: true });
}
