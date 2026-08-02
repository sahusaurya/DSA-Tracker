import "server-only";

import { randomUUID } from "node:crypto";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { edges, listItems, lists, nodes, problems } from "./schema";
import type { Difficulty, NodeKind, Status } from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

/**
 * A tiny starter vault so a fresh clone isn't an empty screen. It only runs when
 * the database has nothing in it, so it can never overwrite anyone's real notes,
 * and it's built from the same pieces a user would create by hand — delete the
 * list and the three problems and no trace is left.
 */

type SeedProblem = {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  status: Status;
  notes: string;
  topics: string[];
};

const TOPICS: Record<string, string> = {
  "hash-map": "Hash Map",
  "two-pointers": "Two Pointers",
};

const PROBLEMS: SeedProblem[] = [
  {
    slug: "two-sum",
    title: "Two Sum",
    url: "https://leetcode.com/problems/two-sum",
    difficulty: "easy",
    status: "solved",
    topics: ["hash-map"],
    notes: `## Approach

Walk the array once, keeping a [[Hash Map]] of value → index. For each \`x\`, check
whether \`target - x\` has already been seen.

- **O(n)** time, **O(n)** space
- The brute-force double loop is O(n²) — the map is what buys you the speed

\`\`\`python
def twoSum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
\`\`\`

Same trick as [[Valid Anagram]]: when you need "have I seen this before?", reach for a map.

> Try it yourself — edit this note, or press **⌘K** to jump somewhere else.`,
  },
  {
    slug: "valid-anagram",
    title: "Valid Anagram",
    url: "https://leetcode.com/problems/valid-anagram",
    difficulty: "easy",
    status: "attempted",
    topics: ["hash-map"],
    notes: `## Approach

Count characters with a [[Hash Map]] and compare the two counts. Sorting both strings
also works and is a one-liner, but it costs O(n log n).

- Counting: **O(n)** time, O(1) space for a fixed alphabet
- Early exit: different lengths can't be anagrams

\`\`\`python
from collections import Counter

def isAnagram(s, t):
    return len(s) == len(t) and Counter(s) == Counter(t)
\`\`\`

- [ ] Redo without \`Counter\`, using a plain dict`,
  },
  {
    slug: "valid-palindrome",
    title: "Valid Palindrome",
    url: "https://leetcode.com/problems/valid-palindrome",
    difficulty: "easy",
    status: "todo",
    topics: ["two-pointers"],
    notes: `## Approach

Classic [[Two Pointers]]: one at each end, walk inwards, skip anything that isn't
alphanumeric, compare lowercased characters.

- **O(n)** time, **O(1)** space — no extra string needed
- The fiddly part is the skipping, not the comparison

\`\`\`python
def isPalindrome(s):
    i, j = 0, len(s) - 1
    while i < j:
        while i < j and not s[i].isalnum(): i += 1
        while i < j and not s[j].isalnum(): j -= 1
        if s[i].lower() != s[j].lower():
            return False
        i, j = i + 1, j - 1
    return True
\`\`\``,
  },
];

function makeNode(kind: NodeKind, title: string, slug: string, notes = "") {
  return { id: randomUUID(), kind, title, slug, notes, createdAt: new Date(), updatedAt: new Date() };
}

export function seedIfEmpty(db: Db) {
  const existing = db.select({ id: nodes.id }).from(nodes).limit(1).all();
  if (existing.length > 0) return;

  const topicIds = new Map<string, string>();
  const topicRows = Object.entries(TOPICS).map(([slug, title]) => {
    const row = makeNode("topic", title, slug);
    topicIds.set(slug, row.id);
    return row;
  });

  const problemIds = new Map<string, string>();
  const problemNodes = PROBLEMS.map((problem) => {
    const row = makeNode("problem", problem.title, problem.slug, problem.notes);
    problemIds.set(problem.slug, row.id);
    return row;
  });

  db.insert(nodes).values([...topicRows, ...problemNodes]).run();

  db.insert(problems)
    .values(
      PROBLEMS.map((problem) => ({
        id: problemIds.get(problem.slug)!,
        url: problem.url,
        source: "LeetCode",
        difficulty: problem.difficulty,
        status: problem.status,
      })),
    )
    .run();

  // Mirrors what writing [[...]] in the editor would have produced.
  const links: { src: string; dst: string }[] = [];
  for (const problem of PROBLEMS) {
    for (const topic of problem.topics) {
      links.push({ src: problemIds.get(problem.slug)!, dst: topicIds.get(topic)! });
    }
  }
  links.push({ src: problemIds.get("two-sum")!, dst: problemIds.get("valid-anagram")! });

  db.insert(edges)
    .values(
      links.map((link) => ({
        id: randomUUID(),
        srcId: link.src,
        dstId: link.dst,
        kind: "wikilink" as const,
        createdAt: new Date(),
      })),
    )
    .run();

  const listId = randomUUID();
  db.insert(lists)
    .values({
      id: listId,
      name: "Sample List",
      description: "Three easy problems to show how this works — delete it whenever you like.",
      emoji: "👋",
      position: 0,
      createdAt: new Date(),
    })
    .run();

  db.insert(listItems)
    .values(
      PROBLEMS.map((problem, index) => ({
        listId,
        problemId: problemIds.get(problem.slug)!,
        position: index,
        addedAt: new Date(),
      })),
    )
    .run();
}
