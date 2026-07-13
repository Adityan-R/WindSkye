import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore, useCreatedItems, type CreateFocus } from "../store";
import { Panel } from "./Panel";
import { ListRow, ListCell, ListText, ListPointer } from "./List";
import { useListNavigation } from "../hooks/useListNavigation";
import { COLOR, GUTTER, ICON } from "../theme";
import { cleanText, formatBytes, formatBytesPerSec, truncate } from "../../util/format";
import type { CreatedItem } from "../../download/types";

const MARK = 2;
const SIZE_W = 10;
const STATUS_W = 14;
const PAUSED = "#7c7785";

function glyph(item: CreatedItem): { icon: string; color: string } {
  if (item.status === "seeding") return { icon: ICON.up, color: COLOR.good };
  if (item.status === "paused") return { icon: ICON.pause, color: PAUSED };
  return { icon: ICON.warn, color: COLOR.warn };
}

function statusCell(item: CreatedItem): { text: string; color?: string; dim: boolean } {
  if (item.status === "seeding") {
    if (!item.magnet) return { text: "hashing…", color: COLOR.accent, dim: false };
    return {
      text: `${ICON.up}${formatBytesPerSec(item.uploadSpeed) || "0 B/s"} ${ICON.peer}${item.peers}`,
      color: COLOR.good,
      dim: false,
    };
  }
  if (item.status === "paused") return { text: "paused", dim: true };
  return { text: "file gone", color: COLOR.warn, dim: false };
}

export function Create() {
  const {
    queue, region, contentWidth, listRows,
    setNotice, setCreateFocus, setCaptureMode,
  } = useStore();
  const items = useCreatedItems(queue);
  const focused = region === "content";

  const total = items.length;
  const panelH = Math.max(5, listRows - 1);
  const rows = Math.max(1, panelH - 2);

  const [prompting, setPrompting] = useState(false);
  const [canceling, setCanceling] = useState<CreatedItem | null>(null);
  const [cancelOption, setCancelOption] = useState<"yes" | "no">("no");
  const [pathInput, setPathInput] = useState("");

  const { cursor: clamped, start } = useListNavigation({
    total,
    windowSize: rows,
    isActive: focused && !canceling && !prompting,
  });

  const focusStatus: CreateFocus =
    focused && total > 0 ? items[clamped]?.status ?? null : null;
    
  useEffect(() => {
    setCreateFocus(focusStatus);
    return () => setCreateFocus(null);
  }, [focusStatus, setCreateFocus]);

  // When the path prompt or cancel prompt opens/closes, toggle capture mode so App-level
  // shortcuts don't interfere with typing.
  useEffect(() => {
    setCaptureMode(prompting || canceling ? "text" : "none");
    if (canceling) setCancelOption("no");
    return () => setCaptureMode("none");
  }, [prompting, canceling, setCaptureMode]);

  useInput(
    (input, key) => {
      if (prompting) {
        if (key.escape) {
          setPrompting(false);
          setPathInput("");
          return;
        }
        if (key.return) {
          const p = pathInput.trim();
          if (p) {
            const result = queue.createTorrent(p);
            if (result) {
              setNotice(`${ICON.create} Creating torrent from: ${truncate(cleanText(p), 40)}`);
            } else {
              setNotice(`${ICON.warn} Path not found: ${truncate(cleanText(p), 40)}`);
            }
          }
          setPrompting(false);
          setPathInput("");
          return;
        }
        if (key.backspace || key.delete) {
          setPathInput((prev) => prev.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setPathInput((prev) => prev + input);
        }
        return;
      }

      if (input === "n") {
        setPrompting(true);
        setPathInput("");
        return;
      }
      if (total === 0) return;
      
      if (input === "p") {
        const c = items[clamped];
        if (!c) return;
        queue.toggleCreatedPause(c.id);
        if (c.status === "missing") {
          setNotice(`${ICON.warn} Source file isn't on disk anymore.`);
        }
      } else if (input === "c") {
        const c = items[clamped];
        if (c) setCanceling(c);
      } else if (input === "y") {
        const c = items[clamped];
        if (c?.magnet) {
          void import("../../util/clipboard").then(({ writeClipboard }) =>
            writeClipboard(c.magnet).then((ok) => {
              if (ok) setNotice(`Copied magnet: ${truncate(cleanText(c.magnet), 60)}`);
              else setNotice(`Couldn't copy magnet for ${truncate(cleanText(c.name), 32)}.`);
            }),
          );
        } else {
          setNotice("Magnet not ready yet (still hashing).");
        }
      }
    },
    { isActive: focused && !canceling },
  );

  useInput(
    (input, key) => {
      if (!canceling) return;
      if (key.escape || input.toLowerCase() === "n") {
        setCanceling(null);
      } else if (input.toLowerCase() === "y") {
        queue.removeCreated(canceling.id);
        setCanceling(null);
      } else if (key.leftArrow || key.rightArrow || input === "h" || input === "l") {
        setCancelOption((prev) => (prev === "yes" ? "no" : "yes"));
      } else if (key.return) {
        if (cancelOption === "yes") {
          queue.removeCreated(canceling.id);
        }
        setCanceling(null);
      }
    },
    { isActive: !!canceling },
  );

  const createdCount = queue.createdCount;

  if (canceling) {
    return (
      <Box width={contentWidth} height={panelH} justifyContent="center" alignItems="center">
        <Box
          flexDirection="column"
          borderStyle="single"
          borderColor={COLOR.accent}
          paddingX={2}
          paddingY={1}
        >
          <Box justifyContent="center" marginBottom={1}>
            <Text color={COLOR.accent} bold>Remove Torrent</Text>
          </Box>
          <Box justifyContent="center">
            <Text color={COLOR.text}>Are you sure you want to stop seeding and remove this?</Text>
          </Box>
          <Box justifyContent="center" marginBottom={1}>
            <Text color={COLOR.dim}>{truncate(cleanText(canceling.name), 40)}</Text>
          </Box>
          <Box justifyContent="center" gap={4}>
            <Text
              color={cancelOption === "yes" ? "black" : COLOR.text}
              backgroundColor={cancelOption === "yes" ? COLOR.accent : undefined}
            >
              {" [Yes] "}
            </Text>
            <Text
              color={cancelOption === "no" ? "black" : COLOR.text}
              backgroundColor={cancelOption === "no" ? COLOR.accent : undefined}
            >
              {" [No] "}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  if (prompting) {
    return (
      <Panel title="create" width={contentWidth} focused={focused} height={panelH}>
        <Box flexDirection="column">
          <Text color={COLOR.accent} bold>
            Enter a file or folder path to create a torrent:
          </Text>
          <Box marginTop={1}>
            <Text color={COLOR.dim}>{"❯ "}</Text>
            <Text color={COLOR.text}>{pathInput}</Text>
            <Text color={COLOR.accent}>█</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={COLOR.dim}>Press Enter to confirm, Esc to cancel</Text>
          </Box>
        </Box>
      </Panel>
    );
  }

  if (total === 0) {
    return (
      <Panel title="create" width={contentWidth} focused={focused} height={panelH}>
        <Text color={COLOR.dim}>
          No created torrents. Press <Text color={COLOR.accent} bold>n</Text> to create a torrent from a local file or folder.
        </Text>
      </Panel>
    );
  }

  // Summary line.
  let totalUp = 0;
  let totalPeers = 0;
  let totalShared = 0;
  for (const c of items) {
    totalShared += c.uploaded;
    if (c.status === "seeding") {
      totalUp += c.uploadSpeed;
      totalPeers += c.peers;
    }
  }

  const visible = items.slice(start, start + rows);

  return (
    <Panel
      title="create"
      width={contentWidth}
      focused={focused}
      count={createdCount > 0 ? `(${createdCount})` : undefined}
      height={panelH}
    >
      <Box>
        {createdCount > 0 ? (
          <Text color={COLOR.good}>
            {ICON.up} {formatBytesPerSec(totalUp) || "0 B/s"}
            <Text color={COLOR.dim}>{`  ${ICON.dot}  ${totalPeers} peers  ${ICON.dot}  ${formatBytes(totalShared)} shared`}</Text>
          </Text>
        ) : (
          <Text color={COLOR.dim}>
            Press <Text color={COLOR.accent} bold>n</Text> to create a new torrent. Press <Text color={COLOR.accent} bold>p</Text> to pause or resume.
          </Text>
        )}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <ListRow>
          <ListCell width={MARK} />
          <ListCell width={GUTTER} />
          <ListCell flexGrow={1} marginLeft={1}>
            <Text bold color={COLOR.dim}>Name</Text>
          </ListCell>
          <ListCell width={SIZE_W} marginLeft={1} justifyContent="flex-end">
            <Text bold color={COLOR.dim}>Size</Text>
          </ListCell>
          <ListCell width={STATUS_W} marginLeft={1} justifyContent="flex-end">
            <Text bold color={COLOR.dim}>Status</Text>
          </ListCell>
        </ListRow>

        {visible.map((item, i) => {
          const here = start + i === clamped && focused;
          const g = glyph(item);
          const st = statusCell(item);
          return (
            <ListRow key={item.id}>
              <ListCell width={MARK}>
                <ListPointer focused={here} />
              </ListCell>
              <ListCell width={GUTTER}>
                <Text color={!here && item.status !== "seeding" ? COLOR.dim : g.color}>{g.icon}</Text>
              </ListCell>
              <ListCell flexGrow={1} marginLeft={1}>
                <ListText text={item.name} focused={here} color={COLOR.dim} truncate />
              </ListCell>
              <ListCell width={SIZE_W} marginLeft={1} justifyContent="flex-end">
                <Text color={COLOR.dim}>{item.sizeBytes > 0 ? formatBytes(item.sizeBytes) : "-"}</Text>
              </ListCell>
              <ListCell width={STATUS_W} marginLeft={1} justifyContent="flex-end">
                <Text color={st.dim ? COLOR.dim : st.color}>{truncate(st.text, STATUS_W)}</Text>
              </ListCell>
            </ListRow>
          );
        })}
      </Box>
    </Panel>
  );
}
