import { Box, Text } from "ink";
import type { ReactNode } from "react";
import { COLOR, ICON } from "../theme";
import { cleanText } from "../../util/format";

export function ListRow({ children }: { children: ReactNode }) {
  return <Box>{children}</Box>;
}

export function ListCell({
  width,
  flexGrow,
  justifyContent = "flex-start",
  marginLeft = 0,
  children,
}: {
  width?: number;
  flexGrow?: number;
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around";
  marginLeft?: number;
  children?: ReactNode;
}) {
  return (
    <Box
      width={width}
      flexGrow={flexGrow}
      flexShrink={0}
      minWidth={flexGrow ? 0 : undefined}
      justifyContent={justifyContent}
      marginLeft={marginLeft}
    >
      {children}
    </Box>
  );
}

export function ListText({
  text,
  focused = false,
  color,
  backgroundColor,
  bold = false,
  truncate = false,
}: {
  text: string;
  focused?: boolean;
  color?: string;
  backgroundColor?: string;
  bold?: boolean;
  truncate?: boolean;
}) {
  const content = focused && truncate ? ` ${cleanText(text)} ` : cleanText(text);
  return (
    <Text
      wrap={truncate ? "truncate-end" : "wrap"}
      bold={bold || focused}
      color={focused ? "black" : color}
      backgroundColor={focused ? COLOR.accent : backgroundColor}
    >
      {content}
    </Text>
  );
}

export function ListPointer({ focused }: { focused: boolean }) {
  return (
    <Text color={COLOR.accent} bold>
      {focused ? ICON.pointer : ""}
    </Text>
  );
}
