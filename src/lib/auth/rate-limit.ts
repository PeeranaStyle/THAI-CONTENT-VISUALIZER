import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimitKey, safeAddress } from "./security";

export async function consumeRateLimit(request: Request, scope: string, maximum: number, windowSeconds: number) {
  const key = rateLimitKey(scope, safeAddress(request));
  const { data, error } = await getSupabaseAdmin().rpc("consume_auth_rate_limit", {
    p_key: key,
    p_max: maximum,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Could not verify the request rate limit.");
  return data === true;
}
