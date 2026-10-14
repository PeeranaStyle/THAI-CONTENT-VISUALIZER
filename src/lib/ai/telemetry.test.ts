import OpenAI from "openai";
import { describe, expect, it } from "vitest";
import { categorizeAiError } from "@/lib/ai/telemetry";

describe("AI error classification", () => {
  it("classifies the SDK's explicit connection timeout as timeout, not upstream", () => {
    expect(categorizeAiError(new OpenAI.APIConnectionTimeoutError())).toBe("timeout");
  });

  it("keeps connection failures without an HTTP response in the upstream category", () => {
    expect(categorizeAiError(new OpenAI.APIConnectionError({ message: "Connection failed." }))).toBe("upstream");
  });
});
