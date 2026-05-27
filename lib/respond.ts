// Shared helpers for the serverless image handlers.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { card, text } from "./svg.js";
import { getTheme } from "./theme.js";

/** Read a single-valued query param. */
export function q(req: VercelRequest, key: string): string | undefined {
  const v = req.query[key];
  return Array.isArray(v) ? v[0] : v;
}

const CACHE =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export function sendSvg(res: VercelResponse, svg: string): void {
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE);
  res.status(200).send(svg);
}

/** Render the error as an image so the README shows a card, not a broken icon. */
export function sendError(
  res: VercelResponse,
  err: unknown,
  themeName?: string
): void {
  const theme = getTheme(themeName);
  const msg = err instanceof Error ? err.message : "Unknown error";
  const svg = card({
    width: 460,
    height: 80,
    theme,
    title: "WORLD CUP 26",
    badge: "ERROR",
    badgeColor: "#f85149",
    body: text(msg.slice(0, 60), {
      x: 230,
      y: 62,
      size: 12,
      fill: theme.dim,
      anchor: "middle",
    }),
  });
  // Short cache on errors so a transient upstream blip clears quickly.
  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
  res.status(200).send(svg);
}
