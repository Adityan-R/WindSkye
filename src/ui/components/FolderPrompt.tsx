import { Box, Text, useInput } from "ink";
import { TextField } from "./TextField";
import { Panel } from "./Panel";
import { COLOR, ICON } from "../theme";

interface FolderPromptProps {
  width: number;
  value: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function FolderPrompt({ width, value, onSubmit, onCancel }: FolderPromptProps) {
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" width={width}>
      <Panel title="download folder" width={width} focused height={2}>
        <Box>
          <Text color={COLOR.accent}>{`${ICON.pointer} `}</Text>
          <Box flexGrow={1} minWidth={0}>
            <TextField
              defaultValue={value}
              placeholder="~/Downloads/windskye"
              onSubmit={onSubmit}
            />
          </Box>
        </Box>
      </Panel>
      <Box marginTop={1}>
        <Text color={COLOR.alt}>↵</Text>
        <Text color={COLOR.dim}> save</Text>
        <Text color={COLOR.dim}>{`     ${ICON.dot}     `}</Text>
        <Text color={COLOR.alt}>esc</Text>
        <Text color={COLOR.dim}> cancel</Text>
      </Box>
    </Box>
  );
}
