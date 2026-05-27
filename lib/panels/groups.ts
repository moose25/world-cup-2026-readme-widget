// All-groups overview: every group's table at a glance, in one image.

import type { Match } from "../data.js";
import { getTheme, statusColor, type Theme } from "../theme.js";
import { card, dot, text, teamMark } from "../svg.js";
import { computeGroups, type GroupTable } from "../standings.js";

const W = 720;
const PAD = 14;
const GAP = 14;
const COLS = 3;
const TOP = 46;
const HEAD = 18;
const ROW = 19;
const BLOCK = HEAD + 4 * ROW + 16;
const COL_W = (W - 2 * PAD - (COLS - 1) * GAP) / COLS;

export interface GroupsOpts {
  theme: string | undefined;
}

export function renderGroups(matches: Match[], opts: GroupsOpts): string {
  const theme = getTheme(opts.theme);
  const tables = computeGroups(matches);
  const rows = Math.ceil(tables.length / COLS);
  const height = TOP + rows * BLOCK + 24;

  const body: string[] = [];
  tables.forEach((t, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (COL_W + GAP);
    const y = TOP + row * BLOCK;
    body.push(...block(t, x, y, theme));
  });

  // Legend.
  const ly = height - 12;
  const legend: Array<[string, string]> = [
    [theme.advance, "advance"],
    [theme.warn, "3rd-place race"],
    [theme.out, "out"],
  ];
  let lx = PAD;
  for (const [c, txt] of legend) {
    body.push(dot(lx + 3, ly - 3, 3.5, c));
    body.push(text(txt, { x: lx + 12, y: ly, size: 10.5, fill: theme.dim }));
    lx += 20 + txt.length * 6.4;
  }

  return card({
    width: W,
    height,
    theme,
    title: "WORLD CUP 26 · ALL GROUPS",
    body: body.join(""),
  });
}

function block(t: GroupTable, x: number, y: number, theme: Theme): string[] {
  const out: string[] = [];
  out.push(
    text(`GROUP ${t.group}`, {
      x,
      y: y + 12,
      size: 11,
      fill: theme.dim,
      weight: 700,
    })
  );
  out.push(text("PTS", { x: x + COL_W, y: y + 12, size: 9, fill: theme.dim, weight: 700, anchor: "end" }));

  t.rows.forEach((r, i) => {
    const ry = y + HEAD + i * ROW;
    const mid = ry + ROW / 2;
    const base = mid + 3.5;
    out.push(dot(x + 5, mid, 3.5, statusColor(theme, r.status)));
    out.push(teamMark(x + 14, mid, r.team, theme, 22, 14));
    out.push(
      text(r.team.a3, { x: x + 42, y: base, size: 11.5, fill: theme.text, weight: 600, mono: true })
    );
    out.push(
      text(String(r.pts), {
        x: x + COL_W,
        y: base,
        size: 12,
        fill: theme.text,
        weight: 800,
        anchor: "end",
        mono: true,
      })
    );
  });
  return out;
}
