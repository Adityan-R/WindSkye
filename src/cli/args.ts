/** Represents parsed command line execution mode and arguments. */
export type CliCommand =
  | { kind: "version" }
  | { kind: "help" }
  | { kind: "run"; initialMagnet?: string; initialTorrent?: string }
  | { kind: "invalid"; arg: string };

/**
 * Parses process command-line arguments into a structured CliCommand.
 */
export function parseCliArgs(argv: string[]): CliCommand {
  const args = argv.filter((a) => a.trim() !== "");
  if (args.length === 0) return { kind: "run" };
  const a = args[0]!;
  if (a === "--version" || a === "-v") return { kind: "version" };
  if (a === "--help" || a === "-h") return { kind: "help" };
  if (/^magnet:\?/i.test(a)) return { kind: "run", initialMagnet: a };
  if (/\.torrent$/i.test(a)) return { kind: "run", initialTorrent: a };
  return { kind: "invalid", arg: a };
}

export const HELP_TEXT = `windskye, terminal-native torrent search

usage
  windskye                      open the search TUI
  windskye "magnet:?xt=..."     start a download on launch
  windskye path/to/file.torrent open a .torrent file on launch
  windskye --version            print the version

once open: type to search every source at once, enter to run, arrows to move,
d to download, ? for keys
tip: quote magnet links (they contain & characters)
`;
