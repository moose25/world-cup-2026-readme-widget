import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderTeam } from "../lib/panels/team.js";
import { safeTimeZone } from "../lib/time.js";
import { q, sendSvg, sendError } from "../lib/respond.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await getMatches();
    sendSvg(
      res,
      renderTeam(matches, {
        id: q(req, "id") ?? q(req, "team") ?? "USA",
        tz: safeTimeZone(q(req, "tz")),
        theme: q(req, "theme"),
      })
    );
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
