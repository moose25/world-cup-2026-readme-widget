// Country-name → ISO codes, keyed by the exact strings openfootball uses.
//
// `a2` (alpha-2) feeds flag rendering (flagcdn / regional-indicator emoji) in a
// later panel revision; `a3` is the 3-letter chip we show today. Knockout slots
// arrive as placeholders ("1A", "W73", "1C/2D") and are passed through verbatim.

export interface Team {
  /** Display name as it appears in the data. */
  name: string;
  /** ISO 3166-1 alpha-2, lowercased (e.g. "mx"). Empty for placeholders. */
  a2: string;
  /** 3-letter chip code (e.g. "MEX"), or the raw placeholder token. */
  a3: string;
  /** True when this is a knockout placeholder, not a qualified nation. */
  placeholder: boolean;
}

interface Entry {
  a2: string;
  a3: string;
}

// Names follow openfootball's spelling. Alternates are listed where the feed
// has used more than one form across editions.
const TABLE: Record<string, Entry> = {
  Argentina: { a2: "ar", a3: "ARG" },
  Australia: { a2: "au", a3: "AUS" },
  Austria: { a2: "at", a3: "AUT" },
  Belgium: { a2: "be", a3: "BEL" },
  Brazil: { a2: "br", a3: "BRA" },
  Cameroon: { a2: "cm", a3: "CMR" },
  Canada: { a2: "ca", a3: "CAN" },
  Chile: { a2: "cl", a3: "CHI" },
  Colombia: { a2: "co", a3: "COL" },
  "Costa Rica": { a2: "cr", a3: "CRC" },
  "Côte d'Ivoire": { a2: "ci", a3: "CIV" },
  "Ivory Coast": { a2: "ci", a3: "CIV" },
  Croatia: { a2: "hr", a3: "CRO" },
  "Czech Republic": { a2: "cz", a3: "CZE" },
  Czechia: { a2: "cz", a3: "CZE" },
  Denmark: { a2: "dk", a3: "DEN" },
  Ecuador: { a2: "ec", a3: "ECU" },
  Egypt: { a2: "eg", a3: "EGY" },
  England: { a2: "gb-eng", a3: "ENG" },
  France: { a2: "fr", a3: "FRA" },
  Germany: { a2: "de", a3: "GER" },
  Ghana: { a2: "gh", a3: "GHA" },
  Greece: { a2: "gr", a3: "GRE" },
  Iran: { a2: "ir", a3: "IRN" },
  "IR Iran": { a2: "ir", a3: "IRN" },
  Italy: { a2: "it", a3: "ITA" },
  Japan: { a2: "jp", a3: "JPN" },
  Jordan: { a2: "jo", a3: "JOR" },
  "Korea Republic": { a2: "kr", a3: "KOR" },
  "South Korea": { a2: "kr", a3: "KOR" },
  Mexico: { a2: "mx", a3: "MEX" },
  Morocco: { a2: "ma", a3: "MAR" },
  Netherlands: { a2: "nl", a3: "NED" },
  "New Zealand": { a2: "nz", a3: "NZL" },
  Nigeria: { a2: "ng", a3: "NGA" },
  Norway: { a2: "no", a3: "NOR" },
  Panama: { a2: "pa", a3: "PAN" },
  Paraguay: { a2: "py", a3: "PAR" },
  Peru: { a2: "pe", a3: "PER" },
  Poland: { a2: "pl", a3: "POL" },
  Portugal: { a2: "pt", a3: "POR" },
  Qatar: { a2: "qa", a3: "QAT" },
  "Saudi Arabia": { a2: "sa", a3: "KSA" },
  Scotland: { a2: "gb-sct", a3: "SCO" },
  Senegal: { a2: "sn", a3: "SEN" },
  Serbia: { a2: "rs", a3: "SRB" },
  Slovakia: { a2: "sk", a3: "SVK" },
  Slovenia: { a2: "si", a3: "SVN" },
  "South Africa": { a2: "za", a3: "RSA" },
  Spain: { a2: "es", a3: "ESP" },
  Sweden: { a2: "se", a3: "SWE" },
  Switzerland: { a2: "ch", a3: "SUI" },
  Tunisia: { a2: "tn", a3: "TUN" },
  Turkey: { a2: "tr", a3: "TUR" },
  Türkiye: { a2: "tr", a3: "TUR" },
  Ukraine: { a2: "ua", a3: "UKR" },
  "United States": { a2: "us", a3: "USA" },
  USA: { a2: "us", a3: "USA" },
  Uruguay: { a2: "uy", a3: "URU" },
  Uzbekistan: { a2: "uz", a3: "UZB" },
  Wales: { a2: "gb-wls", a3: "WAL" },
};

/** True for knockout slot tokens like "1A", "W73", "1C/2D". */
function isPlaceholder(name: string): boolean {
  return /\d/.test(name) || name.includes("/");
}

/** Derive a 3-letter chip from an unknown name (best-effort fallback). */
function deriveCode(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  return letters.slice(0, 3) || name.slice(0, 3).toUpperCase();
}

export function lookupTeam(name: string): Team {
  const raw = name.trim();
  if (isPlaceholder(raw)) {
    return { name: raw, a2: "", a3: raw, placeholder: true };
  }
  const hit = TABLE[raw];
  if (hit) return { name: raw, a2: hit.a2, a3: hit.a3, placeholder: false };
  return { name: raw, a2: "", a3: deriveCode(raw), placeholder: false };
}
