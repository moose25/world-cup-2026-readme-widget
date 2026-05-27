// The differentiator: ranks all 12 third-placed teams and draws the line where
// the 8 best advance to the Round of 32. No other README tool does this.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, dot, rect, teamMark, text } from "../svg.js";
import {
  computeGroups,
  thirdPlaceRanking,
  THIRD_PLACE_SLOTS,
  type ThirdPlaceEntry,
} from "../standings.js";

const W = 470;
const TOP = 68;
const ROW_H = 27;
const CUT_GAP = 20;

const X = { dot: 20, rank: 36, flag: 52, name: 88, grp: 300, gd: 388, pts: 450 };

export interface R32Opts {
  theme: string | undefined;
}

export function renderR32(matches: Match[], opts: R32Opts): string {
  const theme = getTheme(opts.theme);
  const ranking = thirdPlaceRanking(computeGroups(matches));

  const height = TOP + ranking.length * ROW_H + CUT_GAP + 24;
  const body: string[] = [];

  body.push(
    text("8 best third-placed teams advance", {
      x: 14,
      y: 54,
      size: 11,
      fill: theme.dim,
    })
  );
  body.push(text("GRP", { x: X.grp, y: 54, size: 10, fill: theme.dim, weight: 700, anchor: "middle" }));
  body.push(text("GD", { x: X.gd, y: 54, size: 10, fill: theme.dim, weight: 700, anchor: "middle" }));
  body.push(text("PTS", { x: X.pts, y: 54, size: 10, fill: theme.dim, weight: 700, anchor: "middle" }));

  ranking.forEach((e, i) => body.push(...renderRow(e, i, theme)));

  // The Round-of-32 cut line, between rank 8 and 9.
  const cutY = TOP + THIRD_PLACE_SLOTS * ROW_H + CUT_GAP / 2;
  body.push(
    `<path d="M14 ${cutY} H${W - 14}" stroke="${theme.accent}" stroke-width="1.5" stroke-dasharray="5 3"/>`
  );
  body.push(
    text("ROUND OF 32 CUT", {
      x: W / 2,
      y: cutY - 4,
      size: 9.5,
      fill: theme.accent,
      weight: 800,
      anchor: "middle",
    })
  );

  return card({
    width: W,
    height,
    theme,
    title: "WORLD CUP 26 · ROUND-OF-32 TRACKER",
    body: body.join(""),
  });
}

function renderRow(e: ThirdPlaceEntry, i: number, theme: Theme): string[] {
  const yTop = TOP + i * ROW_H + (i >= THIRD_PLACE_SLOTS ? CUT_GAP : 0);
  const yMid = yTop + ROW_H / 2;
  const baseline = yMid + 4;
  const color = e.in ? theme.advance : theme.out;
  const out: string[] = [];

  if (i % 2 === 1) out.push(rect(8, yTop, W - 16, ROW_H, { fill: theme.headerBg, r: 5 }));
  out.push(dot(X.dot, yMid, 4, color));
  out.push(text(String(e.rank), { x: X.rank, y: baseline, size: 11.5, fill: theme.dim, mono: true }));
  out.push(teamMark(X.flag, yMid, e.row.team, theme, 28, 19));
  out.push(
    text(truncate(e.row.team.name, 20), {
      x: X.name,
      y: baseline,
      size: 12.5,
      fill: e.in ? theme.text : theme.dim,
      weight: 600,
    })
  );
  out.push(text(e.group, { x: X.grp, y: baseline, size: 12, fill: theme.dim, anchor: "middle", weight: 700 }));
  out.push(text(fmtGd(e.row.gd), { x: X.gd, y: baseline, size: 12, fill: theme.dim, anchor: "middle", mono: true }));
  out.push(
    text(String(e.row.pts), {
      x: X.pts,
      y: baseline,
      size: 13,
      fill: e.in ? theme.text : theme.dim,
      weight: 800,
      anchor: "middle",
      mono: true,
    })
  );
  return out;
}

function fmtGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
