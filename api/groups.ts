import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderGroups } from "../lib/panels/groups.js";
import { q, sendSvg, sendError } from "../lib/respond.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await getMatches();
    sendSvg(res, renderGroups(matches, { theme: q(req, "theme") }));
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
