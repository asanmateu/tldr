import { Box, Text } from "ink";
import { useTheme } from "../lib/ThemeContext.js";

interface ErrorViewProps {
  message: string;
  hint?: string | undefined;
}

export function ErrorView({ message, hint }: ErrorViewProps) {
  const theme = useTheme();

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={theme.error} bold>
        Error: {message}
      </Text>
      {hint && (
        <Text color={theme.warning} dimColor>
          {hint}
        </Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>[Enter] try again · [q] quit</Text>
      </Box>
    </Box>
  );
}
