import type { Difficulty, Status } from "@/db/schema";

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};

export function DifficultyPill({ value }: { value: Difficulty | null }) {
  if (!value) return <span className="text-xs text-faint">—</span>;
  return (
    <span className={`text-xs font-medium capitalize ${DIFFICULTY_CLASS[value]}`}>{value}</span>
  );
}

const STATUS_LABEL: Record<Status, string> = {
  todo: "To do",
  attempted: "Attempted",
  solved: "Solved",
};

const STATUS_CLASS: Record<Status, string> = {
  todo: "border-border-strong",
  attempted: "border-medium bg-medium/30",
  solved: "border-easy bg-easy",
};

export function StatusChip({ value }: { value: Status }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <span className={`h-2.5 w-2.5 rounded-full border ${STATUS_CLASS[value]}`} />
      {STATUS_LABEL[value]}
    </span>
  );
}

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
