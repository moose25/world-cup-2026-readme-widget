import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMatches } from "../lib/data.js";
import { renderCountdown } from "../lib/panels/countdown.js";
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
      renderCountdown(matches, {
        tz: safeTimeZone(q(req, "tz")),
        theme: q(req, "theme"),
      })
    );
  } catch (err) {
    sendError(res, err, q(req, "theme"));
  }
}
