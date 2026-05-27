// Minimal SVG primitives. Renderers compose these into a card; everything is a
// plain string so there's no runtime dependency and output is deterministic.

import type { Theme } from "./theme.js";
import { FLAGS } from "./flags-data.js";

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const MONO =
  "ui-monospace, 'SF Mono', 'Cascadia Mono', Menlo, Consolas, monospace";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill: string; r?: number; stroke?: string; sw?: number }
): string {
  const r = opts.r ?? 0;
  const stroke = opts.stroke
    ? ` stroke="${opts.stroke}" stroke-width="${opts.sw ?? 1}"`
    : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${opts.fill}"${stroke}/>`;
}

export interface TextOpts {
  x: number;
  y: number;
  size: number;
  fill: string;
  weight?: number | string;
  anchor?: "start" | "middle" | "end";
  mono?: boolean;
  opacity?: number;
}

export function text(content: string, o: TextOpts): string {
  const anchor = o.anchor ?? "start";
  const weight = o.weight ?? 400;
  const family = o.mono ? MONO : FONT;
  const opacity = o.opacity !== undefined ? ` opacity="${o.opacity}"` : "";
  return `<text x="${o.x}" y="${o.y}" font-family="${family}" font-size="${o.size}" font-weight="${weight}" fill="${o.fill}" text-anchor="${anchor}"${opacity}>${esc(content)}</text>`;
}

/** A small rounded code chip, e.g. "MEX". Returns the markup; width is fixed. */
export function chip(
  x: number,
  y: number,
  label: string,
  theme: Theme,
  opts: { w?: number; h?: number; bg?: string; fg?: string } = {}
): string {
  const w = opts.w ?? 46;
  const h = opts.h ?? 22;
  return (
    rect(x, y, w, h, { fill: opts.bg ?? theme.chipBg, r: 5 }) +
    text(label, {
      x: x + w / 2,
      y: y + h / 2 + 4.5,
      size: 12.5,
      fill: opts.fg ?? theme.chipText,
      weight: 700,
      anchor: "middle",
      mono: true,
    })
  );
}

/** Filled status dot. */
export function dot(x: number, y: number, r: number, fill: string): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
}

/**
 * A rounded flag image (base64, no network) for an alpha-2 code. Returns "" if
 * the flag isn't bundled, so callers can fall back to a code chip. The clip-path
 * id is derived from position to stay unique within a single document.
 */
export function flagImage(
  x: number,
  y: number,
  w: number,
  h: number,
  a2: string,
  theme: Theme
): string {
  const data = FLAGS[a2];
  if (!data) return "";
  const id = `fl${Math.round(x)}_${Math.round(y)}`;
  return (
    `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ry="3"/></clipPath>` +
    `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${data}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ry="3" fill="none" stroke="${theme.border}" stroke-width="0.75"/>`
  );
}

/** Flag if available, else a code chip occupying the same footprint. */
export function teamMark(
  x: number,
  yMid: number,
  team: { a2: string; a3: string },
  theme: Theme,
  w: number,
  h: number
): string {
  const flag = flagImage(x, yMid - h / 2, w, h, team.a2, theme);
  if (flag) return flag;
  return chip(x, yMid - h / 2, team.a3, theme, { w: Math.max(w, 34), h });
}

export interface DocOpts {
  width: number;
  height: number;
  theme: Theme;
  body: string;
  /** Outer card title, drawn in the header bar. */
  title?: string;
  /** Right-aligned status text in the header (e.g. "LIVE 67'"). */
  badge?: string;
  badgeColor?: string;
}

const HEADER_H = 34;

/** Wrap body markup in a titled, bordered card the size of a README image. */
export function card(o: DocOpts): string {
  const { width: w, height: h, theme } = o;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">`
  );
  // Card background + border.
  parts.push(rect(0.5, 0.5, w - 1, h - 1, { fill: theme.card, r: 10, stroke: theme.border }));

  if (o.title !== undefined) {
    // Header bar with a bottom divider.
    parts.push(
      `<path d="M0.5 ${HEADER_H} H${w - 0.5}" stroke="${theme.border}" stroke-width="1"/>`
    );
    parts.push(rect(0.5, 0.5, w - 1, HEADER_H - 0.5, { fill: theme.headerBg, r: 10 }));
    // Cover the lower rounded corners of the header so it meets the divider squarely.
    parts.push(rect(0.5, HEADER_H - 10, w - 1, 10, { fill: theme.headerBg }));
    parts.push(
      text(o.title, {
        x: 14,
        y: 22,
        size: 12,
        fill: theme.dim,
        weight: 700,
      })
    );
    if (o.badge) {
      parts.push(dot(w - 16 - measure(o.badge) - 12, 18, 4, o.badgeColor ?? theme.accent));
      parts.push(
        text(o.badge, {
          x: w - 14,
          y: 22,
          size: 11.5,
          fill: o.badgeColor ?? theme.accent,
          weight: 700,
          anchor: "end",
        })
      );
    }
  }

  parts.push(o.body);
  parts.push("</svg>");
  return parts.join("");
}

export const HEADER_HEIGHT = HEADER_H;

// Rough text width estimate (px) for right-aligned badge dot placement.
function measure(s: string): number {
  return s.length * 6.6;
}
