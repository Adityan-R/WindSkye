import type { CreateFocus, DownloadFocus, Region, Section, SeedFocus } from "./store";

export interface Hint {
  keys: string;
  label: string;
}

interface HelpGroup {
  title: string;
  hints: Hint[];
}

export const HELP_GROUPS: HelpGroup[] = [
  {
    title: "Navigate",
    hints: [
      { keys: "↑ ↓ ← →, h j k l", label: "Navigate content and panes" },
      { keys: "↵", label: "Open" },
      { keys: "tab", label: "Switch pane" },
      { keys: "esc", label: "Back" },
      { keys: "o", label: "Download folder" },
      { keys: "t", label: "Browse .torrent" },
      { keys: "q", label: "Quit" },
    ],
  },
  {
    title: "Search",
    hints: [
      { keys: "/", label: "Edit search" },
      { keys: "↵", label: "Run search" },
      { keys: "s", label: "Sort results" },
      { keys: "y", label: "Copy magnet" },
      { keys: "m", label: "Paste magnet" },
    ],
  },
  {
    title: "Downloads",
    hints: [
      { keys: "p", label: "Pause/resume" },
      { keys: "c", label: "Cancel or remove from list" },
      { keys: "e", label: "Open in system explorer" },
      { keys: "f", label: "Retry failed" },
      { keys: "d", label: "Download again" },
      { keys: "x", label: "Clear recent" },
    ],
  },
  {
    title: "Seeding",
    hints: [
      { keys: "p", label: "Pause/resume" },
      { keys: "c", label: "Remove from list" },
    ],
  },
  {
    title: "Create",
    hints: [
      { keys: "n", label: "New torrent from file/folder" },
      { keys: "p", label: "Pause/resume" },
      { keys: "c", label: "Remove" },
      { keys: "y", label: "Copy magnet" },
    ],
  },
];

// Footer labels stay terse so the contextual hint row never wraps; the `?`
// overlay (HELP_GROUPS) carries the full, descriptive list.
const NAVIGATE: Hint = { keys: "↑↓←→", label: "Move" };

const ALWAYS: Hint = { keys: "?", label: "Keys" };

const SWITCH: Hint = { keys: "tab", label: "Switch" };
const T_HINT: Hint = { keys: "t", label: ".torrent" };

export function footerHints(
  region: Region,
  section: Section,
  downloadFocus?: DownloadFocus | null,
  seedFocus?: SeedFocus | null,
  createFocus?: CreateFocus,
): Hint[] {
  if (region === "sidebar") {
    return [
      NAVIGATE,
      { keys: "↵", label: "Open" },
      T_HINT,
      SWITCH,
      ALWAYS,
      { keys: "q", label: "Quit" },
    ];
  }
  if (section === "seeding") {
    const label =
      seedFocus === "seeding" ? "Pause" : seedFocus === "missing" ? "Retry" : "Resume";
    return [{ keys: "p", label }, { keys: "c", label: "Remove" }, T_HINT, SWITCH, ALWAYS];
  }
  if (section === "create") {
    const label =
      createFocus === "seeding" ? "Pause" : createFocus === "missing" ? "Retry" : "Resume";
    return [
      { keys: "n", label: "New" },
      { keys: "p", label },
      { keys: "c", label: "Remove" },
      { keys: "y", label: "Copy" },
      T_HINT,
      SWITCH,
      ALWAYS,
    ];
  }
  if (section === "downloads") {
    if (downloadFocus === "paused") {
      return [{ keys: "p", label: "Resume" }, { keys: "c", label: "Cancel" }, T_HINT, SWITCH, ALWAYS];
    }
    if (downloadFocus === "failed") {
      return [{ keys: "f", label: "Retry" }, { keys: "c", label: "Remove" }, T_HINT, SWITCH, ALWAYS];
    }
    if (downloadFocus === "recent") {
      return [
        NAVIGATE,
        { keys: "e", label: "Explorer" },
        { keys: "d", label: "Download again" },
        { keys: "c", label: "Remove" },
        { keys: "x", label: "Clear" },
        T_HINT,
        SWITCH,
        ALWAYS,
      ];
    }
    return [{ keys: "e", label: "Explorer" }, { keys: "p", label: "Pause" }, { keys: "c", label: "Cancel" }, T_HINT, SWITCH, ALWAYS];
  }
  return [
    NAVIGATE,
    { keys: "d", label: "Download" },
    T_HINT,
    { keys: "e", label: "Explorer" },
    { keys: "y", label: "Copy" },
    { keys: "s", label: "Sort" },
    { keys: "/", label: "Search" },
    SWITCH,
    ALWAYS,
  ];
}
