import { useState, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { COLOR, ICON } from "../theme";
import { wrapStep, windowStart } from "../move";
import { cleanText, formatBytes } from "../../util/format";
import { ListRow, ListCell, ListText, ListPointer } from "./List";
import type { QueueItem } from "../../download/types";

const MARK = 2;

export function FileSelection({
  item,
  contentWidth,
  listRows,
  onConfirm,
  onCancel,
}: {
  item: QueueItem;
  contentWidth: number;
  listRows: number;
  onConfirm: (selectedIndices: number[], sequential: boolean) => void;
  onCancel: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(() => {
    const set = new Set<number>();
    item.fileList?.forEach((_, i) => set.add(i));
    return set;
  });
  const [sequential, setSequential] = useState(false);

  const files = item.fileList || [];
  const total = files.length;
  const clamped = Math.min(cursor, Math.max(0, total - 1));

  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useInput((input, key) => {
    const currentClamped = Math.min(cursorRef.current, Math.max(0, total - 1));

    if (key.upArrow || input === "k") {
      setCursor((prev) => wrapStep(prev, -1, total));
    } else if (key.downArrow || input === "j") {
      setCursor((prev) => wrapStep(prev, 1, total));
    } else if (input === " ") {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(currentClamped)) next.delete(currentClamped);
        else next.add(currentClamped);
        return next;
      });
    } else if (input === "a") {
      setSelected((prev) => {
        if (prev.size === total) return new Set();
        const next = new Set<number>();
        files.forEach((_, i) => next.add(i));
        return next;
      });
    } else if (input === "s") {
      setSequential((prev) => !prev);
    } else if (key.return) {
      if (selected.size === 0) return;
      onConfirm(Array.from(selected).sort((a, b) => a - b), sequential);
    } else if (key.escape) {
      onCancel();
    }
  });

  const panelH = Math.max(5, listRows - 1);
  const ceiling = Math.max(1, panelH - 5);
  const start = windowStart(clamped, total, ceiling);
  const visible = files.slice(start, start + ceiling);

  return (
    <Box width={contentWidth} height={panelH} flexDirection="column" borderStyle="single" borderColor={COLOR.accent} paddingX={1}>
      <Box justifyContent="space-between" marginBottom={1}>
        <Box minWidth={0} flexGrow={1} marginRight={2}>
          <Text color={COLOR.accent} bold wrap="truncate-end">Files: {cleanText(item.name)}</Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={COLOR.dim}>{selected.size}/{total} selected</Text>
        </Box>
      </Box>

      <Box flexGrow={1} flexDirection="column">
        {visible.map((f, i) => {
          const idx = start + i;
          const here = idx === clamped;
          const isSelected = selected.has(idx);
          return (
            <ListRow key={idx}>
              <ListCell width={MARK}>
                <ListPointer focused={here} />
              </ListCell>
              <ListCell width={4}>
                <Text color={isSelected ? COLOR.good : COLOR.dim}>
                  {isSelected ? "[x]" : "[ ]"}
                </Text>
              </ListCell>
              <ListCell flexGrow={1}>
                <ListText text={f.name} focused={here} color={isSelected ? COLOR.text : COLOR.dim} truncate />
              </ListCell>
              <ListCell width={10} marginLeft={1} justifyContent="flex-end">
                <Text color={COLOR.dim}>{formatBytes(f.length)}</Text>
              </ListCell>
            </ListRow>
          );
        })}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Box justifyContent="space-between">
          <Text color={sequential ? COLOR.good : COLOR.dim}>
            <Text bold={sequential}>[s]</Text> Sequential: {sequential ? "ON" : "OFF"}
          </Text>
          <Text color={COLOR.dim}>
            <Text bold>Space</Text> toggle  <Text bold>a</Text> all  <Text bold>Enter</Text> start  <Text bold>Esc</Text> cancel
          </Text>
        </Box>
        <Box>
          <Text color={COLOR.dim}>
            * Sequential downloads pieces in order, letting you stream media instantly.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
