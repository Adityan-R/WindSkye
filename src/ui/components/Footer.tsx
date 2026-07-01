import { Box, Text } from "ink";
import { COLOR } from "../theme";
import type { Hint } from "../keymap";

export function Footer({ hints }: { hints: Hint[] }) {
  return (
    <Box>
      <Text>
        {hints.map((h, i) => (
          <Text key={h.keys + h.label}>
            {i > 0 ? <Text color={COLOR.dim}>{"   "}</Text> : null}
            <Text color={COLOR.alt}>{h.keys}</Text>
            <Text color={COLOR.dim}>{` ${h.label}`}</Text>
          </Text>
        ))}
      </Text>
    </Box>
  );
}
