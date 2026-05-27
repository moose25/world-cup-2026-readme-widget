// Countdown panel: days to kickoff before the tournament, a day-of-N counter
// while it's underway, and a done state afterward. Derives both the opener and
// the final straight from the fixture list.

import type { Match } from "../data.js";
import { getTheme } from "../theme.js";
import { card, text } from "../svg.js";

const W = 360;
const H = 132;
const DAY = 86_400_000;

export interface CountdownOpts {
  tz: string;
  theme: string | undefined;
  now?: Date;
}

export function renderCountdown(matches: Match[], opts: CountdownOpts): string {
  const theme = getTheme(opts.theme);
  const now = opts.now ?? new Date();
  const sorted = matches
    .filter((m) => m.instant)
    .sort((a, b) => a.instant!.getTime() - b.instant!.getTime());

  if (sorted.length === 0) {
    return card({
      width: W,
      height: H,
      theme,
      title: "WORLD CUP 26 · COUNTDOWN",
      body: text("No fixtures available", {
        x: W / 2,
        y: H / 2 + 8,
        size: 13,
        fill: theme.dim,
        anchor: "middle",
      }),
    });
  }

  const opener = sorted[0]!;
  const first = opener.instant!.getTime();
  const final = sorted[sorted.length - 1]!.instant!.getTime();
  const t = now.getTime();

  let big: string;
  let label: string;
  let sub: string;

  if (t < first) {
    const days = Math.ceil((first - t) / DAY);
    big = String(days);
    label = days === 1 ? "DAY TO KICKOFF" : "DAYS TO KICKOFF";
    sub = `${shortDate(opener.instant!, opts.tz)} · ${opener.team1.name} v ${opener.team2.name}`;
  } else if (t <= final) {
    const dayIndex = Math.floor((t - first) / DAY) + 1;
    const total = Math.floor((final - first) / DAY) + 1;
    big = String(dayIndex);
    label = `OF ${total} · UNDERWAY`;
    sub = `Final · ${shortDate(sorted[sorted.length - 1]!.instant!, opts.tz)}`;
  } else {
    big = "FT";
    label = "TOURNAMENT COMPLETE";
    sub = `Ended ${shortDate(sorted[sorted.length - 1]!.instant!, opts.tz)}`;
  }

  const body = [
    text(big, {
      x: W / 2,
      y: 86,
      size: 54,
      fill: theme.accent,
      weight: 800,
      anchor: "middle",
      mono: true,
    }),
    text(label, {
      x: W / 2,
      y: 107,
      size: 11.5,
      fill: theme.dim,
      weight: 700,
      anchor: "middle",
    }),
    text(truncate(sub, 48), {
      x: W / 2,
      y: 123,
      size: 10.5,
      fill: theme.dim,
      anchor: "middle",
    }),
  ].join("");

  return card({ width: W, height: H, theme, title: "WORLD CUP 26 · COUNTDOWN", body });
}

function shortDate(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    day: "numeric",
    month: "short",
  }).format(instant);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
