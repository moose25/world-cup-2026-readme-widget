// Group standings panel with the qualification cut drawn in.

import type { Match } from "../data.js";
import { getTheme, statusColor, type Theme } from "../theme.js";
import { card, dot, rect, teamMark, text } from "../svg.js";
import { computeGroups, type GroupTable, type TeamRow } from "../standings.js";

const W = 470;
const ROW_H = 34;
const TOP = 66; // first row baseline area start (below header + column labels)

// Column x-anchors.
const X = { dot: 20, rank: 34, flag: 50, name: 90, p: 320, gd: 372, pts: 442 };

export interface GroupOpts {
  group: string;
  theme: string | undefined;
}

export function renderGroup(matches: Match[], opts: GroupOpts): string {
  const theme = getTheme(opts.theme);
  const letter = (opts.group || "A").toUpperCase();
  const table = computeGroups(matches).find((t) => t.group === letter);

  const height = TOP + 4 * ROW_H + 34;

  if (!table) {
    return card({
      width: W,
      height,
      theme,
      title: `WORLD CUP 26 · GROUP ${letter}`,
      body: text("Group not found", {
        x: W / 2,
        y: height / 2 + 8,
        size: 14,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  const body: string[] = [];

  // Column labels.
  const label = (t: string, x: number) =>
    text(t, { x, y: 56, size: 10.5, fill: theme.dim, weight: 700, anchor: "middle" });
  body.push(text("TEAM", { x: X.flag, y: 56, size: 10.5, fill: theme.dim, weight: 700 }));
  body.push(label("P", X.p), label("GD", X.gd), label("PTS", X.pts));

  table.rows.forEach((row, i) => body.push(...renderRow(row, i, theme)));

  // Dashed cut line after the top-2 (direct qualification).
  if (table.rows.length > 2) {
    const cy = TOP + 2 * ROW_H + 2;
    body.push(
      `<path d="M14 ${cy} H${W - 14}" stroke="${theme.advance}" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>`
    );
  }

  // Legend.
  const legendY = height - 14;
  body.push(legend(theme, legendY));

  return card({
    width: W,
    height,
    theme,
    title: `WORLD CUP 26 · GROUP ${letter}`,
    body: body.join(""),
  });
}

function renderRow(row: TeamRow, i: number, theme: Theme): string[] {
  const yTop = TOP + i * ROW_H;
  const yMid = yTop + ROW_H / 2;
  const baseline = yMid + 4.5;
  const color = statusColor(theme, row.status);
  const out: string[] = [];

  if (i % 2 === 1) {
    out.push(rect(8, yTop, W - 16, ROW_H, { fill: theme.headerBg, r: 6 }));
  }
  out.push(dot(X.dot, yMid, 4, color));
  out.push(
    text(String(i + 1), { x: X.rank, y: baseline, size: 12, fill: theme.dim, mono: true })
  );
  out.push(teamMark(X.flag, yMid, row.team, theme, 30, 20));
  out.push(
    text(truncate(row.team.name, 20), {
      x: X.name,
      y: baseline,
      size: 13.5,
      fill: theme.text,
      weight: 600,
    })
  );
  out.push(num(String(row.played), X.p, baseline, theme.dim));
  out.push(num(fmtGd(row.gd), X.gd, baseline, theme.dim));
  out.push(
    text(String(row.pts), {
      x: X.pts,
      y: baseline,
      size: 14,
      fill: theme.text,
      weight: 800,
      anchor: "middle",
      mono: true,
    })
  );
  return out;
}

function legend(theme: Theme, y: number): string {
  const items: Array<[string, string]> = [
    [theme.advance, "advance"],
    [theme.warn, "3rd-place race"],
    [theme.out, "out"],
  ];
  let x = 14;
  const parts: string[] = [];
  for (const [c, txt] of items) {
    parts.push(dot(x + 3, y - 3, 3.5, c));
    parts.push(text(txt, { x: x + 12, y, size: 10.5, fill: theme.dim }));
    x += 18 + txt.length * 6.4;
  }
  return parts.join("");
}

function num(s: string, x: number, y: number, fill: string): string {
  return text(s, { x, y, size: 12.5, fill, anchor: "middle", mono: true });
}

function fmtGd(gd: number): string {
  return gd > 0 ? `+${gd}` : String(gd);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
