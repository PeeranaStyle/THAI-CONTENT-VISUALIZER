export type AiOutputErrorCategory = "parsing" | "timeout" | "truncated" | "validation";

export class AiOutputError extends Error {
  constructor(
    readonly category: AiOutputErrorCategory,
    message: string,
    readonly diagnostic?: string,
    readonly details?: Record<string, number>,
  ) {
    super(message);
    this.name = "AiOutputError";
  }
}

export function extractCompletionText(content: unknown): string {
  if (typeof content === "string") return cleanJsonFences(content);
  if (Array.isArray(content)) {
    const parts = content.flatMap(block => {
      if (typeof block !== "object" || block === null) return [];
      const item = block as { type?: unknown; text?: unknown };
      return item.type === "text" && typeof item.text === "string" ? [item.text] : [];
    });
    if (parts.length) return cleanJsonFences(parts.join("\n"));
  }
  throw new AiOutputError("parsing", "AI response did not contain text.", Array.isArray(content) ? "content_blocks_without_text" : "missing_text");
}

export function parseCompletionJson(content: unknown): unknown {
  const text = extractCompletionText(content).trim();
  if (!text) throw new AiOutputError("parsing", "AI response was empty.", "empty_text");
  try {
    return JSON.parse(text);
  } catch {
    throw new AiOutputError("parsing", "AI response was not valid JSON.", `invalid_json_length_${text.length}`);
  }
}

function cleanJsonFences(value: string): string {
  return value.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1").trim();
}
