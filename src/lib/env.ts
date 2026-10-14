import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalString = z.string().optional().or(z.literal(""));

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  INTELSPHERE_BASE_URL: optionalUrl,
  INTELSPHERE_API_KEY: optionalString,
  INTELSPHERE_MODEL: z.string().default("gemini-2.5-flash-lite"),
  SESSION_SECRET: optionalString,
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25_000_000),
});

export const env = schema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  INTELSPHERE_BASE_URL: process.env.INTELSPHERE_BASE_URL ?? "https://gen.ai.kku.ac.th/api/v1",
  INTELSPHERE_API_KEY: process.env.INTELSPHERE_API_KEY,
  INTELSPHERE_MODEL: process.env.INTELSPHERE_MODEL ?? "gemini-2.5-flash-lite",
  SESSION_SECRET: process.env.SESSION_SECRET,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES ?? "25000000",
});

export function hasSupabaseConfig(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasIntelSphereConfig(): boolean {
  return Boolean(env.INTELSPHERE_BASE_URL && env.INTELSPHERE_API_KEY);
}

export function missingCoreConfig(): string[] {
  return [
    !env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    !env.SESSION_SECRET && "SESSION_SECRET",
  ].filter((value): value is string => Boolean(value));
}
