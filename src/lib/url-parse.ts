import { titleFromSlug } from "./text";

const SOURCES: Record<string, string> = {
  "leetcode.com": "LeetCode",
  "leetcode.cn": "LeetCode",
  "geeksforgeeks.org": "GeeksforGeeks",
  "practice.geeksforgeeks.org": "GeeksforGeeks",
  "codeforces.com": "Codeforces",
  "codechef.com": "CodeChef",
  "hackerrank.com": "HackerRank",
  "hackerearth.com": "HackerEarth",
  "atcoder.jp": "AtCoder",
  "spoj.com": "SPOJ",
  "interviewbit.com": "InterviewBit",
  "neetcode.io": "NeetCode",
  "codingninjas.com": "Coding Ninjas",
  "cses.fi": "CSES",
  "topcoder.com": "TopCoder",
  "projecteuler.net": "Project Euler",
};

// Path segments that describe the site's routing, not the problem itself.
const NOISE = new Set([
  "problems", "problem", "problemset", "contest", "contests", "challenges",
  "challenge", "tasks", "task", "description", "solutions", "explore", "d",
  "p", "submit", "en", "www",
]);

// Tabs hanging off a problem page. Dropping them keeps one problem at one URL.
const TAB_SEGMENTS = new Set([
  "description", "solutions", "submissions", "discussion", "editorial", "comments",
]);

export type ParsedProblemUrl = {
  title: string;
  source: string | null;
  canonicalUrl: string;
};

export function parseProblemUrl(raw: string): ParsedProblemUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "");
  const source = SOURCES[host] ?? null;

  const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  while (segments.length && TAB_SEGMENTS.has(segments.at(-1)!.toLowerCase())) {
    segments.pop();
  }

  const meaningful = segments.filter((s) => !NOISE.has(s.toLowerCase()));

  // Prefer the last segment that isn't purely numeric (GfG and Codeforces end in ids).
  const index = meaningful.findLastIndex((s) => !/^\d+$/.test(s));
  const candidate = meaningful[index] ?? meaningful.at(-1) ?? segments.at(-1);

  let title = host;
  if (candidate) {
    const cleaned = candidate
      .replace(/\.(html?|php|aspx)$/i, "")
      // GfG appends an internal id: "kadanes-algorithm-1587115620".
      .replace(/-\d{6,}$/, "");
    title = titleFromSlug(cleaned);

    // Codeforces-style "problem/4/A" leaves a bare letter; qualify it with its number.
    if (title.length <= 2 && index > 0) {
      title = `Problem ${meaningful[index - 1]}${title}`;
    }
  }

  return {
    title,
    source,
    canonicalUrl: `${url.origin}/${segments.join("/")}`.replace(/\/$/, ""),
  };
}
