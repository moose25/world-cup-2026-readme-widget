// Fetches and normalizes the free, no-key openfootball World Cup 2026 dataset.
//
// Source: https://github.com/openfootball/worldcup.json (public domain).
// A warm serverless instance caches the payload for a few minutes so we don't
// hammer GitHub on every image request; HTTP cache headers (see vercel.json)
// handle the rest.

import { lookupTeam, type Team } from "./teams.js";
import { toInstant } from "./time.js";

export const SOURCE_URL =
  process.env.WC26_DATA_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

/** Shape of a match as it appears in the upstream feed. */
export interface RawMatch {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  num?: number;
  // openfootball has used both shapes across editions; we accept either.
  score?: { ft?: [number, number]; ht?: [number, number] };
  score1?: number;
  score2?: number;
}

export interface RawData {
  name: string;
  matches: RawMatch[];
}

/** A normalized match used throughout the renderers. */
export interface Match {
  round: string;
  date: string;
  time: string;
  /** Absolute kickoff instant, or null if the time could not be parsed. */
  instant: Date | null;
  team1: Team;
  team2: Team;
  /** Single-letter group ("A".."L"), or null for knockout fixtures. */
  group: string | null;
  ground: string | null;
  score1: number | null;
  score2: number | null;
  finished: boolean;
}

function readScore(m: RawMatch): [number | null, number | null] {
  if (m.score?.ft && m.score.ft.length === 2) {
    return [m.score.ft[0], m.score.ft[1]];
  }
  if (typeof m.score1 === "number" && typeof m.score2 === "number") {
    return [m.score1, m.score2];
  }
  return [null, null];
}

function parseGroup(group: string | undefined): string | null {
  if (!group) return null;
  const m = /Group\s+([A-Z])/i.exec(group);
  return m ? m[1]!.toUpperCase() : null;
}

export function normalize(raw: RawData): Match[] {
  return raw.matches.map((m) => {
    const [s1, s2] = readScore(m);
    return {
      round: m.round,
      date: m.date,
      time: m.time,
      instant: toInstant(m.date, m.time),
      team1: lookupTeam(m.team1),
      team2: lookupTeam(m.team2),
      group: parseGroup(m.group),
      ground: m.ground ?? null,
      score1: s1,
      score2: s2,
      finished: s1 !== null && s2 !== null,
    };
  });
}

interface Cache {
  matches: Match[];
  fetchedAt: number;
}
let cache: Cache | null = null;
const TTL_MS = 5 * 60 * 1000;

/** Fetch + normalize the live dataset, with a short in-process cache. */
export async function getMatches(): Promise<Match[]> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return cache.matches;
  }
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "wc26-widget" },
  });
  if (!res.ok) {
    if (cache) return cache.matches; // serve stale rather than fail
    throw new Error(`Upstream ${res.status} fetching ${SOURCE_URL}`);
  }
  const raw = (await res.json()) as RawData;
  const matches = normalize(raw);
  cache = { matches, fetchedAt: Date.now() };
  return matches;
}
