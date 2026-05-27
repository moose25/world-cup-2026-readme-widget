// Composite-action worker: download the requested panels as SVG files and,
// if the README has WC26 markers, refresh the <img> block between them.
// No dependencies — uses Node 20+ global fetch on the runner.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const inp = (key, dflt = "") =>
  process.env[`INPUT_${key.toUpperCase().replace(/-/g, "_")}`]?.trim() || dflt;

const base = inp("base-url", "https://world-cup-2026-readme-widget.vercel.app").replace(/\/+$/, "");
const tz = inp("tz", "UTC");
const theme = inp("theme", "dark");
const outDir = inp("out-dir", ".github/wc26");
const readme = inp("readme", "README.md");
const panels = inp("panels", "countdown,match,r32")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TZ_PANELS = new Set(["countdown", "match", "team"]);
const START = "<!-- WC26:START -->";
const END = "<!-- WC26:END -->";

await mkdir(outDir, { recursive: true });

const used = new Map();
const embeds = [];
let failed = 0;

for (const entry of panels) {
  const [path, query = ""] = entry.split("?");
  const qs = new URLSearchParams(query);
  if (!qs.has("theme")) qs.set("theme", theme);
  if (TZ_PANELS.has(path) && !qs.has("tz")) qs.set("tz", tz);

  const url = `${base}/${path}?${qs.toString()}`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "wc26-widget-action" } });
  } catch (e) {
    console.error(`✗ ${path}: ${e}`);
    failed++;
    continue;
  }
  if (!res.ok) {
    console.error(`✗ ${path}: HTTP ${res.status}`);
    failed++;
    continue;
  }

  const svg = await res.text();
  const n = (used.get(path) ?? 0) + 1;
  used.set(path, n);
  const name = n > 1 ? `${path}-${n}` : path;
  const file = `${outDir}/${name}.svg`;
  await writeFile(file, svg, "utf8");
  embeds.push(`<img src="${file}" alt="World Cup 2026 — ${path}" />`);
  console.log(`✓ ${file}`);
}

if (existsSync(readme)) {
  const md = await readFile(readme, "utf8");
  if (md.includes(START) && md.includes(END)) {
    const block = `${START}\n${embeds.join("\n")}\n${END}`;
    const next = md.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
    if (next !== md) {
      await writeFile(readme, next, "utf8");
      console.log(`Updated WC26 block in ${readme}`);
    }
  }
}

if (failed > 0) process.exitCode = 1;
