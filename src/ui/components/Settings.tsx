import { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { useStore } from "../store";
import { Panel } from "./Panel";
import { TextField } from "./TextField";
import { COLOR, ICON, AVAILABLE_THEMES } from "../theme";
import { wrapStep } from "../move";

const MARK = 2;

export function Settings() {
  const { config, setConfig, region, contentWidth, listRows, setCaptureMode } = useStore();
  const focused = region === "content";
  
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState(false);
  const totalFields = 8;

  const [pendingTheme, setPendingTheme] = useState(config.theme);

  useEffect(() => {
    if (cursor !== 4) setPendingTheme(config.theme);
  }, [cursor, config.theme]);

  useEffect(() => {
    if (focused && cursor === 4 && !editing) {
      setCaptureMode("text"); // prevent App from stealing left/right arrows for region switching
      return () => setCaptureMode("none");
    }
  }, [focused, cursor, editing, setCaptureMode]);

  useInput(
    (input, key) => {


      if (editing) return;
      if (key.escape) {
        if (cursor === 4) setPendingTheme(config.theme);
        setCursor(0);
        return;
      }
      if (key.upArrow || input === "k") setCursor(wrapStep(cursor, -1, totalFields));
      else if (key.downArrow || input === "j") setCursor(wrapStep(cursor, 1, totalFields));
      else if (cursor === 4 && (key.leftArrow || input === "h")) {
        const currentIndex = AVAILABLE_THEMES.indexOf(pendingTheme);
        setPendingTheme(AVAILABLE_THEMES[wrapStep(currentIndex, -1, AVAILABLE_THEMES.length)] || "default");
      }
      else if (cursor === 4 && (key.rightArrow || input === "l")) {
        const currentIndex = AVAILABLE_THEMES.indexOf(pendingTheme);
        setPendingTheme(AVAILABLE_THEMES[wrapStep(currentIndex, 1, AVAILABLE_THEMES.length)] || "default");
      }
      else if (key.return || input === "e") {
        if (cursor === 4) { // Theme toggling
          setConfig({ ...config, theme: pendingTheme });
        } else if (cursor === 5) { // Notifications toggling
          setConfig({ ...config, notifications: !config.notifications });
        } else if (cursor === 6) { // Blinker toggling
          setConfig({ ...config, enableBlinker: !config.enableBlinker });
        } else if (cursor === 7) { // Gradient toggling
          const options = ["original", "dark", "vibrant"] as const;
          const currentIndex = options.indexOf(config.blinkerGradient);
          const nextGradient = options[wrapStep(currentIndex, 1, options.length)] || "vibrant";
          setConfig({ ...config, blinkerGradient: nextGradient });
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
    isText = true,
    customHint?: string
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
              {here && !isEditing && isText && !customHint ? <Text color={COLOR.dim}>  (Enter to edit)</Text> : ""}
              {here && !isText && !customHint ? <Text color={COLOR.dim}>  (Enter to toggle)</Text> : ""}
              {here && customHint ? <Text color={COLOR.dim}>  ({customHint})</Text> : ""}
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
      {renderRow(4, "Theme", cursor === 4 ? pendingTheme : config.theme, "theme", false, "◄/► to switch, Enter to apply")}
      {renderRow(5, "Desktop Notifications", config.notifications ? "Enabled" : "Disabled", "notifications", false)}
      {renderRow(6, "Logo Blinker", config.enableBlinker ? "Enabled" : "Disabled", "enableBlinker", false)}
      {renderRow(7, "Blinker Gradient", config.blinkerGradient, "blinkerGradient", false)}
      
      <Box marginTop={2} paddingLeft={MARK}>
        <Text color={COLOR.dim}>
          Speed limits are in bytes/sec (0 for unlimited). Changes take effect on restart.
        </Text>
      </Box>
    </Panel>
  );
}
