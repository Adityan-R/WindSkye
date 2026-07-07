import { Box, Text } from "ink";
import { LOGO_LINES, SPROUT_CELLS } from "../logo";
import { COLOR, lerpHex } from "../theme";

function getSheen(t: number): string {
  return lerpHex(COLOR.bright, COLOR.accent, Math.min(1, Math.max(0, t)));
}

export function Logo() {
  const rows = LOGO_LINES.length;

  return (
    <Box flexDirection="column">
      {LOGO_LINES.map((line, row) => {
        const textRow = Math.max(0, row - 1);
        const textRows = Math.max(1, rows - 1);
        const tY = textRow / (textRows - 1 || 1);
        const chars = [...line];
        const last = Math.max(1, chars.length - 1);

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

              return (
                <Text key={i} bold color={getSheen(factor)}>
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
