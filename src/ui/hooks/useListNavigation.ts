import { useState, useEffect } from "react";
import { useInput } from "ink";
import { wrapStep, windowStart } from "../move";

export interface ListNavigationOptions {
  total: number;
  windowSize: number;
  isActive?: boolean;
  initialCursor?: number;
  onSelect?: (index: number) => void;
  onBoundaryUp?: () => void;
}

export function useListNavigation({
  total,
  windowSize,
  isActive = true,
  initialCursor = 0,
  onSelect,
  onBoundaryUp,
}: ListNavigationOptions) {
  const [cursor, setCursor] = useState(initialCursor);

  // Reset cursor if total shrinks below cursor
  useEffect(() => {
    if (total === 0) {
      setCursor(0);
    } else if (cursor >= total) {
      setCursor(total - 1);
    }
  }, [total, cursor]);

  const clamped = Math.min(cursor, Math.max(0, total - 1));
  const pageJump = Math.max(1, windowSize - 1);

  useInput(
    (input, key) => {
      if (total === 0) return;

      if (key.upArrow || input === "k") {
        if (clamped === 0 && onBoundaryUp) {
          onBoundaryUp();
        } else {
          setCursor(wrapStep(clamped, -1, total));
        }
      } else if (key.downArrow || input === "j") {
        setCursor(wrapStep(clamped, 1, total));
      } else if (key.pageUp) {
        setCursor(Math.max(0, clamped - pageJump));
      } else if (key.pageDown) {
        setCursor(Math.min(total - 1, clamped + pageJump));
      } else if (key.return && onSelect) {
        onSelect(clamped);
      }
    },
    { isActive: isActive && total > 0 }
  );

  const start = windowStart(clamped, total, Math.max(1, windowSize));

  return {
    cursor: clamped,
    setCursor,
    start,
    end: start + windowSize,
  };
}
