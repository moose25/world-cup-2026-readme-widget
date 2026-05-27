// Tournament stats panel: a grid of headline numbers.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, rect, text } from "../svg.js";
import { computeStats } from "../stats.js";

const W = 460;
const PAD = 14;
const GAP = 12;
const COLS = 3;
const TOP = 44;
const TILE_H = 60;
const TILE_W = (W - 2 * PAD - (COLS - 1) * GAP) / COLS;

export interface StatsOpts {
  theme: string | undefined;
}

export function renderStats(matches: Match[], opts: StatsOpts): string {
  const theme = getTheme(opts.theme);
  const s = computeStats(matches);

  const tiles: Array<[string, string]> = [
    [`${s.played}`, `of ${s.total} played`],
    [`${s.goals}`, "goals"],
    [s.played ? s.perMatch.toFixed(2) : "—", "goals / match"],
    [`${s.cleanSheets}`, "clean sheets"],
    [`${s.penalties}`, "penalties"],
    [s.biggestWin ?? "—", "biggest win"],
  ];

  const body: string[] = [];
  tiles.forEach(([value, label], i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = PAD + col * (TILE_W + GAP);
    const y = TOP + row * (TILE_H + GAP);
    body.push(...tile(x, y, value, label, theme));
  });

  const height = TOP + 2 * TILE_H + GAP + 14;
  return card({
    width: W,
    height,
    theme,
    title: "WORLD CUP 26 · TOURNAMENT STATS",
    body: body.join(""),
  });
}

function tile(x: number, y: number, value: string, label: string, theme: Theme): string[] {
  // Shrink the value font when it's a scoreline string rather than a number.
  const size = value.length > 6 ? 15 : 26;
  return [
    rect(x, y, TILE_W, TILE_H, { fill: theme.headerBg, r: 8 }),
    text(value, {
      x: x + TILE_W / 2,
      y: y + 31,
      size,
      fill: theme.accent,
      weight: 800,
      anchor: "middle",
      mono: true,
    }),
    text(label, {
      x: x + TILE_W / 2,
      y: y + 48,
      size: 10.5,
      fill: theme.dim,
      anchor: "middle",
    }),
  ];
}
