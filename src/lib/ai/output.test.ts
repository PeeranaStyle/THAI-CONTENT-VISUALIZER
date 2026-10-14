import { describe, expect, it } from "vitest";
import { AiOutputError, extractCompletionText, parseCompletionJson } from "@/lib/ai/output";

describe("IntelSphere completion output", () => {
  it("parses plain JSON and fenced JSON", () => {
    expect(parseCompletionJson('{"ok":true}')).toEqual({ ok: true });
    expect(parseCompletionJson('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it("joins provider text blocks", () => {
    expect(extractCompletionText([{ type: "text", text: '{"ok":' }, { type: "text", text: "true}" }])).toBe('{"ok":\ntrue}');
  });

  it("classifies absent text and malformed JSON as parsing errors", () => {
    expect(() => parseCompletionJson([{ type: "image" }])).toThrowError(AiOutputError);
    expect(() => parseCompletionJson("not json")).toThrowError(/valid JSON/);
  });
});
