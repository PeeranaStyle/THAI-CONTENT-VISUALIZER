import { describe, expect, it } from "vitest";
import { jsonOk } from "@/lib/api";
import {
  graphNavigationHref,
  quizNavigationHref,
  serializeGraphGenerationResponse,
  serializeQuizGenerationResponse,
} from "@/lib/ai/generation-contract";

const graphId = "12f5f07e-2d19-4ae4-9a30-b6b6da00f921";
const quizId = "a62b289a-7c5f-46d0-b41e-5844599f3d98";

describe("AI generation HTTP response contracts", () => {
  it("serializes the exact graph response the button consumes and navigates by its ID", async () => {
    const response = jsonOk(serializeGraphGenerationResponse({
      graph: { id: graphId, title: "Energy", nodeCount: 8, edgeCount: 9 },
    }), 201);
    const body: unknown = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ graph: { id: graphId, title: "Energy", nodeCount: 8, edgeCount: 9 } });
    expect(graphNavigationHref(body)).toBe(`/graphs/${graphId}`);
    expect(() => graphNavigationHref({ data: { graph: { id: graphId } } })).toThrow();
    expect(() => graphNavigationHref({ graph: { title: "Energy" } })).toThrow();
  });

  it("serializes the quiz response the create form consumes and preserves partial navigation", async () => {
    const response = jsonOk(serializeQuizGenerationResponse({
      quiz: { id: quizId, title: "Review", questionCount: 5 }, warning: "Partial quiz",
    }), 201);
    const body: unknown = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ quiz: { id: quizId, title: "Review", questionCount: 5 }, warning: "Partial quiz" });
    expect(quizNavigationHref(body)).toBe(`/quiz/${quizId}?partial=1`);
    expect(quizNavigationHref({ quiz: { id: quizId, title: "Review", questionCount: 5 }, warning: null })).toBe(`/quiz/${quizId}`);
    expect(() => quizNavigationHref({ data: { quiz: { id: quizId } } })).toThrow();
  });
});
