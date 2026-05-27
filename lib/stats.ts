// Tournament-wide aggregates computed from finished matches.

import type { Match } from "./data.js";

export interface Stats {
  played: number;
  total: number;
  goals: number;
  perMatch: number;
  cleanSheets: number;
  penalties: number;
  biggestWin: string | null; // e.g. "ESP 4–0 CAN"
}

export function computeStats(matches: Match[]): Stats {
  const finished = matches.filter(
    (m) => m.finished && m.score1 !== null && m.score2 !== null
  );

  let goals = 0;
  let cleanSheets = 0;
  let penalties = 0;
  let biggest: { margin: number; label: string } | null = null;

  for (const m of matches) penalties += m.goals.filter((g) => g.penalty).length;

  for (const m of finished) {
    const a = m.score1!;
    const b = m.score2!;
    goals += a + b;
    if (b === 0) cleanSheets++;
    if (a === 0) cleanSheets++;
    const margin = Math.abs(a - b);
    if (margin > 0 && (!biggest || margin > biggest.margin)) {
      biggest = { margin, label: `${m.team1.a3} ${a}–${b} ${m.team2.a3}` };
    }
  }

  return {
    played: finished.length,
    total: matches.length,
    goals,
    perMatch: finished.length ? goals / finished.length : 0,
    cleanSheets,
    penalties,
    biggestWin: biggest?.label ?? null,
  };
}
