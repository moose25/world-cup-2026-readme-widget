// Lightweight JSON list of the qualified teams (code + name), derived from the
// live data so the embed builder's dropdown always matches the real field.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const matches = await getMatches();
    const byName = new Map<string, string>(); // name -> code
    for (const m of matches) {
      if (!m.group) continue; // group-stage matches list the real teams
      for (const t of [m.team1, m.team2]) {
        if (!t.placeholder) byName.set(t.name, t.a3);
      }
    }
    const teams = [...byName.entries()]
      .map(([name, code]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.status(200).json({ count: teams.length, teams });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "error", teams: [] });
  }
}
