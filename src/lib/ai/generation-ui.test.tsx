// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import type React from "react";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));

import { GenerateGraphButton } from "@/components/generate-graph-button";
import { QuizCreateForm } from "@/components/quiz-create-form";

const graphId = "712c5f5b-e381-41f3-9bba-146b524dd3ee";
const quizId = "1df63223-9d2b-4c0c-8919-9c460858c6aa";

function apiResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("generation client state and navigation", () => {
  beforeEach(() => { cleanup(); router.push.mockReset(); router.refresh.mockReset(); vi.restoreAllMocks(); });

  it("shows Graph pending state, then navigates using the direct graph.id contract", async () => {
    let resolveResponse!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(resolve => { resolveResponse = resolve; }));
    render(<GenerateGraphButton materialId="b86284d9-d1cc-4d8a-8a34-2cf13979e887" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(button.textContent).not.toBe("");
    resolveResponse(await apiResponse({ graph: { id: graphId, title: "Energy", nodeCount: 8, edgeCount: 9 } }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/graphs/${graphId}`));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows Graph API errors and rejects the old nested data.data shape without navigation", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ error: { code: "UPSTREAM", message: "Service unavailable" } }, 502));
    const first = render(<GenerateGraphButton materialId="b86284d9-d1cc-4d8a-8a34-2cf13979e887" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Service unavailable");
    expect(router.push).not.toHaveBeenCalled();
    first.unmount();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ data: { graph: { id: graphId } } }));
    render(<GenerateGraphButton materialId="b86284d9-d1cc-4d8a-8a34-2cf13979e887" />);
    fireEvent.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows Quiz pending and error states, then routes by quiz.id including partial warning", async () => {
    const materials = [{ id: "b86284d9-d1cc-4d8a-8a34-2cf13979e887", title: "Energy", source_type: "pasted_text", created_at: "2026-01-01" }];
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(apiResponse({ error: { code: "AI_UPSTREAM_TIMEOUT", message: "Timed out" } }, 504));
    const first = render(<QuizCreateForm materials={materials} />);
    const form = first.container.querySelector("form")!;
    fireEvent.submit(form);
    expect(await screen.findByRole("alert")).toHaveTextContent("Timed out");
    first.unmount();

    let resolveResponse!: (response: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(resolve => { resolveResponse = resolve; }));
    render(<QuizCreateForm materials={materials} />);
    const nextForm = document.querySelector("form")!;
    fireEvent.submit(nextForm);
    expect(document.querySelector('button[type="submit"]')).toBeDisabled();
    resolveResponse(await apiResponse({ quiz: { id: quizId, title: "Review", questionCount: 4 }, warning: "Partial quiz" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/quiz/${quizId}?partial=1`));
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});
