import OpenAI from "openai";
import { describe, expect, it } from "vitest";

describe("IntelSphere OpenAI SDK request serialization", () => {
  it.each([1024, 4096, 8192])("transmits max_tokens=%i and captures quota metadata", async max_tokens => {
    let sent: Record<string, unknown> | undefined;
    const client = new OpenAI({
      apiKey: "unit-test-key",
      baseURL: "https://gen.ai.kku.ac.th/api/v1",
      fetch: async (_input, init) => {
        sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response(JSON.stringify({
          id: "test", object: "chat.completion", created: 0, model: "gemini-3.8-flash",
          choices: [{ index: 0, message: { role: "assistant", content: "{\\\"ok\\\":true}" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 8, total_tokens: 13 },
          model_quota: { daily_quota_tokens: 100, daily_usage_tokens: 13, daily_remaining_tokens: 87 },
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });
    const result = await client.chat.completions.create({
      model: "gemini-3.8-flash",
      messages: [{ role: "user", content: "Return one JSON object with a count sized for this output budget." }],
      temperature: 0.2,
      max_tokens,
    });
    expect(sent).toMatchObject({ model: "gemini-3.8-flash", temperature: 0.2, max_tokens });
    expect(result.choices[0]?.finish_reason).toBe("stop");
    expect(result.usage?.completion_tokens).toBe(8);
    expect((result as typeof result & { model_quota?: { daily_remaining_tokens: number } }).model_quota?.daily_remaining_tokens).toBe(87);
  });
});
