/** Fixed ladder, deliberately simpler than SM-2: each review moves one rung up. */
export const INTERVALS = [1, 3, 7, 16, 35] as const;

const DAY = 24 * 60 * 60 * 1000;

export function nextReview(currentInterval: number, from = new Date()) {
  const step = Math.min(currentInterval, INTERVALS.length - 1);
  const days = INTERVALS[step];
  return {
    reviewInterval: Math.min(currentInterval + 1, INTERVALS.length - 1),
    lastReviewedAt: from,
    nextReviewAt: new Date(from.getTime() + days * DAY),
  };
}

export function describeDue(nextReviewAt: Date | null): string | null {
  if (!nextReviewAt) return null;

  const days = Math.round((nextReviewAt.getTime() - Date.now()) / DAY);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}
