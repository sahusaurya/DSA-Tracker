const DAY = 24 * 60 * 60 * 1000;

export const MAX_REVIEW_DAYS = 3650;

/** You choose the gap yourself: "4" means this time in four days, "0" means today. */
export function scheduleInDays(days: number, from = new Date()) {
  return {
    reviewInterval: days,
    lastReviewedAt: from,
    nextReviewAt: new Date(from.getTime() + days * DAY),
  };
}

export function isValidReviewDays(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_REVIEW_DAYS
  );
}

export function describeDue(nextReviewAt: Date | null): string | null {
  if (!nextReviewAt) return null;

  const days = Math.round((nextReviewAt.getTime() - Date.now()) / DAY);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}
