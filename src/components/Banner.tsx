import { Box, Text } from "ink";
import pkg from "../../package.json";
import { useTheme } from "../lib/ThemeContext.js";

const version = pkg.version;

export function Banner() {
  const theme = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={theme.brandAccent}>{"»  "}</Text>
        <Text color={theme.brand} bold>
          {"tl;dr"}
        </Text>
        <Text dimColor>{`  v${version}`}</Text>
      </Box>
      <Text dimColor>{"   summarize anything."}</Text>
    </Box>
  );
}
