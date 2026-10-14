export function getLearningStreak(activityDates: string[], now = new Date(), timeZone = "Asia/Bangkok"): number {
  const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const dayNumber = (date: Date) => Date.parse(`${dayFormatter.format(date)}T00:00:00Z`);
  const activeDays = new Set(activityDates.map(value => dayNumber(new Date(value))));
  const today = dayNumber(now);
  let cursor = activeDays.has(today) ? today : today - 86_400_000;
  let streak = 0;
  while (activeDays.has(cursor)) { streak += 1; cursor -= 86_400_000; }
  return streak;
}

export function cumulativeMastery(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  return total === 0 ? 0 : Math.round((correct / total) * 10000) / 100;
}

export function getAccuracy(correct: number, total: number): number | null {
  return total === 0 ? null : Math.round((correct / total) * 10000) / 100;
}
