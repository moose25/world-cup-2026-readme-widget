// Today's fixtures: every match on the current calendar day (in the caller's
// timezone), with kickoff time, or score once a game is under way / finished.

import type { Match } from "../data.js";
import { getTheme, type Theme } from "../theme.js";
import { card, chip, flagImage, rect, text } from "../svg.js";
import { isSameDay } from "../time.js";

const W = 480;
const TOP = 50;
const ROW = 30;
const LIVE_MS = 2 * 60 * 60 * 1000;
const LIVE_COLOR = "#f85149";

export interface TodayOpts {
  tz: string;
  theme: string | undefined;
  now?: Date;
}

function timeIn(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
}

function dayLabel(tz: string, instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(instant);
}

const ROUND_SHORT: Record<string, string> = {
  "Round of 32": "R32",
  "Round of 16": "R16",
  "Quarter-final": "QF",
  "Semi-final": "SF",
  "Match for third place": "3rd",
  Final: "Final",
};

export function renderToday(matches: Match[], opts: TodayOpts): string {
  const theme = getTheme(opts.theme);
  const now = opts.now ?? new Date();
  const withInstant = matches
    .filter((m) => m.instant)
    .sort((a, b) => a.instant!.getTime() - b.instant!.getTime());
  const todays = withInstant.filter((m) => isSameDay(m.instant!, now, opts.tz));
  const title = "WORLD CUP 26 · TODAY";
  const badge = dayLabel(opts.tz, now);

  if (todays.length === 0) {
    const next = withInstant.find((m) => m.instant!.getTime() > now.getTime());
    const body = [
      text("No matches today", {
        x: W / 2,
        y: 62,
        size: 15,
        fill: theme.text,
        weight: 700,
        anchor: "middle",
      }),
      next
        ? text(
            `Next: ${dayLabel(opts.tz, next.instant!)} · ${next.team1.name} v ${next.team2.name}`,
            { x: W / 2, y: 86, size: 12, fill: theme.dim, anchor: "middle" }
          )
        : "",
    ].join("");
    return card({ width: W, height: 108, theme, title, badge, badgeColor: theme.accent, body });
  }

  const body: string[] = [];
  todays.forEach((m, i) => body.push(...row(m, i, opts.tz, now, theme)));
  const height = TOP + todays.length * ROW + 14;
  return card({ width: W, height, theme, title, badge, badgeColor: theme.accent, body: body.join("") });
}

function row(m: Match, i: number, tz: string, now: Date, theme: Theme): string[] {
  const yTop = TOP + i * ROW;
  const mid = yTop + ROW / 2;
  const base = mid + 4;
  const out: string[] = [];
  if (i % 2 === 1) out.push(rect(8, yTop, W - 16, ROW, { fill: theme.headerBg, r: 5 }));

  const t = now.getTime();
  const live =
    !m.finished && m.instant!.getTime() <= t && t - m.instant!.getTime() < LIVE_MS;
  const started = m.finished || live;

  // Kickoff time (or LIVE highlight).
  out.push(
    text(live ? "LIVE" : timeIn(tz, m.instant!), {
      x: 14,
      y: base,
      size: 11,
      fill: live ? LIVE_COLOR : theme.dim,
      weight: live ? 700 : 400,
    })
  );

  // Team 1 (flag + code).
  out.push(mark(70, mid, m.team1, theme));
  out.push(text(m.team1.a3, { x: 98, y: base, size: 12.5, fill: theme.text, weight: 600 }));

  // Center: score once started, else "v".
  const center = started ? `${m.score1 ?? 0}–${m.score2 ?? 0}` : "v";
  out.push(
    text(center, {
      x: W / 2,
      y: base,
      size: 13,
      fill: started ? (live ? LIVE_COLOR : theme.text) : theme.dim,
      weight: started ? 800 : 600,
      anchor: "middle",
      mono: started,
    })
  );

  // Team 2 (code + flag).
  out.push(text(m.team2.a3, { x: W - 98, y: base, size: 12.5, fill: theme.text, weight: 600, anchor: "end" }));
  out.push(mark(W - 92, mid, m.team2, theme));

  // Group / round tag.
  const tag = m.group ? `Grp ${m.group}` : ROUND_SHORT[m.round] ?? "";
  if (tag) out.push(text(tag, { x: W - 14, y: base, size: 10, fill: theme.dim, anchor: "end" }));
  return out;
}

function mark(x: number, mid: number, team: { a2: string; a3: string }, theme: Theme): string {
  const flag = flagImage(x, mid - 7, 22, 14, team.a2, theme);
  return flag || chip(x, mid - 9, team.a3, theme, { w: 22, h: 18 });
}
