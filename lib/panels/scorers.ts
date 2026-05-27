// Top scorers panel (golden boot race). Populates once results carry goal data.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, rect, text, teamMark } from "../svg.js";
import { topScorers, type Scorer } from "../scorers.js";

const W = 430;
const TOP = 50;
const ROW = 28;
const LIMIT = 10;

const X = { rank: 22, flag: 40, name: 76, pens: W - 70, goals: W - 18 };

export interface ScorersOpts {
  theme: string | undefined;
}

export function renderScorers(matches: Match[], opts: ScorersOpts): string {
  const theme = getTheme(opts.theme);
  const scorers = topScorers(matches, LIMIT);

  if (scorers.length === 0) {
    return card({
      width: W,
      height: 96,
      theme,
      title: "WORLD CUP 26 · TOP SCORERS",
      body: text("No goals yet — check back after kickoff ⚽", {
        x: W / 2,
        y: 60,
        size: 13,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  const body: string[] = [];
  body.push(text("GOALS", { x: X.goals, y: 44, size: 9.5, fill: theme.dim, weight: 700, anchor: "end" }));
  scorers.forEach((s, i) => body.push(...row(s, i, theme)));

  const height = TOP + scorers.length * ROW + 14;
  return card({
    width: W,
    height,
    theme,
    title: "WORLD CUP 26 · TOP SCORERS",
    body: body.join(""),
  });
}

function row(s: Scorer, i: number, theme: Theme): string[] {
  const yTop = TOP + i * ROW;
  const mid = yTop + ROW / 2;
  const base = mid + 4;
  const out: string[] = [];
  if (i % 2 === 1) out.push(rect(8, yTop, W - 16, ROW, { fill: theme.headerBg, r: 5 }));
  out.push(text(String(i + 1), { x: X.rank, y: base, size: 11.5, fill: theme.dim, mono: true, anchor: "end" }));
  out.push(teamMark(X.flag, mid, s.team, theme, 26, 17));
  out.push(text(truncate(s.name, 24), { x: X.name, y: base, size: 13, fill: theme.text, weight: 600 }));
  if (s.penalties > 0) {
    out.push(text(`${s.penalties}P`, { x: X.pens, y: base, size: 10.5, fill: theme.dim, anchor: "end", mono: true }));
  }
  out.push(
    text(String(s.goals), { x: X.goals, y: base, size: 15, fill: theme.text, weight: 800, anchor: "end", mono: true })
  );
  return out;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
