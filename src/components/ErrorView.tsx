import { Box, Text } from "ink";

interface ErrorViewProps {
  message: string;
  hint?: string | undefined;
}

export function ErrorView({ message, hint }: ErrorViewProps) {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="red" bold>
        Error: {message}
      </Text>
      {hint && (
        <Text color="yellow" dimColor>
          {hint}
        </Text>
      )}
      <Box marginTop={1}>
        <Text dimColor>[Enter] try again · [q] quit</Text>
      </Box>
    </Box>
  );
}
