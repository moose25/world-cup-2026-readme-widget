// Local preview: render every panel to preview/*.svg + an index.html gallery.
//
// Pulls the real fixtures from openfootball and simulates results so the panels
// look mid-tournament. Two simulations are used: a mid-group-stage one for most
// panels, and a fully-played one (incl. synthesized scorers) so the bracket and
// top-scorers panels render populated. Falls back to data/mock.json offline.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

import { normalize, SOURCE_URL, type RawData, type RawMatch } from "../lib/data.js";
import { lookupTeam } from "../lib/teams.js";
import { renderMatch } from "../lib/panels/match.js";
import { renderGroup } from "../lib/panels/group.js";
import { renderR32 } from "../lib/panels/r32.js";
import { renderCountdown } from "../lib/panels/countdown.js";
import { renderToday } from "../lib/panels/today.js";
import { renderTeam } from "../lib/panels/team.js";
import { renderGroups } from "../lib/panels/groups.js";
import { renderStats } from "../lib/panels/stats.js";
import { renderScorers } from "../lib/panels/scorers.js";
import { renderBracket } from "../lib/panels/bracket.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const outDir = join(root, "preview");

const SIM_NOW = new Date("2026-06-20T19:00:00Z"); // mid group stage
const clone = (o: RawData): RawData => JSON.parse(JSON.stringify(o));

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isReal = (m: RawMatch): boolean => !/\d|\//.test(m.team1 + m.team2);
const before = (m: RawMatch, cutoff: string): boolean => m.date < cutoff;

/** Fill group matches kicked off before SIM_NOW (mid-tournament look). */
function simulateMid(raw: RawData): RawData {
  const rand = mulberry32(20260620);
  const goals = () => Math.floor(rand() * rand() * 4.2);
  for (const m of raw.matches) {
    const done = m.date < "2026-06-20" || (m.date === "2026-06-20" && (m.time ?? "") < "19:00");
    if (m.group && done && !m.score && isReal(m)) m.score = { ft: [goals(), goals()] };
  }
  return raw;
}

const POOL = ["Silva","Müller","Tanaka","Hassan","Nkunku","Olsen","Rossi","Mendez","Park","Haaland","Lopez","Yilmaz","Diop","Santos","Ibrahim","Novak","Costa","Kim","Pulisic","Vlahović"];
const hash = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);

/** Fill all matches before `cutoff` and synthesize scorers for group games. */
function simulateAll(raw: RawData, cutoff: string): RawData {
  const rand = mulberry32(777);
  const goals = () => Math.floor(rand() * rand() * 4.4);
  for (const m of raw.matches) {
    if (m.score || !before(m, cutoff)) continue;
    const a = goals();
    const b = goals();
    m.score = { ft: [a, b] };
    // Knockout draws go to penalties (the sim has no extra time).
    if (!m.group && a === b) m.score.p = rand() < 0.5 ? [4, 3] : [3, 4];
    if (m.group && isReal(m)) {
      const mk = (n: number, name: string): RawMatch["goals1"] => {
        const a3 = lookupTeam(name).a3;
        return Array.from({ length: n }, (_, k) => ({
          name: `${POOL[(Math.abs(hash(a3)) + (k % 2)) % POOL.length]} (${a3})`,
          minute: 8 + ((k * 19) % 80),
        }));
      };
      m.goals1 = mk(a, m.team1);
      m.goals2 = mk(b, m.team2);
    }
  }
  return raw;
}

async function loadRaw(): Promise<{ raw: RawData; source: string }> {
  try {
    const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "wc26-widget" } });
    if (res.ok) return { raw: (await res.json()) as RawData, source: "live openfootball feed" };
  } catch {
    /* fall through */
  }
  const mock = JSON.parse(readFileSync(join(root, "data/mock.json"), "utf8")) as RawData;
  return { raw: mock, source: "data/mock.json (offline fallback)" };
}

interface Panel {
  file: string;
  svg: string;
  must: string[];
}

async function main(): Promise<void> {
  const { raw, source } = await loadRaw();
  const mid = normalize(simulateMid(clone(raw)));
  const full = normalize(simulateAll(clone(raw), "2026-07-13")); // through the QFs

  const panels: Panel[] = [];
  for (const theme of ["dark", "light"] as const) {
    const add = (file: string, svg: string, ...must: string[]) =>
      panels.push({ file: `${file}-${theme}.svg`, svg, must });

    add("match", renderMatch(mid, { tz: "America/New_York", theme, now: SIM_NOW }), "<svg", "WORLD CUP 26");
    add("countdown", renderCountdown(mid, { tz: "America/New_York", theme }), "COUNTDOWN");
    add("today", renderToday(mid, { tz: "America/New_York", theme, now: SIM_NOW }), "TODAY");
    add("group-a", renderGroup(mid, { group: "A", theme }), "GROUP A", "advance");
    add("group-b", renderGroup(mid, { group: "B", theme }), "GROUP B");
    add("groups", renderGroups(mid, { theme }), "ALL GROUPS");
    add("r32", renderR32(mid, { theme }), "ROUND OF 32 CUT");
    add("team", renderTeam(mid, { id: "USA", tz: "America/New_York", theme, now: SIM_NOW }), "WORLD CUP 26");
    add("stats", renderStats(mid, { theme }), "TOURNAMENT STATS");
    add("scorers", renderScorers(full, { theme }), "TOP SCORERS");
    add("bracket", renderBracket(full, { theme }), "BRACKET");
  }

  mkdirSync(outDir, { recursive: true });
  let failures = 0;
  for (const p of panels) {
    writeFileSync(join(outDir, p.file), p.svg, "utf8");
    const missing = p.must.filter((s) => !p.svg.includes(s));
    if (missing.length) {
      failures++;
      console.error(`✗ ${p.file} missing: ${missing.join(", ")}`);
    } else {
      console.log(`✓ ${p.file} (${p.svg.length} bytes)`);
    }
  }

  writeFileSync(join(outDir, "index.html"), gallery(panels), "utf8");
  console.log(`\nData source: ${source}`);
  console.log(`Gallery: ${join(outDir, "index.html")}`);
  if (failures) {
    console.error(`\n${failures} panel(s) failed assertions.`);
    process.exit(1);
  }
  console.log("\nAll panels rendered and passed assertions.");
}

function gallery(panels: Panel[]): string {
  const block = (theme: "dark" | "light") => {
    const bg = theme === "dark" ? "#0d1117" : "#ffffff";
    const items = panels
      .filter((p) => p.file.endsWith(`-${theme}.svg`))
      .map((p) => `<div class="cell">${p.svg}</div>`)
      .join("\n");
    return `<section style="background:${bg}"><h2 style="color:${theme === "dark" ? "#fff" : "#000"}">${theme}</h2><div class="grid">${items}</div></section>`;
  };
  return `<!doctype html><meta charset="utf-8"><title>WC26 widget preview</title>
<style>body{margin:0;font-family:system-ui}section{padding:24px}h2{margin:0 0 12px;text-transform:capitalize}
.grid{display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start}.cell{filter:drop-shadow(0 2px 8px rgba(0,0,0,.25))}</style>
${block("dark")}${block("light")}`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
