import { describe, expect, it } from "vitest";
import { cumulativeMastery, getAccuracy, getLearningStreak } from "@/lib/analytics";

describe("learning metrics", () => {
  it("calculates cumulative mastery without weighting the latest quiz only", () => {
    expect(cumulativeMastery(7, 3)).toBe(70);
    expect(cumulativeMastery(0, 0)).toBe(0);
  });

  it("returns no accuracy for an empty attempt", () => {
    expect(getAccuracy(0, 0)).toBeNull();
    expect(getAccuracy(3, 4)).toBe(75);
  });

  it("counts consecutive activity days through today or yesterday", () => {
    const now = new Date("2026-10-15T06:00:00.000Z");
    expect(getLearningStreak(["2026-10-15T02:00:00.000Z", "2026-10-14T02:00:00.000Z", "2026-10-13T02:00:00.000Z"], now)).toBe(3);
    expect(getLearningStreak(["2026-10-14T02:00:00.000Z", "2026-10-13T02:00:00.000Z"], now)).toBe(2);
  });
});
