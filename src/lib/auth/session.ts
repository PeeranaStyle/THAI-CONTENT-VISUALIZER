import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import { after } from "next/server";
import { cookies } from "next/headers";
import { env, hasSupabaseConfig } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "./security";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  role: "student" | "teacher" | "admin";
};

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function establishSession(userId: string, token = randomBytes(32).toString("base64url")) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();
  const { error } = await getSupabaseAdmin().rpc("create_user_session", {
    p_user_id: userId,
    p_token_hash: hashSessionToken(token),
    p_expires_at: expiresAt,
  });
  if (error) throw new Error("Could not create the application session.");
  await setSessionCookie(token);
}

const readCurrentUser = async (): Promise<CurrentUser | null> => {
  if (!hasSupabaseConfig() || !env.SESSION_SECRET) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const supabase = getSupabaseAdmin();
  const sessionLookupStartedAt = performance.now();
  const { data: session, error: sessionError } = await supabase
    .from("user_sessions")
    .select("id,expires_at,last_seen_at,user:users!user_sessions_user_id_fkey(id,username,display_name,avatar_path,role)")
    .eq("token_hash", hashSessionToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  console.info("[perf] auth.session_lookup", { durationMs: Math.round(performance.now() - sessionLookupStartedAt) });
  if (sessionError || !session) return null;

  const user = Array.isArray(session.user) ? session.user[0] : session.user;
  if (!user) return null;

  const expiresMs = Date.parse(session.expires_at);
  const now = Date.now();
  const lastSeenMs = Date.parse(session.last_seen_at);
  const lastSeenRefreshIntervalMs = 5 * 60 * 1000;
  if (expiresMs - now < SESSION_DURATION_SECONDS * 1000 / 2 && now - lastSeenMs >= lastSeenRefreshIntervalMs) {
    const refreshCutoff = new Date(now - lastSeenRefreshIntervalMs).toISOString();
    after(async () => {
      await supabase.from("user_sessions").update({ last_seen_at: new Date().toISOString() })
        .eq("id", session.id).lt("last_seen_at", refreshCutoff);
    });
  }
  return { id: user.id, username: user.username, displayName: user.display_name, avatarPath: user.avatar_path, role: user.role };
};

// React cache is scoped to the current server render, so layout and page checks
// share one lookup without sharing a user's identity across requests.
export const getCurrentUser = cache(readCurrentUser);

export async function revokeCurrentSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && hasSupabaseConfig()) {
    await getSupabaseAdmin().from("user_sessions").update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", hashSessionToken(token)).is("revoked_at", null);
  }
  jar.delete(SESSION_COOKIE);
}

export function missingAuthConfig(): string[] {
  return [!env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL", !env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY", !env.SESSION_SECRET && "SESSION_SECRET"]
    .filter((value): value is string => Boolean(value));
}
