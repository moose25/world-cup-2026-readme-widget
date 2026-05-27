// Resolves the knockout bracket. Slots arrive as placeholders — group slots
// ("1E", "2C"), third-place slots ("3A/B/C/D/F"), and winner/loser refs
// ("W74", "L101") — and get filled in as the group stage finishes and results
// land. Each KMatch also records which child matches feed it, so the panel can
// lay out a properly connected tree.

import type { Match } from "./data.js";
import type { Team } from "./teams.js";
import {
  computeGroups,
  groupComplete,
  thirdPlaceRanking,
  type GroupTable,
} from "./standings.js";

export interface Slot {
  team: Team | null;
  label: string;
}

export interface KMatch {
  num: number;
  round: string;
  s1: Slot;
  s2: Slot;
  score1: number | null;
  score2: number | null;
  winnerSide: 1 | 2 | null;
  /** True when the tie was settled on penalties. */
  shootout: boolean;
  c1: number | null; // child match feeding s1 (winner/loser ref), if any
  c2: number | null;
}

/** Decide a knockout winner: penalties → extra time → full time. */
function decisiveWinner(m: Match): { side: 1 | 2 | null; shootout: boolean } {
  const pick = (a: number, b: number): 1 | 2 | null =>
    a > b ? 1 : a < b ? 2 : null;
  if (m.pens) return { side: pick(m.pens[0], m.pens[1]), shootout: true };
  if (m.et) return { side: pick(m.et[0], m.et[1]), shootout: false };
  if (m.score1 !== null && m.score2 !== null)
    return { side: pick(m.score1, m.score2), shootout: false };
  return { side: null, shootout: false };
}

export const ROUND_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
];
const KO_ROUNDS = new Set([...ROUND_ORDER, "Match for third place", "Final"]);

type Ref =
  | { kind: "win"; num: number }
  | { kind: "lose"; num: number }
  | { kind: "pos"; pos: number; group: string }
  | { kind: "third"; groups: string[] } // "3A/B/C/D/F" — one of these groups' 3rd
  | { kind: "label"; text: string };

function parseRef(token: string): Ref {
  let m = /^W(\d+)$/.exec(token);
  if (m) return { kind: "win", num: +m[1]! };
  m = /^L(\d+)$/.exec(token);
  if (m) return { kind: "lose", num: +m[1]! };
  m = /^([12])([A-L])$/.exec(token);
  if (m) return { kind: "pos", pos: +m[1]!, group: m[2]! };
  m = /^3([A-L](?:\/[A-L])*)$/.exec(token);
  if (m) return { kind: "third", groups: m[1]!.split("/") };
  return { kind: "label", text: token };
}

function refLabel(ref: Ref): string {
  if (ref.kind === "win") return `W${ref.num}`;
  if (ref.kind === "lose") return `L${ref.num}`;
  if (ref.kind === "pos") return `${ref.pos}${ref.group}`;
  if (ref.kind === "third") return `3${ref.groups.join("/")}`;
  return ref.text;
}

function resolveSlot(
  ref: Ref,
  byNum: Map<number, KMatch>,
  tables: GroupTable[],
  thirdAssign: Map<string, Team>,
  slotKey: string
): Slot {
  if (ref.kind === "pos") {
    const t = tables.find((x) => x.group === ref.group);
    if (t && groupComplete(t)) {
      const team = t.rows[ref.pos - 1]!.team;
      return { team, label: team.a3 };
    }
    return { team: null, label: refLabel(ref) };
  }
  if (ref.kind === "third") {
    const team = thirdAssign.get(slotKey);
    if (team) return { team, label: team.a3 };
    return { team: null, label: refLabel(ref) };
  }
  if (ref.kind === "win" || ref.kind === "lose") {
    const child = byNum.get(ref.num);
    if (child && child.winnerSide) {
      const win = child.winnerSide === 1 ? child.s1 : child.s2;
      const lose = child.winnerSide === 1 ? child.s2 : child.s1;
      const picked = ref.kind === "win" ? win : lose;
      if (picked.team) return { team: picked.team, label: picked.team.a3 };
    }
    return { team: null, label: refLabel(ref) };
  }
  return { team: null, label: refLabel(ref) };
}

/** Simple Kuhn's bipartite matching. Returns matchRight[j] = left index or -1. */
function bipartiteMatch(adj: number[][], nRight: number): number[] {
  const matchRight = new Array<number>(nRight).fill(-1);
  const augment = (u: number, seen: boolean[]): boolean => {
    for (const v of adj[u]!) {
      if (seen[v]) continue;
      seen[v] = true;
      if (matchRight[v] === -1 || augment(matchRight[v]!, seen)) {
        matchRight[v] = u;
        return true;
      }
    }
    return false;
  };
  for (let u = 0; u < adj.length; u++) augment(u, new Array<boolean>(nRight).fill(false));
  return matchRight;
}

/**
 * Once all 12 groups are decided, allocate the 8 qualifying third-placed teams
 * to the R32 slots that accept them ("3A/B/C/D/F", …). Each slot lists the
 * groups it can receive; we find a valid assignment by bipartite matching on
 * those eligibility sets. Keyed by `${matchNum}:${side}`.
 */
function buildThirdAssignment(matches: Match[], tables: GroupTable[]): Map<string, Team> {
  const assign = new Map<string, Team>();
  if (tables.length < 12 || !tables.every(groupComplete)) return assign;

  const thirds = thirdPlaceRanking(tables).filter((e) => e.in);
  const slots: Array<{ key: string; eligible: Set<string> }> = [];
  for (const m of matches) {
    if (m.round !== "Round of 32" || m.num === null) continue;
    for (const [side, token] of [[1, m.team1.name], [2, m.team2.name]] as const) {
      const ref = parseRef(token);
      if (ref.kind === "third") {
        slots.push({ key: `${m.num}:${side}`, eligible: new Set(ref.groups) });
      }
    }
  }
  if (thirds.length !== slots.length || thirds.length === 0) return assign;

  const adj = thirds.map((e) =>
    slots.map((s, j) => (s.eligible.has(e.group) ? j : -1)).filter((j) => j >= 0)
  );
  const matchRight = bipartiteMatch(adj, slots.length);
  matchRight.forEach((leftIdx, slotIdx) => {
    if (leftIdx >= 0) assign.set(slots[slotIdx]!.key, thirds[leftIdx]!.row.team);
  });
  return assign;
}

export interface Knockout {
  byNum: Map<number, KMatch>;
  final: KMatch | null;
  third: KMatch | null;
  rounds: Map<string, KMatch[]>;
}

export function resolveKnockout(matches: Match[]): Knockout {
  const tables = computeGroups(matches);
  const thirdAssign = buildThirdAssignment(matches, tables);
  const ko = matches.filter((m) => KO_ROUNDS.has(m.round));
  const byNum = new Map<number, KMatch>();
  const rounds = new Map<string, KMatch[]>();
  let final: KMatch | null = null;
  let third: KMatch | null = null;

  // Dependency order: group-slot rounds first, then rounds that reference them.
  const order = [...ROUND_ORDER, "Match for third place", "Final"];
  for (const roundName of order) {
    for (const m of ko.filter((x) => x.round === roundName)) {
      const num = m.num ?? (roundName === "Final" ? 104 : 103);
      const r1 = parseRef(m.team1.name);
      const r2 = parseRef(m.team2.name);
      const { side: winnerSide, shootout } = decisiveWinner(m);
      const km: KMatch = {
        num,
        round: roundName,
        s1: resolveSlot(r1, byNum, tables, thirdAssign, `${num}:1`),
        s2: resolveSlot(r2, byNum, tables, thirdAssign, `${num}:2`),
        score1: m.score1,
        score2: m.score2,
        winnerSide,
        shootout,
        c1: r1.kind === "win" || r1.kind === "lose" ? r1.num : null,
        c2: r2.kind === "win" || r2.kind === "lose" ? r2.num : null,
      };
      byNum.set(km.num, km);
      (rounds.get(roundName) ?? rounds.set(roundName, []).get(roundName)!).push(km);
      if (roundName === "Final") final = km;
      if (roundName === "Match for third place") third = km;
    }
  }

  return { byNum, final, third, rounds };
}
