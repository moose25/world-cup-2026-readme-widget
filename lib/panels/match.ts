// Hero panel: the live match, or the next kickoff, or the latest result.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, chip, flagImage, text } from "../svg.js";
import type { Team } from "../teams.js";
import { formatKickoff, tzAbbrev } from "../time.js";

const LIVE_COLOR = "#f85149";
const LIVE_WINDOW_MS = 2 * 60 * 60 * 1000; // assume a match lasts ~2h

type State = "live" | "ft" | "upcoming";

interface Picked {
  match: Match;
  state: State;
}

/** live (earliest) → next upcoming → most recent finished. */
export function pickMatch(matches: Match[], now: Date): Picked | null {
  const withInstant = matches.filter((m) => m.instant);
  const live = withInstant
    .filter(
      (m) =>
        !m.finished &&
        m.instant!.getTime() <= now.getTime() &&
        now.getTime() - m.instant!.getTime() < LIVE_WINDOW_MS
    )
    .sort((a, b) => a.instant!.getTime() - b.instant!.getTime());
  if (live[0]) return { match: live[0], state: "live" };

  const upcoming = withInstant
    .filter((m) => !m.finished && m.instant!.getTime() > now.getTime())
    .sort((a, b) => a.instant!.getTime() - b.instant!.getTime());
  if (upcoming[0]) return { match: upcoming[0], state: "upcoming" };

  const finished = withInstant
    .filter((m) => m.finished)
    .sort((a, b) => b.instant!.getTime() - a.instant!.getTime());
  if (finished[0]) return { match: finished[0], state: "ft" };

  return null;
}

function context(m: Match): string {
  if (m.group) return `WORLD CUP 26 · GROUP ${m.group}`;
  return `WORLD CUP 26 · ${m.round.toUpperCase()}`;
}

export interface MatchOpts {
  tz: string;
  theme: string | undefined;
  now?: Date;
}

const W = 460;
const H = 160;

export function renderMatch(matches: Match[], opts: MatchOpts): string {
  const theme = getTheme(opts.theme);
  const now = opts.now ?? new Date();
  const picked = pickMatch(matches, now);

  if (!picked) {
    return card({
      width: W,
      height: H,
      theme,
      title: "WORLD CUP 26",
      body: text("No fixtures available", {
        x: W / 2,
        y: H / 2 + 8,
        size: 14,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  const { match: m, state } = picked;
  const badge =
    state === "live" ? "LIVE" : state === "ft" ? "FULL TIME" : "UPCOMING";
  const badgeColor =
    state === "live" ? LIVE_COLOR : state === "ft" ? theme.dim : theme.accent;

  const body: string[] = [];
  body.push(...teamCluster(m.team1, 92, theme));
  body.push(...teamCluster(m.team2, W - 92, theme));

  // Center: score for live/ft, "vs" otherwise.
  if (state === "upcoming") {
    body.push(
      text("vs", {
        x: W / 2,
        y: 96,
        size: 20,
        fill: theme.dim,
        weight: 600,
        anchor: "middle",
      })
    );
  } else {
    body.push(
      text(`${m.score1} – ${m.score2}`, {
        x: W / 2,
        y: 102,
        size: 34,
        fill: theme.text,
        weight: 800,
        anchor: "middle",
        mono: true,
      })
    );
  }

  // Footer line(s): kickoff (your timezone) and venue.
  const lines: string[] = [];
  if (m.instant) {
    const ko = `${formatKickoff(m.instant, opts.tz)} ${tzAbbrev(m.instant, opts.tz)}`;
    lines.push(state === "upcoming" ? ko : `${badge === "FULL TIME" ? "FT" : badge} · ${ko}`);
  }
  if (m.ground) lines.push(m.ground);
  lines.slice(0, 2).forEach((line, i) =>
    body.push(
      text(line, {
        x: W / 2,
        y: 130 + i * 16,
        size: 11.5,
        fill: theme.dim,
        anchor: "middle",
      })
    )
  );

  return card({
    width: W,
    height: H,
    theme,
    title: context(m),
    badge,
    badgeColor,
    body: body.join(""),
  });
}

/** Flag (or code chip fallback) with the full team name centered beneath it. */
function teamCluster(team: Team, cx: number, theme: Theme): string[] {
  const fw = 48;
  const fh = 32;
  const flag = flagImage(cx - fw / 2, 56, fw, fh, team.a2, theme);
  const mark =
    flag || chip(cx - 29, 58, team.a3, theme, { w: 58, h: 30 });
  return [
    mark,
    text(truncate(team.name, 16), {
      x: cx,
      y: 112,
      size: 13,
      fill: theme.text,
      weight: 600,
      anchor: "middle",
    }),
  ];
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
