// Color palettes. Values track GitHub Primer so panels sit naturally in a
// README in either light or dark mode. Callers pass `?theme=light|dark`.

export interface Theme {
  bg: string;
  card: string;
  headerBg: string;
  border: string;
  text: string;
  dim: string;
  accent: string;
  advance: string; // top-2 qualification
  warn: string; // third-place, in the race
  out: string; // eliminated / not advancing
  chipBg: string;
  chipText: string;
}

const DARK: Theme = {
  bg: "#0d1117",
  card: "#161b22",
  headerBg: "#1f2630",
  border: "#30363d",
  text: "#e6edf3",
  dim: "#8b949e",
  accent: "#58a6ff",
  advance: "#3fb950",
  warn: "#d29922",
  out: "#6e7681",
  chipBg: "#21262d",
  chipText: "#e6edf3",
};

const LIGHT: Theme = {
  bg: "#ffffff",
  card: "#f6f8fa",
  headerBg: "#eaeef2",
  border: "#d0d7de",
  text: "#1f2328",
  dim: "#656d76",
  accent: "#0969da",
  advance: "#1a7f37",
  warn: "#9a6700",
  out: "#8c959f",
  chipBg: "#eaeef2",
  chipText: "#1f2328",
};

export type ThemeName = "dark" | "light";

export function getTheme(name: string | undefined): Theme {
  return name === "light" ? LIGHT : DARK;
}

export function statusColor(
  theme: Theme,
  status: "advance" | "third-in" | "third-out" | "out"
): string {
  switch (status) {
    case "advance":
      return theme.advance;
    case "third-in":
      return theme.warn;
    case "third-out":
    case "out":
      return theme.out;
  }
}
