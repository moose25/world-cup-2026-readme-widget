// Track-a-team panel: a team's group position, qualification status, and its
// next fixture (or latest result) in the caller's timezone.

import type { Match } from "../data.js";
import { getTheme, statusColor, type Theme } from "../theme.js";
import { card, chip, flagImage, text } from "../svg.js";
import { computeGroups, type TeamRow } from "../standings.js";
import { formatKickoff, tzAbbrev } from "../time.js";

const W = 460;
const H = 152;

export interface TeamOpts {
  id: string;
  tz: string;
  theme: string | undefined;
  now?: Date;
}

interface Found {
  row: TeamRow;
  group: string;
  index: number;
}

/** Match an id against a3 code, alpha-2, or full name (case-insensitive). */
function findTeam(matches: Match[], id: string): Found | null {
  const key = id.trim().toLowerCase();
  for (const t of computeGroups(matches)) {
    const idx = t.rows.findIndex(
      (r) =>
        r.team.a3.toLowerCase() === key ||
        r.team.a2.toLowerCase() === key ||
        r.team.name.toLowerCase() === key
    );
    if (idx >= 0) return { row: t.rows[idx]!, group: t.group, index: idx };
  }
  return null;
}

function ordinal(n: number): string {
  return ["1st", "2nd", "3rd", "4th"][n] ?? `${n + 1}th`;
}

const LIVE_MS = 2 * 60 * 60 * 1000;

export function renderTeam(matches: Match[], opts: TeamOpts): string {
  const theme = getTheme(opts.theme);
  const now = opts.now ?? new Date();
  const found = findTeam(matches, opts.id);

  if (!found) {
    return card({
      width: W,
      height: H,
      theme,
      title: "WORLD CUP 26 · TEAM",
      body: text(`Team "${opts.id}" not found — try a code like USA or ESP`, {
        x: W / 2,
        y: H / 2 + 6,
        size: 12.5,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  const { row, group, index } = found;
  const team = row.team;
  const played = row.played > 0;

  // Status badge: neutral before kickoff, qualification-based once playing.
  let badge: string;
  let badgeColor: string;
  if (!played) {
    badge = `GROUP ${group}`;
    badgeColor = theme.accent;
  } else {
    badge =
      row.status === "advance"
        ? "ADVANCING"
        : row.status === "third-in"
          ? "3RD — QUALIFYING"
          : row.status === "third-out"
            ? "3RD — OUTSIDE"
            : "ELIMINATED";
    badgeColor = statusColor(theme, row.status);
  }

  const body: string[] = [];
  const flag = flagImage(18, 48, 52, 35, team.a2, theme);
  body.push(flag || chip(18, 52, team.a3, theme, { w: 52, h: 28 }));
  body.push(
    text(team.name, { x: 82, y: 66, size: 19, fill: theme.text, weight: 800 })
  );
  body.push(
    text(
      `Group ${group} · ${ordinal(index)} · ${row.pts} pt${row.pts === 1 ? "" : "s"} · ${row.played} played`,
      { x: 82, y: 86, size: 12, fill: theme.dim }
    )
  );

  // Divider + fixture strip.
  body.push(
    `<path d="M14 104 H${W - 14}" stroke="${theme.border}" stroke-width="1"/>`
  );
  body.push(...fixtureStrip(matches, team.name, opts.tz, now, theme));

  return card({
    width: W,
    height: H,
    theme,
    title: `WORLD CUP 26 · ${team.a3}`,
    badge,
    badgeColor,
    body: body.join(""),
  });
}

/** "NEXT · …" upcoming/live fixture, else "LAST · …" most recent result. */
function fixtureStrip(
  matches: Match[],
  name: string,
  tz: string,
  now: Date,
  theme: Theme
): string[] {
  const mine = matches
    .filter((m) => (m.team1.name === name || m.team2.name === name) && m.instant)
    .sort((a, b) => a.instant!.getTime() - b.instant!.getTime());

  const t = now.getTime();
  const live = mine.find(
    (m) => !m.finished && m.instant!.getTime() <= t && t - m.instant!.getTime() < LIVE_MS
  );
  const next = mine.find((m) => !m.finished && m.instant!.getTime() > t);
  const last = [...mine].reverse().find((m) => m.finished);
  const m = live ?? next ?? last;
  if (!m) return [];

  const opp = m.team1.name === name ? m.team2 : m.team1;
  const label = m === last && !live ? "LAST" : live ? "LIVE" : "NEXT";
  const y = 128;

  if (m.finished && (m === last || live)) {
    // Show the scoreline from this team's perspective.
    const mine1 = m.team1.name === name;
    const us = mine1 ? m.score1 : m.score2;
    const them = mine1 ? m.score2 : m.score1;
    return [
      text(label, { x: 14, y, size: 11, fill: theme.dim, weight: 700 }),
      text(`${team3(name, m)} ${us}–${them} ${opp.a3}`, {
        x: 64,
        y,
        size: 13,
        fill: theme.text,
        weight: 600,
      }),
      m.ground
        ? text(m.ground, { x: W - 14, y, size: 11, fill: theme.dim, anchor: "end" })
        : "",
    ];
  }

  const when = m.instant
    ? `${formatKickoff(m.instant, tz)} ${tzAbbrev(m.instant, tz)}`
    : "";
  return [
    text(label, { x: 14, y, size: 11, fill: theme.dim, weight: 700 }),
    text(`vs ${opp.name}`, { x: 64, y, size: 13, fill: theme.text, weight: 600 }),
    text(when, { x: W - 14, y, size: 11, fill: theme.dim, anchor: "end" }),
  ];
}

function team3(name: string, m: Match): string {
  return (m.team1.name === name ? m.team1 : m.team2).a3;
}
