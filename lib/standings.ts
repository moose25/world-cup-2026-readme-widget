// Group tables and the 2026-specific Round-of-32 qualification math.
//
// New 48-team format: 12 groups of 4. The top 2 of each group (24 teams) plus
// the 8 best third-placed teams (across all 12 groups) advance to a Round of 32.
// Ranking third-placed teams against each other is the genuinely new, confusing
// bit that older tools don't handle — that's what `thirdPlaceRanking` does.
//
// Tiebreakers implemented: points → goal difference → goals scored → name.
// FIFA's full ladder then adds head-to-head, fair-play, and drawing of lots;
// those edge cases are a TODO and are noted in the README.

import type { Match } from "./data.js";
import type { Team } from "./teams.js";

export const GROUP_LETTERS = "ABCDEFGHIJKL".split("");
export const THIRD_PLACE_SLOTS = 8;

export type QualStatus = "advance" | "third-in" | "third-out" | "out";

export interface TeamRow {
  team: Team;
  played: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  status: QualStatus;
}

export interface GroupTable {
  group: string;
  rows: TeamRow[]; // best first
}

function blankRow(team: Team): TeamRow {
  return {
    team,
    played: 0,
    w: 0,
    d: 0,
    l: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
    status: "out",
  };
}

/** Standard table comparator: pts, then GD, then GF, then code. */
export function compareRows(a: TeamRow, b: TeamRow): number {
  return (
    b.pts - a.pts ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.team.a3.localeCompare(b.team.a3)
  );
}

function applyResult(row: TeamRow, gf: number, ga: number): void {
  row.played += 1;
  row.gf += gf;
  row.ga += ga;
  row.gd = row.gf - row.ga;
  if (gf > ga) {
    row.w += 1;
    row.pts += 3;
  } else if (gf === ga) {
    row.d += 1;
    row.pts += 1;
  } else {
    row.l += 1;
  }
}

/** Build all 12 group tables from the match list (handles partial results). */
export function computeGroups(matches: Match[]): GroupTable[] {
  const byGroup = new Map<string, Map<string, TeamRow>>();
  const rowFor = (group: string, team: Team): TeamRow => {
    let g = byGroup.get(group);
    if (!g) byGroup.set(group, (g = new Map()));
    let row = g.get(team.name);
    if (!row) g.set(team.name, (row = blankRow(team)));
    return row;
  };

  for (const m of matches) {
    if (!m.group) continue;
    if (m.team1.placeholder || m.team2.placeholder) continue;
    // Register both teams so the table lists all 4 even before kickoff.
    const r1 = rowFor(m.group, m.team1);
    const r2 = rowFor(m.group, m.team2);
    if (m.finished && m.score1 !== null && m.score2 !== null) {
      applyResult(r1, m.score1, m.score2);
      applyResult(r2, m.score2, m.score1);
    }
  }

  const tables: GroupTable[] = GROUP_LETTERS.filter((g) => byGroup.has(g)).map(
    (group) => ({
      group,
      rows: [...byGroup.get(group)!.values()].sort(compareRows),
    })
  );

  assignStatuses(tables);
  return tables;
}

export interface ThirdPlaceEntry {
  group: string;
  row: TeamRow;
  /** Rank among the 12 third-placed teams (1 = best). */
  rank: number;
  in: boolean;
}

/** Rank the 12 third-placed teams; the top `THIRD_PLACE_SLOTS` advance. */
export function thirdPlaceRanking(tables: GroupTable[]): ThirdPlaceEntry[] {
  const thirds = tables
    .filter((t) => t.rows.length >= 3)
    .map((t) => ({ group: t.group, row: t.rows[2]! }));

  thirds.sort((a, b) => compareRows(a.row, b.row));

  return thirds.map((t, i) => ({
    group: t.group,
    row: t.row,
    rank: i + 1,
    in: i < THIRD_PLACE_SLOTS,
  }));
}

/** Mutate each row's `status` from its position + the third-place race. */
function assignStatuses(tables: GroupTable[]): void {
  const ranking = thirdPlaceRanking(tables);
  const thirdsIn = new Set(
    ranking.filter((e) => e.in).map((e) => e.group)
  );

  for (const t of tables) {
    t.rows.forEach((row, i) => {
      if (i < 2) row.status = "advance";
      else if (i === 2) row.status = thirdsIn.has(t.group) ? "third-in" : "third-out";
      else row.status = "out";
    });
  }
}
