import { useState } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store";
import { Panel } from "./Panel";
import { TextField } from "./TextField";
import { COLOR, ICON, AVAILABLE_THEMES } from "../theme";
import { wrapStep } from "../move";

const MARK = 2;

export function Settings() {
  const { config, setConfig, region, contentWidth, listRows } = useStore();
  const focused = region === "content";
  
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState(false);
  const totalFields = 6;

  useInput(
    (input, key) => {
      if (editing) return;
      if (key.upArrow || input === "k") setCursor(wrapStep(cursor, -1, totalFields));
      else if (key.downArrow || input === "j") setCursor(wrapStep(cursor, 1, totalFields));
      else if (key.return || input === "e") {
        if (cursor === 4) { // Theme toggling
          const currentIndex = AVAILABLE_THEMES.indexOf(config.theme);
          const nextTheme = AVAILABLE_THEMES[wrapStep(currentIndex, 1, AVAILABLE_THEMES.length)] || "default";
          setConfig({ ...config, theme: nextTheme });
        } else if (cursor === 5) { // Notifications toggling
          setConfig({ ...config, notifications: !config.notifications });
        } else {
          setEditing(true);
        }
      }
    },
    { isActive: focused && !editing },
  );

  const panelH = Math.max(5, listRows - 1);
  const innerW = contentWidth - 4;
  const labelW = 20;

  const handleEdit = (field: keyof typeof config, value: string) => {
    setEditing(false);
    let nextConfig = { ...config };
    if (field === "maxConns" || field === "downloadLimit" || field === "uploadLimit") {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        (nextConfig as any)[field] = parsed;
      }
    } else {
      (nextConfig as any)[field] = value;
    }
    setConfig(nextConfig);
  };

  const cancelEdit = () => setEditing(false);

  const renderRow = (
    idx: number,
    label: string,
    value: string,
    field: keyof typeof config,
    isText = true
  ) => {
    const here = cursor === idx && focused;
    const isEditing = editing && cursor === idx;
    
    return (
      <Box key={idx}>
        <Box width={MARK} flexShrink={0}>
          <Text color={COLOR.accent} bold>
            {here ? ICON.pointer : ""}
          </Text>
        </Box>
        <Box width={labelW} flexShrink={0}>
          <Text color={here ? COLOR.accent : COLOR.dim} bold={here}>
            {label}
          </Text>
        </Box>
        <Box flexGrow={1}>
          {isEditing && isText ? (
            <TextField
              defaultValue={value}
              onSubmit={(v) => handleEdit(field, v)}
              onExitDown={cancelEdit}
              onExitLeft={cancelEdit}
            />
          ) : (
            <Text color={here ? COLOR.text : COLOR.dim}>
              {value}
              {here && !isEditing && isText ? <Text color={COLOR.dim}>  (Enter to edit)</Text> : ""}
              {here && !isText ? <Text color={COLOR.dim}>  (Enter to toggle)</Text> : ""}
            </Text>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Panel title="settings" width={contentWidth} focused={focused} height={panelH}>
      {renderRow(0, "Download Directory", config.downloadDir, "downloadDir")}
      {renderRow(1, "Max Connections", String(config.maxConns), "maxConns")}
      {renderRow(2, "Download Limit", String(config.downloadLimit), "downloadLimit")}
      {renderRow(3, "Upload Limit", String(config.uploadLimit), "uploadLimit")}
      {renderRow(4, "Theme", config.theme, "theme", false)}
      {renderRow(5, "Desktop Notifications", config.notifications ? "Enabled" : "Disabled", "notifications", false)}
      
      <Box marginTop={2} paddingLeft={MARK}>
        <Text color={COLOR.dim}>
          Speed limits are in bytes/sec (0 for unlimited). Changes take effect on restart.
        </Text>
      </Box>
    </Panel>
  );
}
