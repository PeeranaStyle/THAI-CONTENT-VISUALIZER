import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "learnloom_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function rateLimitKey(scope: string, address: string): string {
  const secret = env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${scope}:${address}`).digest("hex");
}

export function safeAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    // Compare against the request's own host to support localhost aliases and previews.
    return new URL(origin).origin === new URL(request.url).origin;
  } catch { return false; }
}
