export const LOGO_LINES: readonly string[] = [
  "                                ",
  " █ █ █ █ █▄ █ █▀▄ █▀▀ █ ▄ █ █ █▀▀",
  " ▀▄▀▄▀ █ █ ▀█ █▄▀ ▄▄█ █▀  ▀█▀ █▄▄",
];

export const LOGO_WIDTH = Math.max(...LOGO_LINES.map((l) => [...l].length));

export const SPROUT_CELLS: ReadonlySet<string> = new Set([]);
