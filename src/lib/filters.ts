import { DIFFICULTIES, STATUSES, type Difficulty, type Status } from "@/db/schema";

export type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Query strings are user input; anything unrecognised is simply ignored. */
export function parseFilters(params: SearchParams) {
  const difficulty = one(params.difficulty);
  const status = one(params.status);
  const q = one(params.q)?.trim();

  return {
    difficulty: DIFFICULTIES.includes(difficulty as Difficulty)
      ? (difficulty as Difficulty)
      : undefined,
    status: STATUSES.includes(status as Status) ? (status as Status) : undefined,
    q: q || undefined,
  };
}
