import type { SourceId } from "../sources/types";

export const COLOR = {
  accent: "#60a5fa",
  text: "#f8fafc",
  alt: "#93c5fd",
  good: "#86d6a2",
  warn: "#f0c560",
  bad: "#ee7d92",
  bright: "#bfdbfe",
  dim: "#6b7280",
  logoHighlight: "#dbeafe",
  logoTop: "#93c5fd",
  logoMid: "#3b82f6",
  logoBase: "#2563eb",
  logoShade: "#1d4ed8",
};

export const ICON = {
  done: "✔",
  error: "✖",
  pending: "⋯",
  pointer: "▶",
  dot: "•",
  warn: "⚠",
  bar: "┃",
  down: "↓",
  up: "↑",
  peer: "•",
  pause: "⏸",
  create: "＋",
} as const;

export const RULE = "#6b6577";

export const GUTTER = 2;

export const SOURCE_STYLE: Record<SourceId, { tag: string; color: string }> = {
  fitgirl: { tag: "FG", color: COLOR.accent },
  yts: { tag: "YTS", color: COLOR.good },
  eztv: { tag: "EZTV", color: COLOR.warn },
  nyaa: { tag: "NYAA", color: COLOR.bright },
  subsplease: { tag: "SUB", color: "#b9a7e6" },
  solid: { tag: "SLD", color: "#60a5fa" },
  "tpb-movies": { tag: "TPB", color: "#5fd0c5" },
  "tpb-tv": { tag: "TPB", color: "#5fd0c5" },
  "x1337-movies": { tag: "1337", color: "#f6a55c" },
  "x1337-tv": { tag: "1337", color: "#f6a55c" },
};

const THEMES: Record<string, typeof COLOR> = {
  default: {
    accent: "#60a5fa",
    text: "#f8fafc",
    alt: "#93c5fd",
    good: "#86d6a2",
    warn: "#f0c560",
    bad: "#ee7d92",
    bright: "#bfdbfe",
    dim: "#6b7280",
    logoHighlight: "#dbeafe",
    logoTop: "#93c5fd",
    logoMid: "#3b82f6",
    logoBase: "#2563eb",
    logoShade: "#1d4ed8",
  },
  dracula: {
    accent: "#bd93f9",
    text: "#f8f8f2",
    alt: "#ff79c6",
    good: "#50fa7b",
    warn: "#f1fa8c",
    bad: "#ff5555",
    bright: "#d6acff",
    dim: "#6272a4",
    logoHighlight: "#e2c5ff",
    logoTop: "#d6acff",
    logoMid: "#bd93f9",
    logoBase: "#9d65ff",
    logoShade: "#7b32ff",
  },
  nord: {
    accent: "#88c0d0",
    text: "#eceff4",
    alt: "#8fbcbb",
    good: "#a3be8c",
    warn: "#ebcb8b",
    bad: "#bf616a",
    bright: "#e5e9f0",
    dim: "#4c566a",
    logoHighlight: "#eceff4",
    logoTop: "#e5e9f0",
    logoMid: "#88c0d0",
    logoBase: "#81a1c1",
    logoShade: "#5e81ac",
  },
  light: {
    accent: "#2563eb",
    text: "#0f172a",
    alt: "#3b82f6",
    good: "#16a34a",
    warn: "#d97706",
    bad: "#dc2626",
    bright: "#1d4ed8",
    dim: "#94a3b8",
    logoHighlight: "#60a5fa",
    logoTop: "#3b82f6",
    logoMid: "#2563eb",
    logoBase: "#1d4ed8",
    logoShade: "#1e40af",
  },
};

export const AVAILABLE_THEMES = Object.keys(THEMES);

export function applyTheme(name: string): void {
  const palette = THEMES[name] || THEMES.default;
  Object.assign(COLOR, palette);
  ACCENT_RAMP[0] = COLOR.accent;
  ACCENT_RAMP[1] = COLOR.bright;
  SOURCE_STYLE.fitgirl.color = COLOR.accent;
  SOURCE_STYLE.yts.color = COLOR.good;
  SOURCE_STYLE.eztv.color = COLOR.warn;
  SOURCE_STYLE.nyaa.color = COLOR.bright;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

export const ACCENT_RAMP: [string, string] = [COLOR.accent, COLOR.bright];
