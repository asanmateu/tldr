import { Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";
import type { UpdateCheckResult } from "../lib/updateCheck.js";

interface UpdateNoticeProps {
  update: UpdateCheckResult;
}

export function UpdateNotice({ update }: UpdateNoticeProps) {
  const theme = useTheme();

  return (
    <Text dimColor>
      {"  Update available: "}
      <Text color={theme.warning}>{update.currentVersion}</Text>
      {" → "}
      <Text color={theme.success}>{update.latestVersion}</Text>
      {"  ("}
      {update.updateCommand}
      {")"}
    </Text>
  );
}
