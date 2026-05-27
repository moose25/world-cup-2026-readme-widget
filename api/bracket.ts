import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderBracket } from "../lib/panels/bracket.js";
import { q, sendSvg, sendError } from "../lib/respond.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await getMatches();
    sendSvg(res, renderBracket(matches, { theme: q(req, "theme") }));
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
