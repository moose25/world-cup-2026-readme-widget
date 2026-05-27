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

/** A group is decided once all four teams have played their three matches. */
export function groupComplete(table: GroupTable): boolean {
  return table.rows.length === 4 && table.rows.every((r) => r.played >= 3);
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
  const groupMatches = new Map<string, Match[]>();
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
    (groupMatches.get(m.group) ?? groupMatches.set(m.group, []).get(m.group)!).push(m);
    // Register both teams so the table lists all 4 even before kickoff.
    const r1 = rowFor(m.group, m.team1);
    const r2 = rowFor(m.group, m.team2);
    if (m.finished && m.score1 !== null && m.score2 !== null) {
      applyResult(r1, m.score1, m.score2);
      applyResult(r2, m.score2, m.score1);
    }
  }

  const tables: GroupTable[] = GROUP_LETTERS.filter((g) => byGroup.has(g)).map(
    (group) => {
      const rows = [...byGroup.get(group)!.values()].sort(compareRows);
      breakTies(rows, groupMatches.get(group) ?? []);
      return { group, rows };
    }
  );

  assignStatuses(tables);
  return tables;
}

/** True when two rows are level on the primary criteria (pts, GD, GF). */
function levelOnPrimary(a: TeamRow, b: TeamRow): boolean {
  return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf;
}

/**
 * Re-order any run of teams level on points/GD/GF using a head-to-head
 * mini-league (points, then GD, then GF among only those teams). This is the
 * next FIFA criterion after the overall ones; fair-play and drawing of lots
 * (the remaining steps) are still a TODO.
 */
function breakTies(rows: TeamRow[], matches: Match[]): void {
  for (let i = 0; i < rows.length; ) {
    let j = i + 1;
    while (j < rows.length && levelOnPrimary(rows[i]!, rows[j]!)) j++;
    if (j - i > 1) {
      const run = rows.slice(i, j);
      const names = new Set(run.map((r) => r.team.name));
      const h2h = miniLeague(names, matches);
      run.sort((a, b) => {
        const x = h2h.get(a.team.name)!;
        const y = h2h.get(b.team.name)!;
        return (
          y.pts - x.pts ||
          y.gd - x.gd ||
          y.gf - x.gf ||
          a.team.a3.localeCompare(b.team.a3)
        );
      });
      for (let k = 0; k < run.length; k++) rows[i + k] = run[k]!;
    }
    i = j;
  }
}

interface Mini {
  pts: number;
  gd: number;
  gf: number;
}

/** Points/GD/GF earned only in matches between the named teams. */
function miniLeague(names: Set<string>, matches: Match[]): Map<string, Mini> {
  const table = new Map<string, Mini>();
  for (const n of names) table.set(n, { pts: 0, gd: 0, gf: 0 });
  for (const m of matches) {
    if (!m.finished || m.score1 === null || m.score2 === null) continue;
    if (!names.has(m.team1.name) || !names.has(m.team2.name)) continue;
    const a = table.get(m.team1.name)!;
    const b = table.get(m.team2.name)!;
    a.gf += m.score1;
    a.gd += m.score1 - m.score2;
    b.gf += m.score2;
    b.gd += m.score2 - m.score1;
    if (m.score1 > m.score2) a.pts += 3;
    else if (m.score1 < m.score2) b.pts += 3;
    else {
      a.pts += 1;
      b.pts += 1;
    }
  }
  return table;
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
