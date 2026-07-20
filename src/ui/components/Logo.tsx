import { Box, Text, useInput } from "ink";
import { useState, useEffect } from "react";
import { LOGO_LINES, SPROUT_CELLS, LIGHT_CELLS } from "../logo";
import { COLOR, lerpHex } from "../theme";
import { useStore } from "../store";

function getSheen(t: number, style?: "original" | "dark" | "light"): string {
  if (t < 0.15) return lerpHex(COLOR.logoHighlight, COLOR.logoTop, t / 0.15);
  if (t < 0.4) return lerpHex(COLOR.logoTop, COLOR.logoMid, (t - 0.15) / 0.25);
  if (t < 0.7) return lerpHex(COLOR.logoMid, COLOR.logoBase, (t - 0.4) / 0.3);
  if (t <= 1.0) return lerpHex(COLOR.logoBase, COLOR.logoShade, (t - 0.7) / 0.3);
  
  if (style === "dark") {
    return lerpHex(COLOR.logoShade, COLOR.dim, (t - 1.0) / 0.1);
  } else if (style === "light") {
    return lerpHex(COLOR.logoShade, COLOR.logoHighlight, (t - 1.0) / 0.1);
  }
  return COLOR.logoShade; // "original"
}

interface LogoProps {
  pauseOnInput?: boolean;
}

export function Logo({ pauseOnInput = false }: LogoProps = {}) {
  const { config } = useStore();
  const rows = LOGO_LINES.length;

  const [showCursor, setShowCursor] = useState(true);
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useInput(() => {
    if (!pauseOnInput) return;
    setShowCursor(true);
    if (typingTimer) clearTimeout(typingTimer);
    setTypingTimer(setTimeout(() => {
      setTypingTimer(null);
    }, 500));
  });

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typingTimer) return;
    const interval = setInterval(() => {
      setShowCursor((s) => !s);
    }, 500);
    return () => clearInterval(interval);
  }, [typingTimer]);

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 50);
    timer.unref?.();
    return () => clearInterval(timer);
  }, []);

  return (
    <Box flexDirection="column">
      {LOGO_LINES.map((line, row) => {
        const textRow = Math.max(0, row - 1);
        const textRows = Math.max(1, rows - 1);
        const tY = textRow / (textRows - 1 || 1);
        const cursorStr = row === 2 && (showCursor || !config.enableBlinker) ? " ▄▄▄" : "    ";
        const chars = [...line, ...cursorStr];
        const last = Math.max(1, line.length - 1);

        return (
          <Box key={row}>
            {chars.map((ch, i) => {
              if (ch === " ") return <Text key={i}> </Text>;

              if (SPROUT_CELLS.has(`${row},${i}`)) {
                return (
                  <Text key={i} bold color={COLOR.good}>
                    {ch}
                  </Text>
                );
              }

              const tX = i / last;
              const factor = (tX + tY) / 2;
              let color = getSheen(factor, config.blinkerGradient);

              const cycle = tick % 160; // 60 ticks for animation (3s), 100 ticks delay (5s)
              let sweepCenter = -2.0;
              if (cycle < 60) {
                sweepCenter = (cycle / 30) - 0.5;
              }
              const dist = Math.abs(factor - sweepCenter);
              if (dist < 0.2) {
                const intensity = 1 - (dist / 0.2);
                color = lerpHex(color, "#ffffff", intensity * 0.8);
              }

              if (LIGHT_CELLS.has(`${row},${i}`)) {
                const darkerColor = lerpHex(color, COLOR.logoShade, 0.6);
                return (
                  <Text key={i} bold color={darkerColor} backgroundColor={color}>
                    {ch}
                  </Text>
                );
              }

              return (
                <Text key={i} bold color={color}>
                  {ch}
                </Text>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );
}
