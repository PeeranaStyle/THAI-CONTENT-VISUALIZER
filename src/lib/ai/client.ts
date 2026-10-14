import "server-only";
import OpenAI from "openai";
import { env, hasIntelSphereConfig } from "@/lib/env";

let client: OpenAI | undefined;

export function getIntelSphereClient(): OpenAI {
  if (!hasIntelSphereConfig()) throw new Error("KKU IntelSphere is not configured. Set INTELSPHERE_BASE_URL and INTELSPHERE_API_KEY.");
  client ??= new OpenAI({ baseURL: env.INTELSPHERE_BASE_URL, apiKey: env.INTELSPHERE_API_KEY!, timeout: 45_000, maxRetries: 0 });
  return client;
}

function retryable(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false;
  return error.status === undefined || error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
}

export async function withAiRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); }
    catch (error) {
      if (attempt >= 1 || !retryable(error)) throw error;
      await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
}
