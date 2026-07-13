import { useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useStore, useQueueHistory, useSeeds, type SeedFocus } from "../store";
import { Panel } from "./Panel";
import { ListRow, ListCell, ListText, ListPointer } from "./List";
import { useListNavigation } from "../hooks/useListNavigation";
import { COLOR, GUTTER, ICON, SOURCE_STYLE } from "../theme";
import { cleanText, formatBytes, formatBytesPerSec, truncate } from "../../util/format";
import type { SeedItem } from "../../download/types";

const MARK = 2;
const SIZE_W = 10;
const STATUS_W = 14;
const SRC_W = 4;
const PAUSED = "#7c7785";

function glyph(seed: SeedItem | undefined): { icon: string; color: string } {
  if (!seed) return { icon: ICON.done, color: COLOR.good };
  if (seed.status === "seeding") return { icon: ICON.up, color: COLOR.good };
  if (seed.status === "paused") return { icon: ICON.pause, color: PAUSED };
  return { icon: ICON.warn, color: COLOR.warn };
}

function statusCell(seed: SeedItem | undefined): { text: string; color?: string; dim: boolean } {
  if (!seed) return { text: "ready", dim: true };
  if (seed.status === "seeding") {
    return { text: `${ICON.up}${formatBytesPerSec(seed.uploadSpeed) || "0 B/s"} ${ICON.peer}${seed.peers}`, color: COLOR.good, dim: false };
  }
  if (seed.status === "paused") return { text: "paused", dim: true };
  return { text: "file gone", color: COLOR.warn, dim: false };
}

export function Seeding() {
  const { queue, region, contentWidth, listRows, setNotice, setSeedFocus } = useStore();
  const history = useQueueHistory(queue);
  const seeds = useSeeds(queue);
  const focused = region === "content";

  const total = history.length;
  const panelH = Math.max(5, listRows - 1);
  const rows = Math.max(1, panelH - 2);

  const { cursor: clamped, start } = useListNavigation({
    total,
    windowSize: rows,
    isActive: focused,
  });

  const focusStatus: SeedFocus | null =
    focused && total > 0 ? (seeds.get(history[clamped]?.id ?? "")?.status ?? "idle") : null;
    
  useEffect(() => {
    setSeedFocus(focusStatus);
    return () => setSeedFocus(null);
  }, [focusStatus, setSeedFocus]);

  useInput(
    (input, _key) => {
      if (input === "p") {
        const h = history[clamped];
        if (!h) return;
        queue.toggleSeeding(h);
        if (queue.getSeed(h.id)?.status === "missing") {
          setNotice(`${ICON.warn} That file isn't on disk anymore.`);
        }
      } else if (input === "c") {
        const h = history[clamped];
        if (h) queue.removeHistory(h.id);
      }
    },
    { isActive: focused && total > 0 },
  );

  const seedingCount = queue.seedingCount;

  if (total === 0) {
    return (
      <Panel title="seeding" width={contentWidth} focused={focused} height={panelH}>
        <Box flexGrow={1} justifyContent="center" alignItems="center">
          <Text color={COLOR.dim}>Nothing here yet. Downloads start seeding automatically when they finish.</Text>
        </Box>
      </Panel>
    );
  }

  // Summary line: live totals across active seeds, or an invite to start.
  let totalUp = 0;
  let totalPeers = 0;
  let totalShared = 0;
  for (const s of seeds.values()) {
    totalShared += s.uploaded;
    if (s.status === "seeding") {
      totalUp += s.uploadSpeed;
      totalPeers += s.peers;
    }
  }

  const visible = history.slice(start, start + rows);

  return (
    <Panel
      title="seeding"
      width={contentWidth}
      focused={focused}
      count={seedingCount > 0 ? `(${seedingCount})` : undefined}
      height={panelH}
    >
      <Box>
        {seedingCount > 0 ? (
          <Text color={COLOR.good}>
            {ICON.up} {formatBytesPerSec(totalUp) || "0 B/s"}
            <Text color={COLOR.dim}>{`  ${ICON.dot}  ${totalPeers} peers  ${ICON.dot}  ${formatBytes(totalShared)} shared back`}</Text>
          </Text>
        ) : (
          <Text color={COLOR.dim}>Downloads seed automatically when they finish. Press p to pause or resume any of them.</Text>
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
          <ListCell width={SRC_W} marginLeft={1} justifyContent="flex-end">
            <Text bold color={COLOR.dim}>Src</Text>
          </ListCell>
        </ListRow>

        {visible.map((h, i) => {
          const here = start + i === clamped && focused;
          const seed = seeds.get(h.id);
          const g = glyph(seed);
          const st = statusCell(seed);
          const ss = SOURCE_STYLE[h.source ?? "fitgirl"];
          return (
            <ListRow key={h.id}>
              <ListCell width={MARK}>
                <ListPointer focused={here} />
              </ListCell>
              <ListCell width={GUTTER}>
                <Text color={!seed && !here ? COLOR.dim : g.color}>{g.icon}</Text>
              </ListCell>
              <ListCell flexGrow={1} marginLeft={1}>
                <ListText text={h.name} focused={here} color={COLOR.dim} truncate />
              </ListCell>
              <ListCell width={SIZE_W} marginLeft={1} justifyContent="flex-end">
                <Text color={COLOR.dim}>{h.sizeBytes > 0 ? formatBytes(h.sizeBytes) : "-"}</Text>
              </ListCell>
              <ListCell width={STATUS_W} marginLeft={1} justifyContent="flex-end">
                <Text color={st.dim ? COLOR.dim : st.color}>{truncate(st.text, STATUS_W)}</Text>
              </ListCell>
              <ListCell width={SRC_W} marginLeft={1} justifyContent="flex-end">
                <Text color={!h.source || !here ? COLOR.dim : ss.color}>
                  {h.source ? ss.tag : "mag"}
                </Text>
              </ListCell>
            </ListRow>
          );
        })}
      </Box>
    </Panel>
  );
}
