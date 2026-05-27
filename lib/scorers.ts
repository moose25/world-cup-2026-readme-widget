// Golden-boot aggregation. Own goals don't count toward a scorer's tally.

import type { Match } from "./data.js";
import type { Team } from "./teams.js";

export interface Scorer {
  name: string;
  team: Team;
  goals: number;
  penalties: number;
}

export function topScorers(matches: Match[], limit = 10): Scorer[] {
  const tally = new Map<string, Scorer>();
  for (const m of matches) {
    for (const g of m.goals) {
      if (g.ownGoal) continue;
      const team = g.side === 1 ? m.team1 : m.team2;
      const existing = tally.get(g.name);
      if (existing) {
        existing.goals++;
        if (g.penalty) existing.penalties++;
      } else {
        tally.set(g.name, {
          name: g.name,
          team,
          goals: 1,
          penalties: g.penalty ? 1 : 0,
        });
      }
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
    .slice(0, limit);
}
