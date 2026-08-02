const ACRONYMS = new Set([
  "lru", "lfu", "bfs", "dfs", "dp", "gcd", "lcm", "xor", "api", "sql", "url",
  "cpu", "io", "kth", "nth", "bst", "dag", "mst", "fifo", "lifo", "asap",
]);

const ROMAN = new Set(["ii", "iii", "iv", "vi", "vii", "viii", "ix", "xi", "xii"]);

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function titleFromSlug(slug: string): string {
  const words = slug.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return slug;

  return words
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS.has(lower) || ROMAN.has(lower)) return lower.toUpperCase();
      if (/^\d+$/.test(lower)) return lower;
      return lower[0].toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
