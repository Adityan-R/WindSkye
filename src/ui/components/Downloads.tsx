import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import path from "node:path";
import { useStore, useQueueItems, useQueueHistory, type DownloadFocus, type CaptureMode } from "../store";
import { openFileExplorer } from "../../util/open";
import { FileSelection } from "./FileSelection";
import { Panel } from "./Panel";
import { ProgressBar } from "./ProgressBar";
import { wrapStep, windowStart } from "../move";
import { COLOR, GUTTER, ICON, SOURCE_STYLE } from "../theme";
import {
  cleanText,
  formatBytes,
  formatBytesPerSec,
  formatEtaShort,
  formatRelative,
  truncate,
} from "../../util/format";
import type { QueueItem } from "../../download/types";
import type { HistoryItem } from "../../download/history";

const ROWS_PER_ACTIVE = 2;
const MARK = 2;

const PAUSED = "#7c7785";

function statusColor(status: QueueItem["status"]): string {
  if (status === "failed") return COLOR.bad;
  if (status === "paused") return PAUSED;
  return COLOR.accent;
}

function statusIcon(status: QueueItem["status"]): string {
  if (status === "failed") return ICON.error;
  if (status === "paused") return ICON.pause;
  return ICON.down;
}

function rightStats(it: QueueItem): string {
  if (it.status === "downloading") {
    const speed = formatBytesPerSec(it.speed) || "…";
    const eta = it.eta ? `  ${formatEtaShort(it.eta)}` : "";
    return `${it.progress}%  ${speed}  ${ICON.peer}${it.peers}${eta}`;
  }
  if (it.status === "paused") return `paused  ${it.progress}%`;
  return truncate(it.error || "failed", 28);
}

export function Downloads() {
  const { queue, region, contentWidth, listRows, startDownload, setDownloadFocus, setCaptureMode } = useStore();
  const active = useQueueItems(queue);
  const recent = useQueueHistory(queue);
  const focused = region === "content";

  const total = active.length + recent.length;
  const [cursor, setCursor] = useState(0);
  const clamped = Math.min(cursor, Math.max(0, total - 1));
  const inActive = clamped < active.length;
  const recentCursor = clamped - active.length;

  const [canceling, setCanceling] = useState<QueueItem | null>(null);
  const [cancelOption, setCancelOption] = useState<"yes" | "no">("no");

  const isSelecting = active.find((it) => it.status === "selecting_files");

  useEffect(() => {
    setCaptureMode(canceling || isSelecting ? "text" : "none");
    if (canceling) setCancelOption("no"); // Default to no for destructive action
    return () => setCaptureMode("none");
  }, [canceling, !!isSelecting, setCaptureMode]);

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") setCursor(wrapStep(clamped, -1, total));
      else if (key.downArrow || input === "j") setCursor(wrapStep(clamped, 1, total));
      else if (input === "f") queue.retryFailed();
      else if (input === "x") queue.clearHistory();
      else if (inActive) {
        const it = active[clamped];
        if (!it) return;
        if (input === "c") {
          setCanceling(it);
        } else if (input === "p") queue.togglePause(it.id);
        else if (input === "e") openFileExplorer(path.join(it.dir, it.name));
      } else {
        const h = recent[recentCursor];
        if (!h) return;
        if (key.return || input === "d")
          startDownload({
            id: h.id,
            name: h.name,
            magnet: h.magnet,
            source: h.source,
            sizeBytes: h.sizeBytes,
          });
        else if (input === "c") queue.removeHistory(h.id);
        else if (input === "e") openFileExplorer(path.join(h.dir, h.name));
      }
    },
    { isActive: focused && total > 0 && !canceling && !isSelecting },
  );

  useInput(
    (input, key) => {
      if (!canceling) return;
      if (key.escape || input.toLowerCase() === "n") {
        setCanceling(null);
      } else if (input.toLowerCase() === "y") {
        queue.cancel(canceling.id);
        setCanceling(null);
      } else if (key.leftArrow || key.rightArrow || input === "h" || input === "l") {
        setCancelOption((prev) => (prev === "yes" ? "no" : "yes"));
      } else if (key.return) {
        if (cancelOption === "yes") {
          queue.cancel(canceling.id);
        }
        setCanceling(null);
      }
    },
    { isActive: !!canceling },
  );

  let focusKind: DownloadFocus | null = null;
  if (focused && total > 0) {
    if (!inActive) focusKind = "recent";
    else {
      const st = active[clamped]?.status;
      if (st === "downloading" || st === "paused" || st === "failed") focusKind = st;
    }
  }
  useEffect(() => {
    setDownloadFocus(focusKind);
    return () => setDownloadFocus(null);
  }, [focusKind, setDownloadFocus]);

  const panelH = Math.max(5, listRows - 1);

  if (isSelecting) {
    return (
      <FileSelection
        item={isSelecting}
        contentWidth={contentWidth}
        listRows={listRows}
        onConfirm={(indices, seq) => queue.commitSelection(isSelecting.id, indices, seq)}
        onCancel={() => queue.cancel(isSelecting.id)}
      />
    );
  }

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
            <Text color={COLOR.accent} bold>Cancel Download</Text>
          </Box>
          <Box justifyContent="center">
            <Text color={COLOR.text}>Are you sure you want to cancel this download?</Text>
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

  if (total === 0) {
    return (
      <Panel title="downloads" width={contentWidth} focused={focused} height={panelH}>
        <Text color={COLOR.dim}>No downloads yet. Find something and press d to grab it.</Text>
      </Panel>
    );
  }

  const hasActive = active.length > 0;
  const hasRecent = recent.length > 0;
  const headerRows = hasRecent ? 1 : 0;
  const ceiling = Math.max(1, panelH - 1);

  let gapRows = hasActive && hasRecent ? 1 : 0;
  let maxActive = 0;
  let maxRecent = 0;
  if (!hasRecent) {
    maxActive = Math.max(1, Math.floor(ceiling / ROWS_PER_ACTIVE));
  } else if (!hasActive) {
    maxRecent = Math.max(1, ceiling - headerRows);
  } else {
    let budget = ceiling - headerRows - gapRows;
    if (budget < ROWS_PER_ACTIVE + 1) {
      gapRows = 0;
      budget = ceiling - headerRows;
    }
    const activeRowCap = Math.max(ROWS_PER_ACTIVE, Math.floor(budget * 0.55));
    maxActive = Math.min(active.length, Math.max(1, Math.floor(activeRowCap / ROWS_PER_ACTIVE)));
    maxRecent = Math.max(1, budget - maxActive * ROWS_PER_ACTIVE);
  }

  const activeStart = windowStart(inActive ? clamped : 0, active.length, maxActive);
  const activeVisible = active.slice(activeStart, activeStart + maxActive);
  const recentStart = windowStart(inActive ? 0 : recentCursor, recent.length, maxRecent);
  const recentVisible = recent.slice(recentStart, recentStart + maxRecent);

  const inner = contentWidth - 4;
  const gap = 2;
  const barW = Math.max(8, Math.min(28, Math.floor(inner * 0.4)));
  const statsW = Math.max(6, inner - MARK - GUTTER - barW - gap);

  const count = hasActive ? `(${active.length})` : undefined;

  return (
    <Panel title="downloads" width={contentWidth} focused={focused} count={count} height={panelH}>
      {activeVisible.map((it, i) => {
        const here = activeStart + i === clamped && focused && inActive;
        const sc = statusColor(it.status);
        const ss = SOURCE_STYLE[it.source ?? "fitgirl"];
        return (
          <Box key={it.id} flexDirection="column">
            <Box>
              <Box width={MARK} flexShrink={0}>
                <Text color={COLOR.accent} bold>
                  {here ? ICON.pointer : ""}
                </Text>
              </Box>
              <Box width={GUTTER} flexShrink={0}>
                <Text color={sc}>{statusIcon(it.status)}</Text>
              </Box>
              <Box flexGrow={1} minWidth={0}>
                <Text
                  wrap="truncate-end"
                  bold={here}
                  color={here ? COLOR.accent : COLOR.dim}
                >
                  {cleanText(it.name)}
                </Text>
              </Box>
              <Box width={10} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                <Text color={COLOR.dim}>{it.totalBytes > 0 ? formatBytes(it.totalBytes) : "-"}</Text>
              </Box>
              <Box width={4} flexShrink={0} marginLeft={1} justifyContent="flex-end">
                <Text color={!it.source || !here ? COLOR.dim : ss.color}>
                  {it.source ? ss.tag : "mag"}
                </Text>
              </Box>
            </Box>
            <Box>
              <Box width={MARK + GUTTER} flexShrink={0} />
              <ProgressBar
                pct={it.progress}
                width={barW}
                color={sc}
                animate={it.status === "downloading"}
              />
              <Box marginLeft={gap} flexShrink={0}>
                <Text color={COLOR.dim}>{truncate(rightStats(it), statsW)}</Text>
              </Box>
            </Box>
          </Box>
        );
      })}

      {hasRecent ? (
        <Box marginTop={gapRows ? 1 : 0}>
          <Text color={COLOR.dim}>{`Recently downloaded${recent.length > 1 ? `  (${recent.length})` : ""}`}</Text>
        </Box>
      ) : null}

      {recentVisible.map((h: HistoryItem, i) => {
        const here = recentStart + i === recentCursor && focused && !inActive;
        const ss = SOURCE_STYLE[h.source ?? "fitgirl"];
        const when = formatRelative(h.completedAt / 1000);
        return (
          <Box key={h.id}>
            <Box width={MARK} flexShrink={0}>
              <Text color={COLOR.accent} bold>
                {here ? ICON.pointer : ""}
              </Text>
            </Box>
            <Box width={GUTTER} flexShrink={0}>
              <Text color={here ? COLOR.good : COLOR.dim}>
                {ICON.done}
              </Text>
            </Box>
            <Box flexGrow={1} minWidth={0}>
              <Text
                wrap="truncate-end"
                bold={here}
                color={here ? COLOR.accent : COLOR.dim}
              >
                {cleanText(h.name)}
              </Text>
            </Box>
            <Box width={10} flexShrink={0} marginLeft={1} justifyContent="flex-end">
              <Text color={COLOR.dim}>{h.sizeBytes > 0 ? formatBytes(h.sizeBytes) : "-"}</Text>
            </Box>
            <Box width={12} flexShrink={0} marginLeft={1} justifyContent="flex-end">
              <Text color={COLOR.dim}>{when || "-"}</Text>
            </Box>
            <Box width={4} flexShrink={0} marginLeft={1} justifyContent="flex-end">
              <Text color={!h.source || !here ? COLOR.dim : ss.color}>
                {h.source ? ss.tag : "mag"}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Panel>
  );
}
