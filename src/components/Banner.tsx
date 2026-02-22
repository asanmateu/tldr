import { Box, Text } from "ink";
import pkg from "../../package.json";
import { useTheme } from "../lib/ThemeContext.js";
import type { UpdateCheckResult } from "../lib/updateCheck.js";

const version = pkg.version;

interface BannerProps {
  updateInfo?: UpdateCheckResult | null;
}

export function Banner({ updateInfo }: BannerProps) {
  const theme = useTheme();

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color={theme.brandAccent}>{"◆  "}</Text>
        <Text color={theme.brand} bold>
          {"tl;dr"}
        </Text>
        <Text dimColor>
          {`  v${version}`}
          {updateInfo ? ` → ${updateInfo.latestVersion} available` : ""}
        </Text>
      </Box>
      <Text dimColor>{"   summarize anything."}</Text>
    </Box>
  );
}
