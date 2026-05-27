// Knockout bracket: a connected R32 → Final tree. The topology comes from the
// winner refs (W74, …), so the tree is correct even before any team is known;
// boxes fill in as the group stage finishes and knockout results land.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, flagImage, rect, text } from "../svg.js";
import { resolveKnockout, type KMatch, type Slot } from "../knockout.js";

const PAD = 14;
const BOX_W = 104;
const BOX_H = 32;
const H_GAP = 32;
const LEAF_H = 36;
const TOP = 58;

const COL: Record<string, number> = {
  "Round of 32": 0,
  "Round of 16": 1,
  "Quarter-final": 2,
  "Semi-final": 3,
  Final: 4,
};
const COL_LABEL = ["R32", "R16", "QF", "SF", "FINAL"];
const COLS = 5;
const W = PAD * 2 + COLS * BOX_W + (COLS - 1) * H_GAP;

export interface BracketOpts {
  theme: string | undefined;
}

export function renderBracket(matches: Match[], opts: BracketOpts): string {
  const theme = getTheme(opts.theme);
  const ko = resolveKnockout(matches);

  if (!ko.final) {
    return card({
      width: W,
      height: 100,
      theme,
      title: "WORLD CUP 26 · BRACKET",
      body: text("Knockout bracket not available yet", {
        x: W / 2,
        y: 60,
        size: 13,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  // In-order leaf collection → vertical ordering of the R32 matches.
  const leaves: number[] = [];
  const collect = (num: number): void => {
    const m = ko.byNum.get(num);
    if (!m) return;
    if (m.c1 == null && m.c2 == null) {
      leaves.push(num);
      return;
    }
    if (m.c1 != null) collect(m.c1);
    if (m.c2 != null) collect(m.c2);
  };
  collect(ko.final.num);

  const cy = new Map<number, number>();
  leaves.forEach((num, i) => cy.set(num, TOP + i * LEAF_H + LEAF_H / 2));
  const center = (num: number): number => {
    if (cy.has(num)) return cy.get(num)!;
    const m = ko.byNum.get(num)!;
    const a = m.c1 != null ? center(m.c1) : TOP;
    const b = m.c2 != null ? center(m.c2) : TOP;
    const v = (a + b) / 2;
    cy.set(num, v);
    return v;
  };
  center(ko.final.num);

  const colX = (c: number): number => PAD + c * (BOX_W + H_GAP);
  const body: string[] = [];

  // Column headers.
  COL_LABEL.forEach((lab, c) =>
    body.push(
      text(lab, { x: colX(c) + BOX_W / 2, y: 48, size: 10, fill: theme.dim, weight: 700, anchor: "middle" })
    )
  );

  // Connectors first (so boxes sit on top).
  for (const m of ko.byNum.values()) {
    const col = COL[m.round];
    if (col === undefined || col === 0) continue;
    const px = colX(col);
    const pcy = center(m.num);
    for (const child of [m.c1, m.c2]) {
      if (child == null || !ko.byNum.has(child)) continue;
      const childCol = COL[ko.byNum.get(child)!.round];
      if (childCol === undefined) continue;
      const cx = colX(childCol) + BOX_W;
      const ccy = center(child);
      const midX = (cx + px) / 2;
      body.push(
        `<path d="M${cx} ${ccy} H${midX} V${pcy} H${px}" fill="none" stroke="${theme.border}" stroke-width="1.25"/>`
      );
    }
  }

  // Boxes.
  for (const m of ko.byNum.values()) {
    const col = COL[m.round];
    if (col === undefined) continue;
    body.push(...box(colX(col), center(m.num) - BOX_H / 2, m, theme));
  }

  // Third-place playoff, tucked under the final column.
  let height = TOP + leaves.length * LEAF_H + 16;
  if (ko.third) {
    const ty = height - 6;
    body.push(text("3RD PLACE", { x: colX(4) + BOX_W / 2, y: ty, size: 9, fill: theme.dim, weight: 700, anchor: "middle" }));
    body.push(...box(colX(4), ty + 6, ko.third, theme));
    height = ty + 6 + BOX_H + 14;
  }

  return card({
    width: W,
    height,
    theme,
    title: "WORLD CUP 26 · BRACKET",
    body: body.join(""),
  });
}

function box(x: number, y: number, m: KMatch, theme: Theme): string[] {
  const out: string[] = [];
  out.push(rect(x, y, BOX_W, BOX_H, { fill: theme.card, r: 5, stroke: theme.border }));
  out.push(`<path d="M${x} ${y + BOX_H / 2} H${x + BOX_W}" stroke="${theme.border}" stroke-width="0.6" opacity="0.6"/>`);
  out.push(...slotRow(x, y + BOX_H / 4 + 4, m.s1, m.score1, m.winnerSide === 1, m.shootout, theme));
  out.push(...slotRow(x, y + (3 * BOX_H) / 4 + 4, m.s2, m.score2, m.winnerSide === 2, m.shootout, theme));
  return out;
}

function slotRow(
  x: number,
  baseline: number,
  slot: Slot,
  score: number | null,
  isWinner: boolean,
  shootout: boolean,
  theme: Theme
): string[] {
  const out: string[] = [];
  const fill = slot.team ? (isWinner ? theme.text : theme.dim) : theme.dim;
  const weight = isWinner ? 800 : 600;
  if (slot.team && slot.team.a2) {
    const flag = flagImage(x + 6, baseline - 10, 17, 11, slot.team.a2, theme);
    out.push(flag);
    out.push(text(slot.team.a3, { x: x + 28, y: baseline, size: 11, fill, weight, mono: true }));
  } else {
    out.push(text(truncate(slot.label, 14), { x: x + 7, y: baseline, size: 9.5, fill: theme.dim }));
  }
  // Mark the penalty-shootout winner.
  if (shootout && isWinner) {
    out.push(text("p", { x: x + BOX_W - 20, y: baseline, size: 8, fill: theme.accent, weight: 800, anchor: "end" }));
  }
  if (score !== null) {
    out.push(text(String(score), { x: x + BOX_W - 7, y: baseline, size: 11, fill, weight, anchor: "end", mono: true }));
  }
  return out;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
