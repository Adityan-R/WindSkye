import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { platform } from "node:process";
import { COLOR, ICON } from "../theme";
import { wrapStep, windowStart } from "../move";
import { truncate, formatBytes } from "../../util/format";
import { Panel } from "./Panel";

interface Entry {
  name: string;
  isDir: boolean;
  size?: number;
}

async function getWindowsDrives(): Promise<string[]> {
  const drives: string[] = [];
  for (let i = 65; i <= 90; i++) {
    const drive = String.fromCharCode(i) + ":\\";
    try {
      await fs.stat(drive);
      drives.push(drive);
    } catch {}
  }
  return drives;
}

export function FileBrowser({
  width,
  height,
  onSelect,
  onCancel,
}: {
  width: number;
  height: number;
  onSelect: (filePath: string) => void;
  onCancel: () => void;
}) {
  const [currentDir, setCurrentDir] = useState(() => os.homedir());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drives, setDrives] = useState<string[]>([]);

  useEffect(() => {
    if (platform === "win32") {
      getWindowsDrives().then(setDrives);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (currentDir === "DRIVES") {
          const drives = await getWindowsDrives();
          if (active) {
            setEntries(drives.map((d) => ({ name: d, isDir: true })));
            setCursor(0);
            setError(null);
          }
          return;
        }

        const items = await fs.readdir(currentDir, { withFileTypes: true });
        const results: Entry[] = [];

        for (const item of items) {
          if (item.isDirectory()) {
            results.push({ name: item.name, isDir: true });
          } else if (item.name.toLowerCase().endsWith(".torrent")) {
            const stat = await fs.stat(path.join(currentDir, item.name)).catch(() => null);
            results.push({ name: item.name, isDir: false, size: stat?.size });
          }
        }

        results.sort((a, b) => {
          if (a.isDir && !b.isDir) return -1;
          if (!a.isDir && b.isDir) return 1;
          return a.name.localeCompare(b.name);
        });

        const parent = path.dirname(currentDir);
        if (parent !== currentDir) {
          results.unshift({ name: "..", isDir: true });
        } else if (platform === "win32" && currentDir !== "DRIVES") {
          results.unshift({ name: "..", isDir: true });
        }

        if (active) {
          setEntries(results);
          setCursor(0);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : String(err));
          const parent = path.dirname(currentDir);
          if (parent !== currentDir) {
            setEntries([{ name: "..", isDir: true }]);
          } else if (platform === "win32") {
            setEntries([{ name: "..", isDir: true }]);
          } else {
            setEntries([]);
          }
          setCursor(0);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [currentDir]);

  const total = entries.length;
  const clamped = Math.min(cursor, Math.max(0, total - 1));

  useInput((input, key) => {
    if (key.upArrow || input === "k") setCursor(wrapStep(clamped, -1, total));
    else if (key.downArrow || input === "j") setCursor(wrapStep(clamped, 1, total));
    else if (key.backspace || input === "h") {
      const parent = path.dirname(currentDir);
      if (parent === currentDir && platform === "win32") {
        setCurrentDir("DRIVES");
      } else if (currentDir !== "DRIVES") {
        setCurrentDir(parent);
      }
    } else if (key.return || input === "l") {
      if (total === 0) return;
      const selected = entries[clamped];
      if (selected?.isDir) {
        if (selected.name === "..") {
          const parent = path.dirname(currentDir);
          if (parent === currentDir && platform === "win32") setCurrentDir("DRIVES");
          else if (currentDir !== "DRIVES") setCurrentDir(parent);
        } else if (currentDir === "DRIVES") {
          setCurrentDir(selected.name);
        } else {
          setCurrentDir(path.resolve(currentDir, selected.name));
        }
      } else if (selected && !selected.isDir) {
        onSelect(path.join(currentDir, selected.name));
      }
    } else if (key.escape) {
      onCancel();
    } else if (platform === "win32" && input && !isNaN(Number(input))) {
      const idx = Number(input) - 1;
      const drive = drives[idx];
      if (drive) {
        setCurrentDir(drive);
      }
    }
  });

  const panelH = Math.max(5, height);
  const maxRows = panelH - (drives.length > 1 ? 5 : 4);
  const start = windowStart(clamped, total, maxRows);
  const visible = entries.slice(start, start + maxRows);

  return (
    <Panel title="open .torrent" width={Math.max(40, Math.floor(width * 0.8))} height={panelH}>
      {drives.length > 1 && (
        <Box marginBottom={1} gap={1}>
          <Text color={COLOR.dim}>Drives (press number to switch):</Text>
          {drives.map((d, i) => (
            <Text key={d} color={currentDir.startsWith(d) ? COLOR.accent : COLOR.dim}>
              <Text bold>{i + 1}</Text> {d}
            </Text>
          ))}
        </Box>
      )}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box flexGrow={1} minWidth={0} marginRight={2}>
          <Text color={COLOR.accent} bold wrap="truncate-end">
            {currentDir === "DRIVES" ? "Select Drive" : currentDir}
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={COLOR.dim}>
            <Text bold>Enter</Text> open  <Text bold>Esc</Text> cancel
          </Text>
        </Box>
      </Box>

      <Box flexGrow={1} flexDirection="column">
        {error ? (
          <Box>
            <Text color={COLOR.warn}>{error}</Text>
          </Box>
        ) : null}
        {visible.map((f, i) => {
          const idx = start + i;
          const here = idx === clamped;
          return (
            <Box key={f.name}>
              <Box width={2} flexShrink={0}>
                <Text color={COLOR.accent} bold>
                  {here ? ICON.pointer : ""}
                </Text>
              </Box>
              <Box width={3} flexShrink={0}>
                <Text color={f.isDir ? COLOR.accent : COLOR.good}>
                  {f.isDir ? "/" : ICON.done}
                </Text>
              </Box>
              <Box flexGrow={1} minWidth={0}>
                <Text
                  wrap="truncate-end"
                  bold={here}
                  color={here ? COLOR.accent : f.isDir ? COLOR.text : COLOR.dim}
                >
                  {f.name}
                </Text>
              </Box>
              {!f.isDir && f.size !== undefined ? (
                <Box width={10} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                  <Text color={COLOR.dim}>{formatBytes(f.size)}</Text>
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Panel>
  );
}
