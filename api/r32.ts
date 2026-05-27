import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderR32 } from "../lib/panels/r32.js";
import { q, sendSvg, sendError } from "../lib/respond.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await getMatches();
    sendSvg(res, renderR32(matches, { theme: q(req, "theme") }));
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
