import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderScorers } from "../lib/panels/scorers.js";
import { q, sendSvg, sendError } from "../lib/respond.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await getMatches();
    sendSvg(res, renderScorers(matches, { theme: q(req, "theme") }));
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
