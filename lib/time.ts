// Parsing and timezone formatting for openfootball time strings.
//
// openfootball encodes kickoff as e.g. "13:00 UTC-6" alongside a "2026-06-11"
// date. The embedded UTC offset lets us resolve an exact instant and then
// re-render it in any IANA timezone the caller asks for.

/** Resolve an openfootball date + time string to an absolute UTC instant. */
export function toInstant(date: string, time: string): Date | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const tm = /^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})(?::?(\d{2}))?$/.exec(
    time.trim()
  );
  if (!dm || !tm) return null;

  const [, yy, mo, dd] = dm;
  const [, hh, mm, offH, offM] = tm;
  const offsetHours = Number(offH);
  const offsetMinutes = (offsetHours < 0 ? -1 : 1) * Number(offM ?? 0);

  // local = UTC + offset  =>  UTC = local - offset
  const utcMs = Date.UTC(
    Number(yy),
    Number(mo) - 1,
    Number(dd),
    Number(hh) - offsetHours,
    Number(mm) - offsetMinutes
  );
  return new Date(utcMs);
}

/** A safe default when no `tz` query param is supplied. */
export const DEFAULT_TZ = "UTC";

/** Validate an IANA timezone, falling back to UTC if it is unknown. */
export function safeTimeZone(tz: string | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

/** e.g. "Thu 11 Jun, 7:00 PM" plus a short tz abbreviation. */
export function formatKickoff(instant: Date, tz: string): string {
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(instant);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
  }).format(instant);
  return `${datePart}, ${timePart}`;
}

/** Short timezone label like "EDT" or "GMT+1" for display next to a time. */
export function tzAbbrev(instant: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(instant);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
}

/** True if `instant` falls on the same calendar day as `now` in `tz`. */
export function isSameDay(instant: Date, now: Date, tz: string): boolean {
  const key = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  return key(instant) === key(now);
}
