import { createRequire } from "node:module";
import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

export function Banner() {
  const theme = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.brandBorder}>{"╭──────────────────────────────────╮"}</Text>
      <Box>
        <Text color={theme.brandBorder}>{"│"}</Text>
        <Text color={theme.brandAccent}>{" ✦ "}</Text>
        <Text color={theme.brand} bold>
          {"tl;dr"}
        </Text>
        <Text dimColor>{`v${version}`.padStart(25, " ")} </Text>
        <Text color={theme.brandBorder}>{"│"}</Text>
      </Box>
      <Text color={theme.brandBorder}>{"╰──────────────────────────────────╯"}</Text>
      <Text dimColor>{"  less noise, more clarity."}</Text>
    </Box>
  );
}
