import { useState, useRef, useEffect } from "react";
import { Box, Text, useInput, useStdin } from "ink";
import { Logo } from "../components/Logo";
import { SearchBar } from "../components/SearchBar";
import { LOGO_WIDTH } from "../logo";
import { useStore } from "../store";
import { sourcesByGroup } from "../../sources/registry";
import { COLOR, ICON, lerpHex } from "../theme";

const CATEGORIES = sourcesByGroup()
  .map((g) => g.group.toLowerCase())
  .join(`  ${ICON.dot}  `);

function BreathingFooter() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 50);
    timer.unref?.();
    return () => clearInterval(timer);
  }, []);

  const breath = Math.sin(now * 0.0015) * 0.5 + 0.5;
  const breathColor = lerpHex(COLOR.dim, COLOR.accent, breath * 0.8);

  return (
    <Text>
      <Text color="white">↵</Text>
      <Text color={breathColor}> search</Text>
      <Text color="white">{`  ${ICON.dot}  `}</Text>
      <Text color={breathColor}>empty </Text>
      <Text color="white">↵</Text>
      <Text color={breathColor}> browse</Text>
      <Text color="white">{`  ${ICON.dot}  `}</Text>
      <Text color="white">esc</Text>
      <Text color={breathColor}> quit</Text>
    </Text>
  );
}

export function Splash() {
  const { submitQuery, quitAll, cols, rows, config } = useStore();
  const { isRawModeSupported } = useStdin();
  const [exitPrompt, setExitPrompt] = useState(false);
  const exitTimer = useRef<NodeJS.Timeout | null>(null);


  useInput(
    (input, key) => {
      if (key.escape) {
        quitAll();
        return;
      }
      if (key.ctrl && input === "c") {
        if (exitPrompt) {
          quitAll();
        } else {
          setExitPrompt(true);
          if (exitTimer.current) clearTimeout(exitTimer.current);
          exitTimer.current = setTimeout(() => {
            setExitPrompt(false);
            exitTimer.current = null;
          }, 1000);
        }
        return;
      }
      if (exitPrompt) {
        setExitPrompt(false);
        if (exitTimer.current) {
          clearTimeout(exitTimer.current);
          exitTimer.current = null;
        }
      }
    },
    { isActive: isRawModeSupported },
  );

  const showLogo = cols >= LOGO_WIDTH + 2;
  const barWidth = Math.max(24, Math.min(cols - 6, 62));



  return (
    <Box
      height={Math.max(1, rows - 1)}
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
    >
      {showLogo ? (
        <Logo pauseOnInput />
      ) : (
        <Text bold color={COLOR.accent}>
          Windskye
        </Text>
      )}


      <Box marginTop={1} width={barWidth}>
        <SearchBar
          width={barWidth}
          value=""
          editing
          placeholder="Search or paste a magnet link…"
          onSubmit={submitQuery}
        />
      </Box>
      <Box marginTop={1}>
        <BreathingFooter />
      </Box>
      <Box height={1} marginTop={1}>
        {exitPrompt ? (
          <Text color={COLOR.accent} bold>
            Press ctrl + c again to exit.
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
