// Resolves the knockout bracket. Slots arrive as placeholders — group slots
// ("1E", "2C"), third-place slots ("3A/B/C/D/F"), and winner/loser refs
// ("W74", "L101") — and get filled in as the group stage finishes and results
// land. Each KMatch also records which child matches feed it, so the panel can
// lay out a properly connected tree.

import type { Match } from "./data.js";
import type { Team } from "./teams.js";
import { computeGroups, groupComplete, type GroupTable } from "./standings.js";

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
  c1: number | null; // child match feeding s1 (winner/loser ref), if any
  c2: number | null;
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
  | { kind: "label"; text: string };

function parseRef(token: string): Ref {
  let m = /^W(\d+)$/.exec(token);
  if (m) return { kind: "win", num: +m[1]! };
  m = /^L(\d+)$/.exec(token);
  if (m) return { kind: "lose", num: +m[1]! };
  m = /^([12])([A-L])$/.exec(token);
  if (m) return { kind: "pos", pos: +m[1]!, group: m[2]! };
  return { kind: "label", text: token };
}

function refLabel(ref: Ref): string {
  if (ref.kind === "win") return `W${ref.num}`;
  if (ref.kind === "lose") return `L${ref.num}`;
  if (ref.kind === "pos") return `${ref.pos}${ref.group}`;
  return ref.text;
}

function resolveSlot(
  ref: Ref,
  byNum: Map<number, KMatch>,
  tables: GroupTable[]
): Slot {
  if (ref.kind === "pos") {
    const t = tables.find((x) => x.group === ref.group);
    if (t && groupComplete(t)) {
      const team = t.rows[ref.pos - 1]!.team;
      return { team, label: team.a3 };
    }
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
  return { team: null, label: ref.text };
}

export interface Knockout {
  byNum: Map<number, KMatch>;
  final: KMatch | null;
  third: KMatch | null;
  rounds: Map<string, KMatch[]>;
}

export function resolveKnockout(matches: Match[]): Knockout {
  const tables = computeGroups(matches);
  const ko = matches.filter((m) => KO_ROUNDS.has(m.round));
  const byNum = new Map<number, KMatch>();
  const rounds = new Map<string, KMatch[]>();
  let final: KMatch | null = null;
  let third: KMatch | null = null;

  // Dependency order: group-slot rounds first, then rounds that reference them.
  const order = [...ROUND_ORDER, "Match for third place", "Final"];
  for (const roundName of order) {
    for (const m of ko.filter((x) => x.round === roundName)) {
      const r1 = parseRef(m.team1.name);
      const r2 = parseRef(m.team2.name);
      const winnerSide: 1 | 2 | null =
        m.score1 !== null && m.score2 !== null
          ? m.score1 > m.score2
            ? 1
            : m.score1 < m.score2
              ? 2
              : null
          : null;
      const km: KMatch = {
        num: m.num ?? (roundName === "Final" ? 104 : 103),
        round: roundName,
        s1: resolveSlot(r1, byNum, tables),
        s2: resolveSlot(r2, byNum, tables),
        score1: m.score1,
        score2: m.score2,
        winnerSide,
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
